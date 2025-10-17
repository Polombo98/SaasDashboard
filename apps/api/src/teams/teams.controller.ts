import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { type User } from '@prisma/client';

@Controller('v1/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private svc: TeamsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() body: { name: string }) {
    return this.svc.createTeam(user.id, body.name);
  }

  @Get('mine')
  myTeams(@CurrentUser() user: User) {
    return this.svc.getUserTeams(user.id);
  }

  @Post(':teamId/members')
  addMember(
    @CurrentUser() user: User,
    @Param('teamId') teamId: string,
    @Body() body: { userId: string; role: 'ADMIN' | 'MEMBER' },
  ) {
    // Only OWNER can add members
    return this.svc.addMember(user.id, teamId, body.userId, body.role);
  }
}
