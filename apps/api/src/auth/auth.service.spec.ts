import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      if (key === 'JWT_ACCESS_EXPIRES') return 900;
      if (key === 'JWT_REFRESH_EXPIRES') return 604800;
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
    config = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const name = 'Test User';

    it('should successfully register a new user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name,
        createdAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register(email, password, name);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email,
          password: expect.any(String),
          name,
        },
      });
      expect(result).toEqual({
        user: {
          id: 'user123',
          email,
          name,
          createdAt: expect.any(Date),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email,
        password: 'hashed',
        name: 'Existing User',
        createdAt: new Date(),
      });

      await expect(service.register(email, password)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(email, password)).rejects.toThrow(
        'Email already registered',
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name,
        createdAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.register(email, password, name);

      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      const hashedPassword = createCall.data.password;

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toBeTruthy();
    });

    it('should work without a name', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name: null,
        createdAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register(email, password);

      expect(result.user.name).toBeNull();
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = bcrypt.hashSync(password, 10);

    it('should successfully log in a user with correct credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        email,
        password: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(email, password);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toEqual({
        user: {
          id: 'user123',
          email,
          name: 'Test User',
          createdAt: expect.any(Date),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        email,
        password: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
      });

      await expect(service.login(email, 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(email, 'wrongpassword')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('me', () => {
    it('should return user data for valid userId', async () => {
      const userId = 'user123';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        createdAt: new Date(),
      });

      const result = await service.me(userId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: expect.any(Date),
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.me('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('constructor', () => {
    it('should throw error if JWT_ACCESS_SECRET is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return undefined;
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        return undefined;
      });

      await expect(
        async () =>
          await Test.createTestingModule({
            providers: [
              AuthService,
              { provide: PrismaService, useValue: mockPrismaService },
              { provide: JwtService, useValue: mockJwtService },
              { provide: ConfigService, useValue: mockConfigService },
            ],
          }).compile(),
      ).rejects.toThrow('JWT_ACCESS_SECRET is not configured');
    });

    it('should throw error if JWT_REFRESH_SECRET is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
        if (key === 'JWT_REFRESH_SECRET') return undefined;
        return undefined;
      });

      await expect(
        async () =>
          await Test.createTestingModule({
            providers: [
              AuthService,
              { provide: PrismaService, useValue: mockPrismaService },
              { provide: JwtService, useValue: mockJwtService },
              { provide: ConfigService, useValue: mockConfigService },
            ],
          }).compile(),
      ).rejects.toThrow('JWT_REFRESH_SECRET is not configured');
    });
  });
});
