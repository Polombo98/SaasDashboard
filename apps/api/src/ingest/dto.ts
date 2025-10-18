import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

// Event Types
export const EventTypes = z.enum([
  'REVENUE',
  'ACTIVE',
  'SUBSCRIPTION_START',
  'SUBSCRIPTION_CANCEL',
  'SIGNUP',
]);

// Zod Schemas for Validation
export const RevenueEventSchema = z.object({
  type: z.literal('REVENUE'),
  value: z.number().positive(),
  occurredAt: z.coerce.date(),
  userId: z.string().min(1).optional(),
  eventId: z.string().uuid().optional(),
});

export const RequiresUserEventSchema = z.object({
  type: z.enum(['ACTIVE', 'SUBSCRIPTION_START', 'SUBSCRIPTION_CANCEL']),
  occurredAt: z.coerce.date(),
  userId: z.string().min(1),
  value: z.number().optional(),
  eventId: z.string().uuid().optional(),
});

export const SignupEventSchema = z.object({
  type: z.literal('SIGNUP'),
  occurredAt: z.coerce.date(),
  userId: z.string().min(1),
  value: z.number().optional(),
  eventId: z.string().uuid().optional(),
});

export const EventSchema = z.union([
  RevenueEventSchema,
  RequiresUserEventSchema,
  SignupEventSchema,
]);

export const BatchSchema = z.array(EventSchema).min(1).max(500);

export type IngestEvent = z.infer<typeof EventSchema>;
export type IngestBatch = z.infer<typeof BatchSchema>;

// Swagger DTOs
export class RevenueEventDto {
  @ApiProperty({
    example: 'REVENUE',
    description: 'Event type for revenue tracking',
    enum: ['REVENUE'],
  })
  type!: 'REVENUE';

  @ApiProperty({
    example: 99.99,
    description: 'Revenue amount (must be positive)',
  })
  value!: number;

  @ApiProperty({
    example: '2025-10-18T10:30:00Z',
    description: 'When the event occurred (ISO 8601)',
  })
  occurredAt!: string;

  @ApiProperty({
    example: 'user_123',
    description: 'Optional user ID associated with the revenue',
    required: false,
  })
  userId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Optional unique event ID for idempotency (UUID)',
    required: false,
  })
  eventId?: string;
}

export class UserActivityEventDto {
  @ApiProperty({
    example: 'ACTIVE',
    description: 'Event type for user activity or subscription events',
    enum: ['ACTIVE', 'SUBSCRIPTION_START', 'SUBSCRIPTION_CANCEL'],
  })
  type!: 'ACTIVE' | 'SUBSCRIPTION_START' | 'SUBSCRIPTION_CANCEL';

  @ApiProperty({
    example: '2025-10-18T10:30:00Z',
    description: 'When the event occurred (ISO 8601)',
  })
  occurredAt!: string;

  @ApiProperty({
    example: 'user_123',
    description: 'User ID associated with the event',
  })
  userId!: string;

  @ApiProperty({
    example: 29.99,
    description: 'Optional numeric value associated with the event',
    required: false,
  })
  value?: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Optional unique event ID for idempotency (UUID)',
    required: false,
  })
  eventId?: string;
}

export class SignupEventDto {
  @ApiProperty({
    example: 'SIGNUP',
    description: 'Event type for user signups',
    enum: ['SIGNUP'],
  })
  type!: 'SIGNUP';

  @ApiProperty({
    example: '2025-10-18T10:30:00Z',
    description: 'When the signup occurred (ISO 8601)',
  })
  occurredAt!: string;

  @ApiProperty({
    example: 'user_123',
    description: 'User ID for cohort tracking',
  })
  userId!: string;

  @ApiProperty({
    example: 0,
    description: 'Optional value associated with signup',
    required: false,
  })
  value?: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Optional unique event ID for idempotency (UUID)',
    required: false,
  })
  eventId?: string;
}

export class IngestBatchRequestDto {
  @ApiProperty({
    description: 'Array of metric events (1-500 events per batch)',
    type: 'array',
    items: {
      oneOf: [
        { $ref: '#/components/schemas/RevenueEventDto' },
        { $ref: '#/components/schemas/UserActivityEventDto' },
        { $ref: '#/components/schemas/SignupEventDto' },
      ],
    },
    minItems: 1,
    maxItems: 500,
    example: [
      {
        type: 'REVENUE',
        value: 99.99,
        occurredAt: '2025-10-18T10:30:00Z',
        userId: 'user_123',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
      },
      {
        type: 'ACTIVE',
        userId: 'user_456',
        occurredAt: '2025-10-18T11:00:00Z',
      },
    ],
  })
  events!: (RevenueEventDto | UserActivityEventDto | SignupEventDto)[];
}

export class IngestResponseDto {
  @ApiProperty({
    example: 'cuid123',
    description: 'Project ID that received the events',
  })
  projectId!: string;

  @ApiProperty({
    example: 10,
    description: 'Number of events received in the batch',
  })
  received!: number;

  @ApiProperty({
    example: 8,
    description: 'Number of events successfully inserted (duplicates skipped)',
  })
  inserted!: number;
}

export class ValidationErrorDto {
  @ApiProperty({
    example: 'Validation failed',
    description: 'Error message',
  })
  message!: string;

  @ApiProperty({
    example: [
      { path: '0.type', message: 'Invalid enum value' },
      { path: '1.value', message: 'Number must be greater than 0' },
    ],
    description: 'Detailed validation issues',
  })
  issues!: { path: string; message: string }[];
}
