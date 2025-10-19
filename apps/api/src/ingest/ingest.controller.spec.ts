import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';

describe('IngestController', () => {
  let controller: IngestController;
  let service: IngestService;

  const mockIngestService = {
    ingestBatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestController],
      providers: [{ provide: IngestService, useValue: mockIngestService }],
    }).compile();

    controller = module.get<IngestController>(IngestController);
    service = module.get<IngestService>(IngestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ingest', () => {
    const validApiKey = 'proj_test_key';

    it('should throw BadRequestException when API key is missing', async () => {
      const body = [
        {
          type: 'REVENUE',
          value: 99.99,
          occurredAt: '2025-10-18T10:30:00Z',
        },
      ];

      await expect(controller.ingest(undefined, body)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.ingest(undefined, body)).rejects.toThrow(
        'Missing x-api-key header',
      );

      expect(service.ingestBatch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when body is invalid (not an array)', async () => {
      const invalidBody = { type: 'REVENUE', value: 99.99 };

      await expect(
        controller.ingest(validApiKey, invalidBody),
      ).rejects.toThrow(BadRequestException);

      expect(service.ingestBatch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when batch is empty', async () => {
      const emptyBatch: unknown[] = [];

      await expect(
        controller.ingest(validApiKey, emptyBatch),
      ).rejects.toThrow(BadRequestException);

      expect(service.ingestBatch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when batch exceeds 500 events', async () => {
      const largeBatch = Array(501).fill({
        type: 'REVENUE',
        value: 99.99,
        occurredAt: '2025-10-18T10:30:00Z',
      });

      await expect(
        controller.ingest(validApiKey, largeBatch),
      ).rejects.toThrow(BadRequestException);

      expect(service.ingestBatch).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException with validation issues for invalid event', async () => {
      const invalidEvent = [
        {
          type: 'REVENUE',
          // missing value and occurredAt
        },
      ];

      try {
        await controller.ingest(validApiKey, invalidEvent);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          message: string;
          issues: unknown[];
        };
        expect(response.message).toBe('Validation failed');
        expect(response.issues).toBeDefined();
        expect(Array.isArray(response.issues)).toBe(true);
      }

      expect(service.ingestBatch).not.toHaveBeenCalled();
    });

    it('should successfully ingest valid REVENUE event', async () => {
      const validBatch = [
        {
          type: 'REVENUE',
          value: 99.99,
          occurredAt: '2025-10-18T10:30:00Z',
          userId: 'user_123',
          eventId: '550e8400-e29b-41d4-a716-446655440000',
        },
      ];

      const expectedResult = { processed: 1, skipped: 0, errors: [] };
      mockIngestService.ingestBatch.mockResolvedValue(expectedResult);

      const result = await controller.ingest(validApiKey, validBatch);

      expect(result).toEqual(expectedResult);
      expect(service.ingestBatch).toHaveBeenCalledWith(
        validApiKey,
        expect.arrayContaining([
          expect.objectContaining({
            type: 'REVENUE',
            value: 99.99,
            userId: 'user_123',
            eventId: '550e8400-e29b-41d4-a716-446655440000',
            occurredAt: expect.any(Date),
          }),
        ]),
      );
    });

    it('should successfully ingest valid ACTIVE event', async () => {
      const validBatch = [
        {
          type: 'ACTIVE',
          userId: 'user_456',
          occurredAt: '2025-10-18T11:00:00Z',
        },
      ];

      const expectedResult = { processed: 1, skipped: 0, errors: [] };
      mockIngestService.ingestBatch.mockResolvedValue(expectedResult);

      const result = await controller.ingest(validApiKey, validBatch);

      expect(result).toEqual(expectedResult);
      expect(service.ingestBatch).toHaveBeenCalledWith(
        validApiKey,
        expect.arrayContaining([
          expect.objectContaining({
            type: 'ACTIVE',
            userId: 'user_456',
            occurredAt: expect.any(Date),
          }),
        ]),
      );
    });

    it('should successfully ingest valid SIGNUP event', async () => {
      const validBatch = [
        {
          type: 'SIGNUP',
          userId: 'user_789',
          occurredAt: '2025-10-18T09:00:00Z',
        },
      ];

      const expectedResult = { processed: 1, skipped: 0, errors: [] };
      mockIngestService.ingestBatch.mockResolvedValue(expectedResult);

      const result = await controller.ingest(validApiKey, validBatch);

      expect(result).toEqual(expectedResult);
      expect(service.ingestBatch).toHaveBeenCalledWith(
        validApiKey,
        expect.arrayContaining([
          expect.objectContaining({
            type: 'SIGNUP',
            userId: 'user_789',
            occurredAt: expect.any(Date),
          }),
        ]),
      );
    });

    it('should successfully ingest mixed event types', async () => {
      const validBatch = [
        {
          type: 'REVENUE',
          value: 99.99,
          occurredAt: '2025-10-18T10:30:00Z',
        },
        {
          type: 'ACTIVE',
          userId: 'user_456',
          occurredAt: '2025-10-18T11:00:00Z',
        },
        {
          type: 'SUBSCRIPTION_START',
          userId: 'user_789',
          occurredAt: '2025-10-18T09:00:00Z',
        },
        {
          type: 'SUBSCRIPTION_CANCEL',
          userId: 'user_101',
          occurredAt: '2025-10-18T12:00:00Z',
        },
      ];

      const expectedResult = { processed: 4, skipped: 0, errors: [] };
      mockIngestService.ingestBatch.mockResolvedValue(expectedResult);

      const result = await controller.ingest(validApiKey, validBatch);

      expect(result).toEqual(expectedResult);
      expect(service.ingestBatch).toHaveBeenCalledWith(
        validApiKey,
        expect.arrayContaining([
          expect.objectContaining({
            type: 'REVENUE',
            value: 99.99,
            occurredAt: expect.any(Date),
          }),
          expect.objectContaining({
            type: 'ACTIVE',
            userId: 'user_456',
            occurredAt: expect.any(Date),
          }),
          expect.objectContaining({
            type: 'SUBSCRIPTION_START',
            userId: 'user_789',
            occurredAt: expect.any(Date),
          }),
          expect.objectContaining({
            type: 'SUBSCRIPTION_CANCEL',
            userId: 'user_101',
            occurredAt: expect.any(Date),
          }),
        ]),
      );
    });
  });
});
