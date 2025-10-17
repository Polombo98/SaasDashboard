import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { type User } from '@prisma/client';

@Controller('v1/teams/:teamId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private svc: ProjectsService) {}

  @Get()
  list(@Param('teamId') teamId: string, @CurrentUser() user: User) {
    return this.svc.list(teamId, user.id);
  }

  @Post()
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: User,
    @Body() body: { name: string },
  ) {
    return this.svc.create(teamId, user.id, body.name);
  }

  @Post(':projectId/rotate-key')
  rotate(
    @Param('teamId') teamId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.svc.rotateKey(teamId, user.id, projectId);
  }
}
