import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TeamRoleGuard } from './team-role.guard';
import { PrismaService } from '../prisma/prisma.service';

describe('TeamRoleGuard', () => {
  let guard: TeamRoleGuard;
  let prisma: PrismaService;

  const mockPrismaService = {
    member: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MEMBER role (default)', () => {
    beforeEach(() => {
      guard = new TeamRoleGuard(prisma, 'MEMBER');
    });

    it('should allow access when user is a team member', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { teamId: 'team-123', userId: 'user-123' },
        select: { role: true },
      });
    });

    it('should allow access when user is ADMIN', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'ADMIN',
      });

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should allow access when user is OWNER', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'OWNER',
      });

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when teamId is missing from params and body', async () => {
      const mockContext = createMockContext({
        params: {},
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'teamId is required',
      );
    });

    it('should get teamId from body when not in params', async () => {
      const mockContext = createMockContext({
        params: {},
        body: { teamId: 'team-456' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { teamId: 'team-456', userId: 'user-123' },
        select: { role: true },
      });
    });

    it('should throw ForbiddenException when user is not a team member', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Not a team member',
      );
    });
  });

  describe('ADMIN role requirement', () => {
    beforeEach(() => {
      guard = new TeamRoleGuard(prisma, 'ADMIN');
    });

    it('should allow access when user is ADMIN', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'ADMIN',
      });

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should allow access when user is OWNER', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'OWNER',
      });

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is only MEMBER', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Insufficient role',
      );
    });
  });

  describe('OWNER role requirement', () => {
    beforeEach(() => {
      guard = new TeamRoleGuard(prisma, 'OWNER');
    });

    it('should allow access when user is OWNER', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'OWNER',
      });

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is ADMIN', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'ADMIN',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Insufficient role',
      );
    });

    it('should throw ForbiddenException when user is MEMBER', async () => {
      const mockContext = createMockContext({
        params: { teamId: 'team-123' },
        user: { sub: 'user-123', email: 'user@example.com' },
      });

      mockPrismaService.member.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Insufficient role',
      );
    });
  });
});

function createMockContext(options: {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: { sub: string; email: string };
}): ExecutionContext {
  const request = {
    params: options.params || {},
    body: options.body || {},
    user: options.user || { sub: 'user-123', email: 'user@example.com' },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
