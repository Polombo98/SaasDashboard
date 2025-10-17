import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, type StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/types/JWT';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secretOrKey = config.get<string>('JWT_ACCESS_SECRET');
    if (!secretOrKey) throw new Error('No secret key is present');

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey,
    };

    super(options);
  }
  validate(payload: unknown): JwtPayload {
    if (!this.isValidPayload(payload)) {
      throw new Error('Invalid JWT payload');
    }
    return payload;
  }

  private isValidPayload(payload: unknown): payload is JwtPayload {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'sub' in payload &&
      typeof payload.sub === 'string'
    );
  }
}
