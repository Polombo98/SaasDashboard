import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiExtraModels,
  ApiParam,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { JwtPayload } from '../types/JWT';
import {
  CreateTeamDto,
  AddMemberDto,
  CreateTeamRequestDto,
  AddMemberRequestDto,
  TeamResponseDto,
  MemberResponseDto,
} from './dto';
import type { CreateTeamInput, AddMemberInput } from './dto';

@ApiTags('Teams')
@ApiExtraModels(
  CreateTeamRequestDto,
  AddMemberRequestDto,
  TeamResponseDto,
  MemberResponseDto,
)
@ApiBearerAuth()
@Controller('v1/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private svc: TeamsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new team',
    description:
      'Creates a new team with the authenticated user as the OWNER. Requires valid JWT access token.',
  })
  @ApiBody({ type: CreateTeamRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Team successfully created',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateTeamDto)) body: CreateTeamInput,
  ) {
    return this.svc.createTeam(user.sub, body.name);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Get my teams',
    description:
      'Returns all teams where the authenticated user is a member. Requires valid JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of teams',
    type: [TeamResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  myTeams(@CurrentUser() user: JwtPayload) {
    return this.svc.getUserTeams(user.sub);
  }

  @Post(':teamId/members')
  @ApiOperation({
    summary: 'Add a member to a team',
    description:
      'Adds a new member to the team with the specified role. Only team OWNER can add members. Requires valid JWT access token.',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    example: 'cuid123',
  })
  @ApiBody({ type: AddMemberRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Member successfully added',
    type: MemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only OWNER can add members',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  addMember(
    @CurrentUser() user: JwtPayload,
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(AddMemberDto)) body: AddMemberInput,
  ) {
    return this.svc.addMember(user.sub, teamId, body.userId, body.role);
  }
}
