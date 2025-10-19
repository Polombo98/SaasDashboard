import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    me: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      if (key === 'JWT_ACCESS_EXPIRES') return 900;
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const expectedResponse = {
        message:
          'Registration successful. Please check your email to verify your account.',
        email: 'test@example.com',
      };

      mockAuthService.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.name,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('login', () => {
    it('should login a user and set refresh cookie', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResponse = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date(),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResponse);

      const mockResponse = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.login(loginDto, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(result).toEqual({
        user: expectedResponse.user,
        accessToken: expectedResponse.accessToken,
      });
    });
  });

  describe('refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockRequest = {
        cookies: {
          refreshToken: 'valid-refresh-token',
        },
      } as Partial<Request> as Request;

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user123',
        email: 'test@example.com',
      });
      mockJwtService.signAsync.mockResolvedValue('new-access-token');

      const result = await controller.refresh(mockRequest);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-refresh-token',
        { secret: 'test-refresh-secret' },
      );
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('should throw UnauthorizedException if refresh token not found', async () => {
      const mockRequest = {
        cookies: {},
      } as Partial<Request> as Request;

      await expect(controller.refresh(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.refresh(mockRequest)).rejects.toThrow(
        'Refresh token not found',
      );
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      const mockRequest = {
        cookies: {
          refreshToken: 'invalid-token',
        },
      } as Partial<Request> as Request;

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.refresh(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.refresh(mockRequest)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token cookie', () => {
      const mockResponse = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      const result = controller.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result).toEqual({ success: true });
    });
  });

  describe('me', () => {
    it('should return current user data', async () => {
      const mockRequest = {
        user: {
          sub: 'user123',
          email: 'test@example.com',
        },
      } as never;

      const expectedUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      mockAuthService.me.mockResolvedValue(expectedUser);

      const result = await controller.me(mockRequest);

      expect(authService.me).toHaveBeenCalledWith('user123');
      expect(result).toEqual(expectedUser);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const mockRequest = {
        query: {
          token: 'valid-verification-token',
        },
      } as unknown as Request;

      const expectedResponse = {
        message: 'Email verified successfully. You can now log in.',
      };

      mockAuthService.verifyEmail.mockResolvedValue(expectedResponse);

      const result = await controller.verifyEmail(mockRequest);

      expect(authService.verifyEmail).toHaveBeenCalledWith(
        'valid-verification-token',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw UnauthorizedException if token is missing', async () => {
      const mockRequest = {
        query: {},
      } as unknown as Request;

      await expect(controller.verifyEmail(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.verifyEmail(mockRequest)).rejects.toThrow(
        'Verification token is required',
      );
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email', async () => {
      const email = 'test@example.com';

      const expectedResponse = {
        message: 'Verification email sent. Please check your inbox.',
      };

      mockAuthService.resendVerification.mockResolvedValue(expectedResponse);

      const result = await controller.resendVerification(email);

      expect(authService.resendVerification).toHaveBeenCalledWith(email);
      expect(result).toEqual(expectedResponse);
    });
  });
});
