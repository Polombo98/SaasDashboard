import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { SignOptions } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
  }

  async register(email: string, password: string, name?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Email already registered');
    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hash, name },
    });
    const tokens = await this.issueTokens(user.id, user.email);
    return { user: this.safeUser(user), ...tokens };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const tokens = await this.issueTokens(user.id, user.email);
    return { user: this.safeUser(user), ...tokens };
  }

  async me(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new UnauthorizedException();
    return this.safeUser(u);
  }

  private safeUser(u: User) {
    const { id, email, name, createdAt } = u;
    return { id, email, name, createdAt };
  }

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    // Use seconds for expiresIn: 15m = 900s, 7d = 604800s
    const accessExpires =
      this.config.get<Extract<SignOptions, 'expiresIn'>>(
        'JWT_ACCESS_EXPIRES',
      ) || 900;
    const refreshExpires =
      this.config.get<Extract<SignOptions, 'expiresIn'>>(
        'JWT_REFRESH_EXPIRES',
      ) || 604800;

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: accessExpires,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: refreshExpires,
    });

    return { accessToken, refreshToken };
  }
}
