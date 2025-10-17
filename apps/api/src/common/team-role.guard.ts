import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { roleRank, type Role } from './roles';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
}

interface TeamParams {
  teamId?: string;
  [key: string]: string | undefined;
}

interface TeamBody {
  teamId?: string;
  [key: string]: unknown;
}

interface RequestWithUser extends Request<TeamParams, unknown, TeamBody> {
  user: JwtPayload;
}

@Injectable()
export class TeamRoleGuard implements CanActivate {
  private readonly prisma: PrismaService;
  private readonly minRole: Role;

  constructor(prisma: PrismaService, minRole: Role = 'MEMBER') {
    this.prisma = prisma;
    this.minRole = minRole;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;
    const teamId: string | undefined = req.params.teamId || req.body.teamId;
    if (!teamId) throw new ForbiddenException('teamId is required');

    const membership = await this.prisma.member.findFirst({
      where: { teamId, userId: user.sub },
      select: { role: true },
    });
    if (!membership) throw new ForbiddenException('Not a team member');

    if (roleRank[membership.role] < roleRank[this.minRole]) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
