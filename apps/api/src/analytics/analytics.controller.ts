import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../types/JWT';
import {
  AnalyticsQueryDto,
  AnalyticsQueryParamsDto,
  MRRResponseDto,
  ActiveUsersResponseDto,
  ChurnResponseDto,
} from './dto';

@ApiTags('Analytics')
@ApiExtraModels(
  AnalyticsQueryParamsDto,
  MRRResponseDto,
  ActiveUsersResponseDto,
  ChurnResponseDto,
)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/analytics/:projectId')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('mrr')
  @ApiOperation({
    summary: 'Get Monthly Recurring Revenue (MRR)',
    description:
      'Returns time-series data of revenue events aggregated by the specified interval. ' +
      "Requires user to be a member of the project's team. " +
      'Defaults to last 30 days if no date range specified.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: 'cuid123',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (ISO 8601 or YYYY-MM-DD)',
    example: '2025-10-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (ISO 8601 or YYYY-MM-DD)',
    example: '2025-10-18',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Time interval for aggregation',
    example: 'day',
  })
  @ApiResponse({
    status: 200,
    description: 'MRR time-series data',
    type: MRRResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - not a member of project's team",
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async mrr(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: AnalyticsQueryParamsDto,
  ) {
    const parsed = AnalyticsQueryDto.parse(query);
    return this.svc.mrr(projectId, user.sub, parsed);
  }

  @Get('active-users')
  @ApiOperation({
    summary: 'Get Active Users',
    description:
      'Returns time-series data of distinct active users aggregated by the specified interval. ' +
      "Requires user to be a member of the project's team. " +
      'Defaults to last 30 days if no date range specified.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: 'cuid123',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (ISO 8601 or YYYY-MM-DD)',
    example: '2025-10-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (ISO 8601 or YYYY-MM-DD)',
    example: '2025-10-18',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Time interval for aggregation',
    example: 'day',
  })
  @ApiResponse({
    status: 200,
    description: 'Active users time-series data',
    type: ActiveUsersResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - not a member of project's team",
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async activeUsers(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: AnalyticsQueryParamsDto,
  ) {
    const parsed = AnalyticsQueryDto.parse(query);
    return this.svc.activeUsers(projectId, user.sub, parsed);
  }

  @Get('churn')
  @ApiOperation({
    summary: 'Get Churn Rate',
    description:
      'Returns time-series data of churn rate (cancellations/starts * 100) aggregated by the specified interval. ' +
      "Requires user to be a member of the project's team. " +
      'Defaults to last 30 days if no date range specified.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: 'cuid123',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (ISO 8601 or YYYY-MM-DD)',
    example: '2025-10-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (ISO 8601 or YYYY-MM-DD)',
    example: '2025-10-18',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Time interval for aggregation',
    example: 'day',
  })
  @ApiResponse({
    status: 200,
    description: 'Churn rate time-series data',
    type: ChurnResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - not a member of project's team",
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async churn(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: AnalyticsQueryParamsDto,
  ) {
    const parsed = AnalyticsQueryDto.parse(query);
    return this.svc.churn(projectId, user.sub, parsed);
  }
}
