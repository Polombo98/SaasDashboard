import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type IngestEvent = {
  type:
    | 'REVENUE'
    | 'ACTIVE'
    | 'SUBSCRIPTION_START'
    | 'SUBSCRIPTION_CANCEL'
    | 'SIGNUP';
  value?: number;
  userId?: string;
  eventId?: string;
  occurredAt: Date;
};

@Injectable()
export class IngestService {
  constructor(private prisma: PrismaService) {}

  async ingestBatch(apiKey: string, items: IngestEvent[]) {
    // 1) Resolve project by API key
    const project = await this.prisma.project.findUnique({ where: { apiKey } });
    if (!project) throw new UnauthorizedException('Invalid API key');

    // 2) Prepare rows for createMany
    const rows = items.map((e) => ({
      projectId: project.id,
      type: e.type,
      value: e.value ?? null,
      userId: e.userId ?? null,
      eventId: e.eventId ?? null,
      occurredAt: e.occurredAt,
    }));

    // 3) Insert (skip duplicates via unique (projectId,eventId); nulls are allowed multiple times)
    const created = await this.prisma.metricEvent.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return {
      projectId: project.id,
      received: items.length,
      inserted: created.count,
    };
  }
}
