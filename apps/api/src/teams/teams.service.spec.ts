import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    team: {
      create: jest.fn(),
    },
    member: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTeam', () => {
    it('should create a team and add owner as member', async () => {
      const userId = 'user123';
      const teamName = 'Engineering Team';
      const mockTeam = {
        id: 'team123',
        name: teamName,
        createdAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          team: {
            create: jest.fn().mockResolvedValue(mockTeam),
          },
          member: {
            create: jest.fn().mockResolvedValue({
              id: 'member123',
              teamId: mockTeam.id,
              userId,
              role: 'OWNER',
            }),
          },
        });
      });

      const result = await service.createTeam(userId, teamName);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });
  });

  describe('getUserTeams', () => {
    it('should return all teams for a user', async () => {
      const userId = 'user123';
      const mockMemberships = [
        {
          userId,
          teamId: 'team1',
          role: 'OWNER',
          team: { id: 'team1', name: 'Team 1', createdAt: new Date() },
        },
        {
          userId,
          teamId: 'team2',
          role: 'MEMBER',
          team: { id: 'team2', name: 'Team 2', createdAt: new Date() },
        },
      ];

      mockPrismaService.member.findMany.mockResolvedValue(mockMemberships);

      const result = await service.getUserTeams(userId);

      expect(mockPrismaService.member.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { team: true },
      });
      expect(result).toEqual([mockMemberships[0].team, mockMemberships[1].team]);
    });

    it('should return empty array if user has no teams', async () => {
      mockPrismaService.member.findMany.mockResolvedValue([]);

      const result = await service.getUserTeams('user123');

      expect(result).toEqual([]);
    });
  });

  describe('addMember', () => {
    const ownerId = 'owner123';
    const teamId = 'team123';
    const targetUserId = 'target123';

    it('should add a new member to the team as OWNER', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue({
        id: 'member1',
        userId: ownerId,
        teamId,
        role: 'OWNER',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: 'target@example.com',
        password: 'hashed',
        name: 'Target User',
        createdAt: new Date(),
      });
      mockPrismaService.member.upsert.mockResolvedValue({
        id: 'member2',
        userId: targetUserId,
        teamId,
        role: 'ADMIN',
      });

      const result = await service.addMember(ownerId, teamId, targetUserId, 'ADMIN');

      expect(mockPrismaService.member.findFirst).toHaveBeenCalledWith({
        where: { teamId, userId: ownerId },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: targetUserId },
      });
      expect(mockPrismaService.member.upsert).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: targetUserId, teamId } },
        create: { userId: targetUserId, teamId, role: 'ADMIN' },
        update: { role: 'ADMIN' },
      });
      expect(result.role).toBe('ADMIN');
    });

    it('should throw ForbiddenException if requestor is not OWNER', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue({
        id: 'member1',
        userId: ownerId,
        teamId,
        role: 'ADMIN', // Not OWNER
      });

      await expect(
        service.addMember(ownerId, teamId, targetUserId, 'MEMBER'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.addMember(ownerId, teamId, targetUserId, 'MEMBER'),
      ).rejects.toThrow('Only OWNER can invite');
    });

    it('should throw ForbiddenException if requestor is not a member', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember(ownerId, teamId, targetUserId, 'MEMBER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue({
        id: 'member1',
        userId: ownerId,
        teamId,
        role: 'OWNER',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(ownerId, teamId, 'nonexistent', 'MEMBER'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addMember(ownerId, teamId, 'nonexistent', 'MEMBER'),
      ).rejects.toThrow('User not found');
    });

    it('should update role if user is already a member', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue({
        id: 'member1',
        userId: ownerId,
        teamId,
        role: 'OWNER',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: 'target@example.com',
        password: 'hashed',
        name: 'Target User',
        createdAt: new Date(),
      });
      mockPrismaService.member.upsert.mockResolvedValue({
        id: 'member2',
        userId: targetUserId,
        teamId,
        role: 'ADMIN',
      });

      await service.addMember(ownerId, teamId, targetUserId, 'ADMIN');

      expect(mockPrismaService.member.upsert).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: targetUserId, teamId } },
        create: { userId: targetUserId, teamId, role: 'ADMIN' },
        update: { role: 'ADMIN' },
      });
    });
  });
});
