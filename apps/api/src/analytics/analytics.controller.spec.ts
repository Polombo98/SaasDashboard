import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    mrr: jest.fn(),
    activeUsers: jest.fn(),
    churn: jest.fn(),
  };

  const mockUser = { sub: 'user-123', email: 'user@example.com' };
  const mockProjectId = 'project-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('mrr', () => {
    it('should return MRR data with default query params', async () => {
      const expectedResult = {
        labels: ['2025-10-01', '2025-10-02'],
        series: [1000, 1200],
      };

      mockAnalyticsService.mrr.mockResolvedValue(expectedResult);

      const result = await controller.mrr(mockProjectId, mockUser, {});

      expect(result).toEqual(expectedResult);
      expect(service.mrr).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
        expect.objectContaining({
          interval: 'day',
        }),
      );
    });

    it('should return MRR data with custom query params', async () => {
      const expectedResult = {
        labels: ['2025-10-01', '2025-10-08', '2025-10-15'],
        series: [1000, 1200, 1400],
      };

      mockAnalyticsService.mrr.mockResolvedValue(expectedResult);

      const result = await controller.mrr(mockProjectId, mockUser, {
        from: '2025-10-01',
        to: '2025-10-18',
        interval: 'week',
      });

      expect(result).toEqual(expectedResult);
      expect(service.mrr).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
          interval: 'week',
        }),
      );
    });
  });

  describe('activeUsers', () => {
    it('should return active users data with default query params', async () => {
      const expectedResult = {
        labels: ['2025-10-01', '2025-10-02'],
        series: [50, 75],
      };

      mockAnalyticsService.activeUsers.mockResolvedValue(expectedResult);

      const result = await controller.activeUsers(mockProjectId, mockUser, {});

      expect(result).toEqual(expectedResult);
      expect(service.activeUsers).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
        expect.objectContaining({
          interval: 'day',
        }),
      );
    });

    it('should return active users data with custom query params', async () => {
      const expectedResult = {
        labels: ['2025-10-01', '2025-11-01', '2025-12-01'],
        series: [50, 75, 100],
      };

      mockAnalyticsService.activeUsers.mockResolvedValue(expectedResult);

      const result = await controller.activeUsers(mockProjectId, mockUser, {
        from: '2025-10-01',
        to: '2025-12-31',
        interval: 'month',
      });

      expect(result).toEqual(expectedResult);
      expect(service.activeUsers).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
          interval: 'month',
        }),
      );
    });
  });

  describe('churn', () => {
    it('should return churn data with default query params', async () => {
      const expectedResult = {
        labels: ['2025-10-01', '2025-10-02'],
        series: [2.5, 3.1],
      };

      mockAnalyticsService.churn.mockResolvedValue(expectedResult);

      const result = await controller.churn(mockProjectId, mockUser, {});

      expect(result).toEqual(expectedResult);
      expect(service.churn).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
        expect.objectContaining({
          interval: 'day',
        }),
      );
    });

    it('should return churn data with custom query params', async () => {
      const expectedResult = {
        labels: ['2025-10-01', '2025-11-01'],
        series: [2.5, 1.8],
      };

      mockAnalyticsService.churn.mockResolvedValue(expectedResult);

      const result = await controller.churn(mockProjectId, mockUser, {
        from: '2025-10-01',
        to: '2025-11-30',
        interval: 'month',
      });

      expect(result).toEqual(expectedResult);
      expect(service.churn).toHaveBeenCalledWith(
        mockProjectId,
        mockUser.sub,
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
          interval: 'month',
        }),
      );
    });
  });
});
