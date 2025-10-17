import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/types/JWT';
import { CookieRequest } from 'src/types/Cookies';

function cookieExtractor(req: CookieRequest) {
  return req?.cookies?.refreshToken ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    const secretOrKey = config.get<string>('JWT_REFRESH_SECRET');
    if (!secretOrKey) throw new Error('No secret key is present');
    super({
      jwtFromRequest: cookieExtractor,
      secretOrKey,
    });
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
