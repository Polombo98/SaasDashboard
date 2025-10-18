/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { IngestService } from './ingest.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('IngestService', () => {
  let service: IngestService;

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
    },
    metricEvent: {
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<IngestService>(IngestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestBatch', () => {
    it('should ingest events with valid API key', async () => {
      const apiKey = 'proj_validkey';
      const events = [
        {
          type: 'REVENUE' as const,
          value: 99.99,
          occurredAt: new Date(),
          userId: 'user1',
          eventId: '123',
        },
        { type: 'ACTIVE' as const, occurredAt: new Date(), userId: 'user2' },
      ];

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj1',
        teamId: 'team1',
        name: 'Project',
        apiKey,
        createdAt: new Date(),
      });
      mockPrismaService.metricEvent.createMany.mockResolvedValue({ count: 2 });

      const result = await service.ingestBatch(apiKey, events);

      expect(result).toEqual({
        projectId: 'proj1',
        received: 2,
        inserted: 2,
      });
      expect(mockPrismaService.metricEvent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ type: 'REVENUE', value: 99.99 }),
          expect.objectContaining({ type: 'ACTIVE' }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.ingestBatch('invalid_key', [])).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.ingestBatch('invalid_key', [])).rejects.toThrow(
        'Invalid API key',
      );
    });

    it('should handle events without optional fields', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ id: 'proj1' });
      mockPrismaService.metricEvent.createMany.mockResolvedValue({ count: 1 });

      const events = [
        { type: 'SIGNUP' as const, occurredAt: new Date(), userId: 'user1' },
      ];
      await service.ingestBatch('key', events);

      const createCall =
        mockPrismaService.metricEvent.createMany.mock.calls[0][0];
      expect(createCall.data[0]).toMatchObject({
        projectId: 'proj1',
        type: 'SIGNUP',
        userId: 'user1',
        value: null,
        eventId: null,
      });
    });

    it('should skip duplicates based on createMany result', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ id: 'proj1' });
      mockPrismaService.metricEvent.createMany.mockResolvedValue({ count: 1 });

      const events = [
        {
          type: 'REVENUE' as const,
          value: 50,
          occurredAt: new Date(),
          eventId: 'evt1',
        },
        {
          type: 'REVENUE' as const,
          value: 50,
          occurredAt: new Date(),
          eventId: 'evt1',
        },
      ];

      const result = await service.ingestBatch('key', events);

      expect(result.received).toBe(2);
      expect(result.inserted).toBe(1);
    });
  });
});
