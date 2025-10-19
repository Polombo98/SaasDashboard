/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
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
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const name = 'Test User';

    it('should successfully register a new user and send verification email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name,
        emailVerified: false,
        emailVerificationToken: 'mock-token',
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(email, password, name);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email,
          password: expect.any(String),
          name,
          emailVerificationToken: expect.any(String),
          emailVerificationExpires: expect.any(Date),
        },
      });
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
        name,
      );
      expect(result).toEqual({
        message:
          'Registration successful. Please check your email to verify your account.',
        email,
      });
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email,
        password: 'hashed',
        name: 'Existing User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        createdAt: new Date(),
      });

      await expect(service.register(email, password)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(email, password)).rejects.toThrow(
        'Email already registered',
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name,
        emailVerified: false,
        emailVerificationToken: 'mock-token',
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

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
        emailVerified: false,
        emailVerificationToken: 'mock-token',
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(email, password);

      expect(result).toEqual({
        message:
          'Registration successful. Please check your email to verify your account.',
        email,
      });
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
        undefined,
      );
    });

    it('should generate a verification token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name,
        emailVerified: false,
        emailVerificationToken: 'mock-token',
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.register(email, password, name);

      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      const token = createCall.data.emailVerificationToken;

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(32); // hex string from 32 bytes
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = bcrypt.hashSync(password, 10);

    it('should successfully log in a verified user with correct credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        email,
        password: hashedPassword,
        name: 'Test User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
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
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        createdAt: new Date(),
      });

      await expect(service.login(email, 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(email, 'wrongpassword')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        email,
        password: hashedPassword,
        name: 'Test User',
        emailVerified: false,
        emailVerificationToken: 'some-token',
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      await expect(service.login(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(email, password)).rejects.toThrow(
        'Please verify your email address before logging in',
      );
    });
  });

  describe('verifyEmail', () => {
    const token = 'valid-token';

    it('should successfully verify email with valid token', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpires: futureDate,
        createdAt: new Date(),
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        createdAt: new Date(),
      });

      const result = await service.verifyEmail(token);

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { emailVerificationToken: token },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });
      expect(result).toEqual({
        message: 'Email verified successfully. You can now log in.',
      });
    });

    it('should throw BadRequestException if token not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired verification token',
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if token is expired', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpires: pastDate,
        createdAt: new Date(),
      });

      await expect(service.verifyEmail(token)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmail(token)).rejects.toThrow(
        'Verification token has expired',
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    const email = 'test@example.com';

    it('should successfully resend verification email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name: 'Test User',
        emailVerified: false,
        emailVerificationToken: 'old-token',
        emailVerificationExpires: new Date(Date.now() + 1000),
        createdAt: new Date(),
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name: 'Test User',
        emailVerified: false,
        emailVerificationToken: 'new-token',
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.resendVerification(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          emailVerificationToken: expect.any(String),
          emailVerificationExpires: expect.any(Date),
        },
      });
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
        'Test User',
      );
      expect(result).toEqual({
        message: 'Verification email sent. Please check your inbox.',
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.resendVerification(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resendVerification(email)).rejects.toThrow(
        'No account found with this email address',
      );
      expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name: 'Test User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        createdAt: new Date(),
      });

      await expect(service.resendVerification(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resendVerification(email)).rejects.toThrow(
        'Email is already verified',
      );
      expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';

    it('should successfully send password reset email for existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name: 'Test User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: new Date(),
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user123',
        email,
        password: 'hashed',
        name: 'Test User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: 'reset-token',
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      });
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date),
        },
      });
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
        'Test User',
      );
      expect(result).toEqual({
        message:
          'If an account exists with this email, a password reset link has been sent.',
      });
    });

    it('should return generic message if user not found (security)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result).toEqual({
        message:
          'If an account exists with this email, a password reset link has been sent.',
      });
    });
  });

  describe('resetPassword', () => {
    const token = 'valid-reset-token';
    const newPassword = 'NewPassword123';

    it('should successfully reset password with valid token', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        password: 'old-hashed-password',
        name: 'Test User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: token,
        passwordResetExpires: futureDate,
        createdAt: new Date(),
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        password: 'new-hashed-password',
        name: 'Test User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: new Date(),
      });

      const result = await service.resetPassword(token, newPassword);

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { passwordResetToken: token },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          password: expect.any(String),
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
      expect(result).toEqual({
        message: 'Password reset successful. You can now log in.',
      });
    });

    it('should throw BadRequestException if token not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        'Invalid or expired reset token',
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if token is expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: token,
        passwordResetExpires: pastDate,
        createdAt: new Date(),
      });

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        'Reset token has expired',
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
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
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
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
      expect(result).not.toHaveProperty('emailVerificationToken');
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
              { provide: EmailService, useValue: mockEmailService },
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
              { provide: EmailService, useValue: mockEmailService },
            ],
          }).compile(),
      ).rejects.toThrow('JWT_REFRESH_SECRET is not configured');
    });
  });
});
