import { Controller, Get } from '@nestjs/common';

@Controller('v1/health')
export class HealthController {
  @Get()
  check() {
    return { ok: true, service: 'api', time: new Date().toISOString() };
  }
}
