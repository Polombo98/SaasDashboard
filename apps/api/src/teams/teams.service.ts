import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async createTeam(ownerUserId: string, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { name } });
      await tx.member.create({
        data: { teamId: team.id, userId: ownerUserId, role: 'OWNER' },
      });
      return team;
    });
  }

  async getUserTeams(userId: string) {
    const memberships = await this.prisma.member.findMany({
      where: { userId },
      include: { team: true },
    });
    return memberships.map((m) => m.team);
  }

  async addMember(
    requestorId: string,
    teamId: string,
    targetUserId: string,
    role: 'ADMIN' | 'MEMBER',
  ) {
    const reqMember = await this.prisma.member.findFirst({
      where: { teamId, userId: requestorId },
    });
    if (!reqMember || reqMember.role !== 'OWNER')
      throw new ForbiddenException('Only OWNER can invite');
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('User not found');

    return this.prisma.member.upsert({
      where: { userId_teamId: { userId: targetUserId, teamId } },
      create: { userId: targetUserId, teamId, role },
      update: { role },
    });
  }
}
