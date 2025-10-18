import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureProjectAccess', () => {
    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.mrr('proj1', 'user1', { interval: 'day' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a team member', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ id: 'proj1', teamId: 'team1' });
      mockPrismaService.member.findFirst.mockResolvedValue(null);

      await expect(service.mrr('proj1', 'user1', { interval: 'day' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('mrr', () => {
    it('should return MRR data for authorized user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ teamId: 'team1' });
      mockPrismaService.member.findFirst.mockResolvedValue({ role: 'MEMBER' });
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([
        { bucket: new Date('2025-10-01'), total: 1000 },
        { bucket: new Date('2025-10-02'), total: 1500 },
      ]);

      const result = await service.mrr('proj1', 'user1', { 
        from: new Date('2025-10-01'),
        to: new Date('2025-10-02'),
        interval: 'day' 
      });

      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('series');
      expect(result.labels).toContain('2025-10-01');
      expect(result.series).toContain(1000);
    });
  });

  describe('activeUsers', () => {
    it('should return active users data', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({ teamId: 'team1' });
      mockPrismaService.member.findFirst.mockResolvedValue({ role: 'MEMBER' });
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([
        { bucket: new Date('2025-10-01'), count: 100 },
      ]);

      const result = await service.activeUsers('proj1', 'user1', { interval: 'day' });

      expect(result.labels).toBeDefined();
      expect(result.series).toBeDefined();
    });
  });

  describe('churn', () => {
    it('should calculate churn rate correctly', async () => {
      const testDate = new Date('2025-10-01T00:00:00Z');
      mockPrismaService.project.findUnique.mockResolvedValue({ teamId: 'team1' });
      mockPrismaService.member.findFirst.mockResolvedValue({ role: 'MEMBER' });
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([{ bucket: testDate, c: 5 }])
        .mockResolvedValueOnce([{ bucket: testDate, s: 100 }]);

      const result = await service.churn('proj1', 'user1', { 
        from: testDate,
        to: testDate,
        interval: 'day' 
      });

      expect(result.labels).toBeDefined();
      expect(result.series).toBeDefined();
      expect(result.series.length).toBeGreaterThan(0);
      expect(result.series[0]).toBe(5);
    });

    it('should return 0 churn when no starts', async () => {
      const testDate = new Date('2025-10-01T00:00:00Z');
      mockPrismaService.project.findUnique.mockResolvedValue({ teamId: 'team1' });
      mockPrismaService.member.findFirst.mockResolvedValue({ role: 'MEMBER' });
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([{ bucket: testDate, c: 5 }])
        .mockResolvedValueOnce([]);

      const result = await service.churn('proj1', 'user1', { 
        from: testDate,
        to: testDate,
        interval: 'day' 
      });

      expect(result.series[0]).toBe(0);
    });
  });
});
