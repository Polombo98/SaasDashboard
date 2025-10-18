import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiExtraModels,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { JwtPayload } from '../types/JWT';
import {
  CreateProjectDto,
  CreateProjectRequestDto,
  ProjectResponseDto,
  ProjectListResponseDto,
} from './dto';
import type { CreateProjectInput } from './dto';

@ApiTags('Projects')
@ApiExtraModels(
  CreateProjectRequestDto,
  ProjectResponseDto,
  ProjectListResponseDto,
)
@ApiBearerAuth()
@Controller('v1/teams/:teamId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private svc: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary: 'List team projects',
    description:
      'Returns all projects for the specified team. Requires user to be a MEMBER or higher. Requires valid JWT access token.',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    example: 'cuid123',
  })
  @ApiResponse({
    status: 200,
    description: 'List of projects',
    type: [ProjectListResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not a member of the team',
  })
  list(@Param('teamId') teamId: string, @CurrentUser() user: JwtPayload) {
    return this.svc.list(teamId, user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new project',
    description:
      'Creates a new project within the specified team. Requires user to be an ADMIN or OWNER. Generates a unique API key. Requires valid JWT access token.',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    example: 'cuid123',
  })
  @ApiBody({ type: CreateProjectRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Project successfully created',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user must be ADMIN or OWNER',
  })
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateProjectDto)) body: CreateProjectInput,
  ) {
    return this.svc.create(teamId, user.sub, body.name);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':projectId/rotate-key')
  @ApiOperation({
    summary: 'Rotate project API key',
    description:
      'Generates a new API key for the project. The old key will be invalidated. Requires user to be an ADMIN or OWNER. Requires valid JWT access token.',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team ID',
    example: 'cuid123',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: 'cuid123',
  })
  @ApiResponse({
    status: 200,
    description: 'API key successfully rotated',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user must be ADMIN or OWNER',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  rotate(
    @Param('teamId') teamId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.rotateKey(teamId, user.sub, projectId);
  }
}
