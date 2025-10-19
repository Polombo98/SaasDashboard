import { PrismaClient, Role, MetricType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Quick helpers
 */
function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function iso(date: Date): string {
  return date.toISOString();
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function subDays(date: Date, n: number): Date {
  return addDays(date, -n);
}

async function chunkedCreateMany<T>(
  modelPrisma: {
    createMany: (args: {
      data: T[];
      skipDuplicates?: boolean;
    }) => Promise<{ count: number }>;
  },
  rows: T[],
  batchSize = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await modelPrisma.createMany({ data: chunk, skipDuplicates: true });
    console.log(
      `  created ${Math.min(i + batchSize, rows.length)} / ${rows.length}`,
    );
  }
}

interface SubscriptionInfo {
  start: Date;
  cancel: Date | null;
  monthly: number;
  billingDay: number;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset'); // use --reset to wipe existing demo tables
  const days = Number(
    args.find((a) => a.startsWith('--days='))?.split('=')[1] || 90,
  );
  const usersPerProject = Number(
    args.find((a) => a.startsWith('--users='))?.split('=')[1] || 120,
  );
  const projectsCount = Number(
    args.find((a) => a.startsWith('--projects='))?.split('=')[1] || 1,
  );

  console.log(
    `Seed starting — days=${days} usersPerProject=${usersPerProject} reset=${reset} projects=${projectsCount}`,
  );

  if (reset) {
    console.log(
      'Resetting MetricEvent / Project / Member / Team / User demo rows (careful!)',
    );
    // cautious deletions: only delete rows that look like demo ones
    await prisma.metricEvent.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.team.deleteMany({});
    // only delete demo users created by this script (emails @demo.local)
    await prisma.user.deleteMany({
      where: { email: { contains: '@demo.local' } },
    });
    console.log('Reset done.');
  }

  // 1) Create owner user
  const ownerEmail = 'owner@demo.local';
  let owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    const pwHash = await bcrypt.hash('Password123', 10);
    owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        password: pwHash,
        name: 'Demo Owner',
        emailVerified: true, // Skip verification for demo user
      },
    });
    console.log('Created owner user:', ownerEmail);
  } else {
    console.log('Owner already exists:', ownerEmail);
  }

  // 2) Create team
  const teamName = 'Demo Team';
  let team = await prisma.team.findFirst({ where: { name: teamName } });
  if (!team) {
    team = await prisma.team.create({ data: { name: teamName } });
    console.log('Created team:', teamName);
    await prisma.member.create({
      data: { teamId: team.id, userId: owner.id, role: Role.OWNER },
    });
  } else {
    console.log('Team exists:', teamName);
    const ownerMember = await prisma.member.findFirst({
      where: { teamId: team.id, userId: owner.id },
    });
    if (!ownerMember) {
      await prisma.member.create({
        data: { teamId: team.id, userId: owner.id, role: Role.OWNER },
      });
    }
  }

  // 3) Create projects
  const projects: { id: string; name: string }[] = [];
  for (let p = 0; p < projectsCount; p++) {
    const name = projectsCount === 1 ? 'Demo Project' : `Demo Project ${p + 1}`;
    const existing = await prisma.project.findFirst({
      where: { name, teamId: team.id },
    });
    if (existing) {
      projects.push(existing);
      console.log('Found project:', existing.name);
      continue;
    }
    const apiKey = `proj_${Math.random().toString(36).slice(2, 18)}`;
    const project = await prisma.project.create({
      data: { name, teamId: team.id, apiKey },
    });
    projects.push(project);
    console.log('Created project:', name, apiKey);
  }

  // 4) Create demo users (email @demo.local)
  const existingDemoCount = await prisma.user.count({
    where: { email: { contains: '@demo.local' } },
  });
  const toCreate = Math.max(
    0,
    usersPerProject * projects.length - existingDemoCount,
  );
  console.log(
    `Creating ${toCreate} demo users... (existing demo users: ${existingDemoCount})`,
  );
  if (toCreate > 0) {
    const pwHash = await bcrypt.hash('Password123', 10);
    const rows: {
      email: string;
      password: string;
      name: string;
      emailVerified: boolean;
    }[] = [];
    for (let i = 0; i < toCreate; i++) {
      const email = `u${Math.random().toString(36).slice(2, 9)}@demo.local`;
      rows.push({
        email,
        password: pwHash,
        name: `Demo User ${email.split('@')[0]}`,
        emailVerified: true, // Skip verification for demo users
      });
    }
    await chunkedCreateMany(prisma.user, rows, 500);
  }
  const allDemoUsers = await prisma.user.findMany({
    where: { email: { contains: '@demo.local' } },
    take: usersPerProject * projects.length,
  });
  console.log('Total demo users available:', allDemoUsers.length);

  // 5) Attach users to team as MEMBER (if not already)
  console.log('Ensuring team membership for demo users...');
  const membersToCreate: { teamId: string; userId: string; role: Role }[] = [];
  for (let i = 0; i < allDemoUsers.length; i++) {
    const u = allDemoUsers[i];
    const exists = await prisma.member.findFirst({
      where: { teamId: team.id, userId: u.id },
    });
    if (!exists)
      membersToCreate.push({
        teamId: team.id,
        userId: u.id,
        role: Role.MEMBER,
      });
  }
  if (membersToCreate.length) {
    await chunkedCreateMany(prisma.member, membersToCreate, 500);
  }
  console.log('Membership ensured.');

  // 6) Generate events per project
  const now = new Date();
  const startDate = subDays(now, days - 1); // inclusive
  console.log(
    `Generating events from ${iso(startDate)} to ${iso(now)} (${days} days)`,
  );

  // Helper to generate events list for a project
  async function generateEventsForProject(
    project: { id: string; name: string },
    users: { id: string }[],
  ): Promise<void> {
    // determine subscription behavior: pick ~35% users as paying monthly with varying tier
    const subs = new Map<string, SubscriptionInfo>();
    const subscriberCandidates = [...users];
    // shuffle
    for (let i = subscriberCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [subscriberCandidates[i], subscriberCandidates[j]] = [
        subscriberCandidates[j],
        subscriberCandidates[i],
      ];
    }
    const subscriberCount = Math.floor(users.length * 0.35);
    for (let i = 0; i < subscriberCount; i++) {
      const u = subscriberCandidates[i];
      const startOffset = randBetween(0, Math.max(0, Math.floor(days * 0.7))); // start within early range
      const sDate = addDays(startDate, startOffset);
      // possible cancel
      const willCancel = Math.random() < 0.12; // 12% eventually cancel in period
      let cancelDate: Date | null = null;
      if (willCancel) {
        const cancelOffset = randBetween(Math.floor(days * 0.1), days - 1);
        cancelDate = addDays(startDate, cancelOffset);
      }
      const monthly = sample([8, 12, 29, 49]); // tiers
      const billingDay = randBetween(1, 28);
      subs.set(u.id, { start: sDate, cancel: cancelDate, monthly, billingDay });
    }

    // build events in batches per day
    const rows: {
      projectId: string;
      type: MetricType;
      value: number | null;
      userId: string | null;
      eventId: string | null;
      occurredAt: Date;
    }[] = [];

    for (let d = 0; d < days; d++) {
      const day = addDays(startDate, d);
      // For each user, some chance of ACTIVE event
      for (const u of users) {
        // active probability: subscribers more active
        const isSub = subs.has(u.id);
        const activeProb = isSub ? 0.7 : 0.12;
        if (Math.random() < activeProb) {
          rows.push({
            projectId: project.id,
            type: MetricType.ACTIVE,
            value: null,
            userId: u.id,
            eventId: null,
            occurredAt: day,
          });
        }
      }

      // revenue events: for each subscriber whose billing day matches this day AND not canceled yet
      for (const [userId, sub] of subs.entries()) {
        // check subscription active on this day
        const started = sub.start <= day;
        const canceled = sub.cancel && sub.cancel <= day;
        if (!started || canceled) continue;

        // if this day is billing day of month
        const dayOfMonth = day.getUTCDate();
        if (dayOfMonth === sub.billingDay) {
          rows.push({
            projectId: project.id,
            type: MetricType.REVENUE,
            value: sub.monthly,
            userId,
            eventId: null,
            occurredAt: day,
          });
        }
        // add subscription_start event at start date
        if (iso(sub.start).slice(0, 10) === iso(day).slice(0, 10)) {
          rows.push({
            projectId: project.id,
            type: MetricType.SUBSCRIPTION_START,
            value: null,
            userId,
            eventId: null,
            occurredAt: day,
          });
        }
        // subscription_cancel
        if (
          sub.cancel &&
          iso(sub.cancel).slice(0, 10) === iso(day).slice(0, 10)
        ) {
          rows.push({
            projectId: project.id,
            type: MetricType.SUBSCRIPTION_CANCEL,
            value: null,
            userId,
            eventId: null,
            occurredAt: day,
          });
        }
      }
    }

    // Optionally, add some signup events for a fraction of users at random earlier dates
    const signupRows: typeof rows = [];
    const signupCount = Math.floor(users.length * 0.15);
    for (let i = 0; i < signupCount; i++) {
      const u = users[i];
      const signupOffset = randBetween(0, days - 1);
      signupRows.push({
        projectId: project.id,
        type: MetricType.SIGNUP,
        value: null,
        userId: u.id,
        eventId: null,
        occurredAt: addDays(startDate, signupOffset),
      });
    }

    const allRows = rows.concat(signupRows);
    console.log(
      `Prepared ${allRows.length} events for project ${project.name}. Inserting in batches...`,
    );

    await chunkedCreateMany(prisma.metricEvent, allRows, 1000);
    console.log(`Inserted events for ${project.name}`);
  }

  // Fetch demo users and split per project
  const demoUsersAll = await prisma.user.findMany({
    where: { email: { contains: '@demo.local' } },
  });
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    // assign a slice of users to this project
    const start = i * usersPerProject;
    const usersSlice = demoUsersAll.slice(start, start + usersPerProject);
    await generateEventsForProject(project, usersSlice);
  }

  console.log('Seeding completed. Closing prisma.');
  await prisma.$disconnect();
}

main()
  .then(() => {
    console.log('Seed script finished.');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Seed script error', e);
    try {
      await prisma.$disconnect();
    } catch {
      // ignore disconnect errors
    }
    process.exit(1);
  });
