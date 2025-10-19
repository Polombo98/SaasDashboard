import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from './jwt-access.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), EmailModule],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
