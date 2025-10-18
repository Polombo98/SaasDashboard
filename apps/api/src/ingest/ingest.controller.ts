import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiExtraModels,
} from '@nestjs/swagger';
import { IngestService } from './ingest.service';
import {
  BatchSchema,
  IngestResponseDto,
  ValidationErrorDto,
  RevenueEventDto,
  UserActivityEventDto,
  SignupEventDto,
} from './dto';

@ApiTags('Ingest')
@ApiExtraModels(
  IngestResponseDto,
  ValidationErrorDto,
  RevenueEventDto,
  UserActivityEventDto,
  SignupEventDto,
)
@Controller('v1')
export class IngestController {
  constructor(private readonly svc: IngestService) {}

  @HttpCode(HttpStatus.OK)
  @Post('ingest')
  @ApiOperation({
    summary: 'Ingest metric events',
    description:
      'Accepts a batch of metric events (1-500 events) for analytics tracking. ' +
      'Supports REVENUE, ACTIVE, SUBSCRIPTION_START, SUBSCRIPTION_CANCEL, and SIGNUP events. ' +
      'Events with duplicate eventId are automatically skipped for idempotency. ' +
      'Requires project API key authentication.',
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Project API key for authentication',
    required: true,
    schema: { type: 'string', example: 'proj_1a2b3c4d5e6f7g8h9i0j' },
  })
  @ApiBody({
    description: 'Array of metric events (1-500 events per batch)',
    schema: {
      type: 'array',
      minItems: 1,
      maxItems: 500,
      items: {
        oneOf: [
          {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['REVENUE'] },
              value: { type: 'number', minimum: 0.01 },
              occurredAt: { type: 'string', format: 'date-time' },
              userId: { type: 'string' },
              eventId: { type: 'string', format: 'uuid' },
            },
            required: ['type', 'value', 'occurredAt'],
          },
          {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['ACTIVE', 'SUBSCRIPTION_START', 'SUBSCRIPTION_CANCEL'],
              },
              occurredAt: { type: 'string', format: 'date-time' },
              userId: { type: 'string' },
              value: { type: 'number' },
              eventId: { type: 'string', format: 'uuid' },
            },
            required: ['type', 'occurredAt', 'userId'],
          },
          {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['SIGNUP'] },
              occurredAt: { type: 'string', format: 'date-time' },
              userId: { type: 'string' },
              value: { type: 'number' },
              eventId: { type: 'string', format: 'uuid' },
            },
            required: ['type', 'occurredAt', 'userId'],
          },
        ],
      },
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
        {
          type: 'SIGNUP',
          userId: 'user_789',
          occurredAt: '2025-10-18T09:00:00Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Events successfully processed',
    type: IngestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - missing API key or validation failed',
    type: ValidationErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid API key',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid API key' },
      },
    },
  })
  async ingest(
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() body: unknown,
  ) {
    if (!apiKey) throw new BadRequestException('Missing x-api-key header');

    const parsed = BatchSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw new BadRequestException({ message: 'Validation failed', issues });
    }

    const result = await this.svc.ingestBatch(apiKey, parsed.data);
    return result;
  }
}
