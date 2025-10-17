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
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LoginDto, RegisterDto } from './dto';
import type { LoginInput, RegisterInput } from './dto';
import { JwtAuthGuard } from './jwt.guard';
import type * as express from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../types/JWT';

interface AuthRequest extends express.Request {
  user: JwtPayload;
}

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
  logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie('refreshToken');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
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
