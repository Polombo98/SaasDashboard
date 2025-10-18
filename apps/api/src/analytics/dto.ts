import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

// Zod Schemas
export const IntervalEnum = z.enum(['day', 'week', 'month']);

export const AnalyticsQueryDto = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  interval: IntervalEnum.optional().default('day'),
});

export type AnalyticsQuery = z.infer<typeof AnalyticsQueryDto>;
export type Interval = z.infer<typeof IntervalEnum>;

// Swagger DTOs for Query Parameters
export class AnalyticsQueryParamsDto {
  @ApiProperty({
    example: '2025-10-01',
    description:
      'Start date (ISO 8601 or YYYY-MM-DD). Defaults to 30 days ago.',
    required: false,
    type: String,
  })
  from?: string;

  @ApiProperty({
    example: '2025-10-18',
    description: 'End date (ISO 8601 or YYYY-MM-DD). Defaults to today.',
    required: false,
    type: String,
  })
  to?: string;

  @ApiProperty({
    example: 'day',
    description: 'Time interval for data aggregation',
    enum: ['day', 'week', 'month'],
    default: 'day',
    required: false,
  })
  interval?: 'day' | 'week' | 'month';
}

// Response DTOs
export class MRRResponseDto {
  @ApiProperty({
    example: ['2025-10-01', '2025-10-02', '2025-10-03'],
    description: 'Date labels for revenue data points',
    type: [String],
  })
  labels!: string[];

  @ApiProperty({
    example: [1250.5, 1375.75, 1500.0],
    description:
      'Monthly Recurring Revenue values (sum of REVENUE events per interval)',
    type: [Number],
  })
  series!: number[];
}

export class ActiveUsersResponseDto {
  @ApiProperty({
    example: ['2025-10-01', '2025-10-02', '2025-10-03'],
    description: 'Date labels for active user data points',
    type: [String],
  })
  labels!: string[];

  @ApiProperty({
    example: [120, 145, 160],
    description: 'Count of distinct active users per interval',
    type: [Number],
  })
  series!: number[];
}

export class ChurnResponseDto {
  @ApiProperty({
    example: ['2025-10-01', '2025-10-02', '2025-10-03'],
    description: 'Date labels for churn rate data points',
    type: [String],
  })
  labels!: string[];

  @ApiProperty({
    example: [5.2, 3.8, 4.5],
    description: 'Churn rate percentage (cancels/starts * 100) per interval',
    type: [Number],
  })
  series!: number[];
}
