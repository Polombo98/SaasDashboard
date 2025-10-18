import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Interval, AnalyticsQuery } from './dto';

function defaultRange({ from, to, interval }: AnalyticsQuery): {
  from: Date;
  to: Date;
  interval: Interval;
} {
  const now = new Date();
  const end = to ?? now;
  const start = from ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30 days
  return { from: start, to: end, interval };
}

function dateTrunc(interval: Interval) {
  // Postgres date_trunc grain
  if (interval === 'day') return 'day';
  if (interval === 'week') return 'week';
  return 'month';
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async mrr(projectId: string, userId: string, query: AnalyticsQuery) {
    await this.ensureProjectAccess(projectId, userId);
    const { from, to, interval } = defaultRange(query);
    const grain = dateTrunc(interval);

    // Sum REVENUE per bucket (occurredAt). If you want true MRR, you might compute from subscriptions,
    // but here we’ll use REVENUE events as monthly recurring revenue proxy.
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ bucket: Date; total: number }>
    >(
      `
      SELECT date_trunc($1, "occurredAt") AS bucket,
             COALESCE(SUM("value"), 0) AS total
      FROM "MetricEvent"
      WHERE "projectId" = $2
        AND "type" = 'REVENUE'
        AND "occurredAt" BETWEEN $3 AND $4
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      grain,
      projectId,
      from,
      to,
    );

    const { labels, series } = this.fillBuckets(
      rows,
      from,
      to,
      interval,
      0,
      (x) => Number(x.total),
    );
    return { labels, series };
  }

  async activeUsers(projectId: string, userId: string, query: AnalyticsQuery) {
    await this.ensureProjectAccess(projectId, userId);
    const { from, to, interval } = defaultRange(query);
    const grain = dateTrunc(interval);

    // Count distinct userId per bucket for ACTIVE events
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ bucket: Date; count: number }>
    >(
      `
      SELECT date_trunc($1, "occurredAt") AS bucket,
             COUNT(DISTINCT "userId") AS count
      FROM "MetricEvent"
      WHERE "projectId" = $2
        AND "type" = 'ACTIVE'
        AND "occurredAt" BETWEEN $3 AND $4
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      grain,
      projectId,
      from,
      to,
    );

    const { labels, series } = this.fillBuckets(
      rows,
      from,
      to,
      interval,
      0,
      (x) => Number(x.count),
    );
    return { labels, series };
  }

  async churn(projectId: string, userId: string, query: AnalyticsQuery) {
    await this.ensureProjectAccess(projectId, userId);
    const { from, to, interval } = defaultRange(query);
    const grain = dateTrunc(interval);

    // Approx churn rate = cancels / starts in the same bucket (avoid div/0)
    const cancels = await this.prisma.$queryRawUnsafe<
      Array<{ bucket: Date; c: number }>
    >(
      `
      SELECT date_trunc($1, "occurredAt") AS bucket,
             COUNT(*) AS c
      FROM "MetricEvent"
      WHERE "projectId" = $2
        AND "type" = 'SUBSCRIPTION_CANCEL'
        AND "occurredAt" BETWEEN $3 AND $4
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      grain,
      projectId,
      from,
      to,
    );

    const starts = await this.prisma.$queryRawUnsafe<
      Array<{ bucket: Date; s: number }>
    >(
      `
      SELECT date_trunc($1, "occurredAt") AS bucket,
             COUNT(*) AS s
      FROM "MetricEvent"
      WHERE "projectId" = $2
        AND "type" = 'SUBSCRIPTION_START'
        AND "occurredAt" BETWEEN $3 AND $4
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      grain,
      projectId,
      from,
      to,
    );

    // Normalize to the same buckets
    const { labels } = this.fillBuckets(cancels, from, to, interval, 0, (x) =>
      Number(x.c),
    );
    const cancelMap = new Map(labels.map((l) => [l, 0]));
    const startMap = new Map(labels.map((l) => [l, 0]));

    for (const row of cancels) {
      const key = this.toLabel(row.bucket);
      cancelMap.set(key, Number(row.c));
    }
    for (const row of starts) {
      const key = this.toLabel(row.bucket);
      startMap.set(key, Number(row.s));
    }

    const series = labels.map((l) => {
      const c = cancelMap.get(l) ?? 0;
      const s = startMap.get(l) ?? 0;
      if (s === 0) return 0;
      return +((c / s) * 100).toFixed(2); // % churn for the bucket
    });

    return { labels, series };
  }

  // ---- helpers ----

  /**
   * Verify user has access to the project by checking team membership
   */
  private async ensureProjectAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { teamId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const member = await this.prisma.member.findFirst({
      where: { teamId: project.teamId, userId },
    });

    if (!member) {
      throw new ForbiddenException(
        "Access denied - you are not a member of this project's team",
      );
    }
  }

  private toLabel(d: Date) {
    // ISO date (YYYY-MM-DD) — good for chart x-axis ticks
    return new Date(d).toISOString().slice(0, 10);
  }

  private addInterval(date: Date, interval: Interval) {
    const d = new Date(date);
    if (interval === 'day') d.setUTCDate(d.getUTCDate() + 1);
    else if (interval === 'week') d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCMonth(d.getUTCMonth() + 1);
    return d;
  }

  private floorToInterval(date: Date, interval: Interval) {
    const d = new Date(date);
    if (interval === 'day') d.setUTCHours(0, 0, 0, 0);
    else if (interval === 'week') {
      // Set to Monday 00:00 UTC
      const day = d.getUTCDay(); // 0..6 (Sun..Sat)
      const diff = (day + 6) % 7; // days since Monday
      d.setUTCDate(d.getUTCDate() - diff);
      d.setUTCHours(0, 0, 0, 0);
    } else {
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
    }
    return d;
  }

  private fillBuckets<T>(
    rows: Array<{ bucket: Date } & T>,
    from: Date,
    to: Date,
    interval: Interval,
    emptyValue: number,
    pick: (row: { bucket: Date } & T) => number,
  ) {
    const start = this.floorToInterval(from, interval);
    const end = this.floorToInterval(to, interval);
    const map = new Map<string, number>();

    for (const r of rows) {
      const key = this.toLabel(r.bucket);
      map.set(key, pick(r));
    }

    const labels: string[] = [];
    const series: number[] = [];
    for (let cur = start; cur <= end; cur = this.addInterval(cur, interval)) {
      const label = this.toLabel(cur);
      labels.push(label);
      series.push(map.get(label) ?? emptyValue);
    }
    return { labels, series };
  }
}
