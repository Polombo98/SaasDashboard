import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async list(teamId: string, userId: string) {
    await this.ensureMember(teamId, userId, 'MEMBER');
    return this.prisma.project.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(teamId: string, userId: string, name: string) {
    await this.ensureMember(teamId, userId, 'ADMIN'); // only ADMIN+ can create
    return this.prisma.project.create({
      data: { teamId, name, apiKey: this.newKey() },
      select: { id: true, name: true, apiKey: true, createdAt: true },
    });
  }

  async rotateKey(teamId: string, userId: string, projectId: string) {
    await this.ensureMember(teamId, userId, 'ADMIN');
    return this.prisma.project.update({
      where: { id: projectId },
      data: { apiKey: this.newKey() },
      select: { id: true, name: true, apiKey: true, createdAt: true },
    });
  }

  private newKey() {
    return `proj_${randomUUID().replace(/-/g, '')}`;
  }

  private async ensureMember(
    teamId: string,
    userId: string,
    minRole: 'MEMBER' | 'ADMIN' | 'OWNER',
  ) {
    const m = await this.prisma.member.findFirst({ where: { teamId, userId } });
    const order = { MEMBER: 1, ADMIN: 2, OWNER: 3 } as const;
    if (!m || order[m.role] < order[minRole])
      throw new ForbiddenException('Insufficient role or not a member');
  }
}
