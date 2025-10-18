import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockPrismaService = {
    member: {
      findFirst: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should list projects for team member', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue({ role: 'MEMBER' });
      mockPrismaService.project.findMany.mockResolvedValue([
        { id: 'proj1', name: 'Project 1', teamId: 'team1', apiKey: 'key1', createdAt: new Date() },
      ]);

      const result = await service.list('team1', 'user1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.member.findFirst).toHaveBeenCalled();
    });

    it('should throw if user is not a member', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue(null);

      await expect(service.list('team1', 'user1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create project for ADMIN', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue({ role: 'ADMIN' });
      mockPrismaService.project.create.mockResolvedValue({
        id: 'proj1', name: 'Project 1', apiKey: 'proj_123', createdAt: new Date()
      });

      const result = await service.create('team1', 'user1', 'Project 1');

      expect(result.name).toBe('Project 1');
      expect(result.apiKey).toMatch(/^proj_/);
    });

    it('should throw if user is MEMBER', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue({ role: 'MEMBER' });

      await expect(service.create('team1', 'user1', 'Project')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rotateKey', () => {
    it('should rotate API key for ADMIN', async () => {
      mockPrismaService.member.findFirst.mockResolvedValue({ role: 'ADMIN' });
      mockPrismaService.project.update.mockResolvedValue({
        id: 'proj1', name: 'Project 1', apiKey: 'proj_new123', createdAt: new Date()
      });

      const result = await service.rotateKey('team1', 'user1', 'proj1');

      expect(result.apiKey).toMatch(/^proj_/);
      expect(mockPrismaService.project.update).toHaveBeenCalled();
    });
  });
});
