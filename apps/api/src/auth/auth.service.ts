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
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
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
    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    // Send verification email
    await this.email.sendVerificationEmail(
      email,
      verificationToken,
      name ?? undefined,
    );

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      email: user.email,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in',
      );
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: this.safeUser(user), ...tokens };
  }

  async me(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new UnauthorizedException();
    return this.safeUser(u);
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if token is expired
    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Verification token has expired');
    }

    // Mark email as verified and clear verification token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('No account found with this email address');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    // Send verification email
    await this.email.sendVerificationEmail(
      email,
      verificationToken,
      user.name ?? undefined,
    );

    return { message: 'Verification email sent. Please check your inbox.' };
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
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
