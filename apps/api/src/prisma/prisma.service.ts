import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    // Prisma's $on typings don't expose 'beforeExit' well:
    // @ts-expect-error: 'beforeExit' is a valid Prisma event at runtime
    this.$on('beforeExit', () => {
      void app.close();
    });
  }
}
