import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  LoginDto,
  RegisterDto,
  RegisterRequestDto,
  LoginRequestDto,
  AuthResponseDto,
  RefreshResponseDto,
  LogoutResponseDto,
  UserResponseDto,
} from './dto';
import type { LoginInput, RegisterInput } from './dto';
import { JwtAuthGuard } from './jwt.guard';
import type * as express from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../types/JWT';

interface AuthRequest extends express.Request {
  user: JwtPayload;
}

@ApiTags('Authentication')
@ApiExtraModels(
  RegisterRequestDto,
  LoginRequestDto,
  AuthResponseDto,
  RefreshResponseDto,
  LogoutResponseDto,
  UserResponseDto,
)
@Controller('v1/auth')
export class AuthController {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private auth: AuthService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {
    const accessSecret = this.cfg.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account and returns access token. Sets refresh token as HttpOnly cookie.',
  })
  @ApiBody({
    type: RegisterRequestDto,
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
          description: 'User email address',
        },
        password: {
          type: 'string',
          minLength: 8,
          example: 'SecurePass123',
          description: 'User password (minimum 8 characters)',
        },
        name: {
          type: 'string',
          example: 'John Doe',
          description: 'User name',
        },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body(new ZodValidationPipe(RegisterDto)) body: RegisterInput,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { user, accessToken, refreshToken } = await this.auth.register(
      body.email,
      body.password,
      body.name,
    );
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates user and returns access token. Sets refresh token as HttpOnly cookie.',
  })
  @ApiBody({
    type: LoginRequestDto,
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
          description: 'User email address',
        },
        password: {
          type: 'string',
          minLength: 8,
          example: 'SecurePass123',
          description: 'User password',
        },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body(new ZodValidationPipe(LoginDto)) body: LoginInput,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { user, accessToken, refreshToken } = await this.auth.login(
      body.email,
      body.password,
    );
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses refresh token from HttpOnly cookie to generate a new access token.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token not found or invalid',
  })
  async refresh(@Req() req: express.Request) {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.refreshSecret,
      });

      const accessExpires = this.cfg.get<number>('JWT_ACCESS_EXPIRES') || 900;

      const accessToken = await this.jwt.signAsync(
        { sub: payload.sub, email: payload.email },
        {
          secret: this.accessSecret,
          expiresIn: accessExpires,
        },
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Clears the refresh token cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
    type: LogoutResponseDto,
  })
  logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie('refreshToken');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Returns the currently authenticated user information. Requires valid JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async me(@Req() req: AuthRequest) {
    return this.auth.me(req.user.sub);
  }

  private setRefreshCookie(res: express.Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set to true in production (HTTPS)
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/', // adjust if you want to scope
    });
  }
}
