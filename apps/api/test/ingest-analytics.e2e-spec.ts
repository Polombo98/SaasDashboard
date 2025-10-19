import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Server } from 'http';

describe('Ingest & Analytics (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let accessToken: string;
  let projectApiKey: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get(PrismaService);

    await app.init();

    // Create user, team, and project for testing
    const testEmail = `ingest-test-${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: testEmail,
      password: 'Test1234!',
      name: 'Ingest Test User',
    });

    await prisma.user.update({
      where: { email: testEmail },
      data: { emailVerified: true },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Test1234!',
      });

    accessToken = loginResponse.body.accessToken;

    // Create team
    const teamResponse = await request(app.getHttpServer())
      .post('/v1/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Ingest Test Team',
      });

    const teamId = teamResponse.body.id;

    // Create project
    const projectResponse = await request(app.getHttpServer())
      .post(`/v1/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Ingest Test Project',
      });

    projectApiKey = projectResponse.body.apiKey;
    projectId = projectResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Ingest API', () => {
    describe('POST /v1/ingest', () => {
      it('should ingest REVENUE events', async () => {
        const events = [
          {
            type: 'REVENUE',
            value: 99.99,
            occurredAt: new Date().toISOString(),
            userId: 'user_123',
            eventId: '550e8400-e29b-41d4-a716-446655440001',
          },
        ];

        const response = await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(200);

        expect(response.body).toHaveProperty('inserted');
        expect(response.body).toHaveProperty('received');
        expect(response.body.received).toBe(1);
        expect(response.body.inserted).toBe(1);
      });

      it('should ingest ACTIVE events', async () => {
        const events = [
          {
            type: 'ACTIVE',
            userId: 'user_456',
            occurredAt: new Date().toISOString(),
          },
        ];

        const response = await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(200);

        expect(response.body.inserted).toBe(1);
      });

      it('should ingest SIGNUP events', async () => {
        const events = [
          {
            type: 'SIGNUP',
            userId: 'user_789',
            occurredAt: new Date().toISOString(),
          },
        ];

        const response = await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(200);

        expect(response.body.inserted).toBe(1);
      });

      it('should ingest SUBSCRIPTION_START events', async () => {
        const events = [
          {
            type: 'SUBSCRIPTION_START',
            userId: 'user_101',
            occurredAt: new Date().toISOString(),
          },
        ];

        const response = await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(200);

        expect(response.body.inserted).toBe(1);
      });

      it('should ingest SUBSCRIPTION_CANCEL events', async () => {
        const events = [
          {
            type: 'SUBSCRIPTION_CANCEL',
            userId: 'user_102',
            occurredAt: new Date().toISOString(),
          },
        ];

        const response = await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(200);

        expect(response.body.inserted).toBe(1);
      });

      it('should ingest batch of mixed events', async () => {
        const events = [
          {
            type: 'REVENUE',
            value: 49.99,
            occurredAt: new Date().toISOString(),
            userId: 'batch_user_1',
          },
          {
            type: 'ACTIVE',
            userId: 'batch_user_2',
            occurredAt: new Date().toISOString(),
          },
          {
            type: 'SIGNUP',
            userId: 'batch_user_3',
            occurredAt: new Date().toISOString(),
          },
        ];

        const response = await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(200);

        expect(response.body.inserted).toBe(3);
      });

      it('should skip duplicate events (idempotency)', async () => {
        const eventId = '550e8400-e29b-41d4-a716-446655440099';
        const events = [
          {
            type: 'REVENUE',
            value: 29.99,
            occurredAt: new Date().toISOString(),
            userId: 'dup_user',
            eventId,
          },
        ];

        // First ingestion
        const first = await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(200);

        expect(first.body.inserted).toBeGreaterThanOrEqual(1);

        // Second ingestion (duplicate) - should be skipped
        const response = await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(200);

        // Duplicate should result in 0 inserts (already exists)
        expect(response.body.inserted).toBe(0);
        expect(response.body.received).toBe(1);
      });

      it('should reject request without API key', async () => {
        const events = [
          {
            type: 'REVENUE',
            value: 99.99,
            occurredAt: new Date().toISOString(),
          },
        ];

        await request(app.getHttpServer())
          .post('/v1/ingest')
          .send(events)
          .expect(400);
      });

      it('should reject request with invalid API key', async () => {
        const events = [
          {
            type: 'REVENUE',
            value: 99.99,
            occurredAt: new Date().toISOString(),
          },
        ];

        await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', 'invalid-key')
          .send(events)
          .expect(401);
      });

      it('should reject empty batch', async () => {
        await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send([])
          .expect(400);
      });

      it('should reject batch exceeding 500 events', async () => {
        const events = Array(501).fill({
          type: 'ACTIVE',
          userId: 'user_overflow',
          occurredAt: new Date().toISOString(),
        });

        await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(400);
      });

      it('should reject invalid event structure', async () => {
        const events = [
          {
            type: 'REVENUE',
            // missing value and occurredAt
          },
        ];

        await request(app.getHttpServer())
          .post('/v1/ingest')
          .set('x-api-key', projectApiKey)
          .send(events)
          .expect(400);
      });
    });
  });

  describe('Analytics API', () => {
    beforeAll(async () => {
      // Ingest some test data for analytics
      const now = new Date();
      const events = [
        {
          type: 'REVENUE',
          value: 100,
          occurredAt: new Date(
            now.getTime() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          eventId: '550e8400-e29b-41d4-a716-446655441001',
        },
        {
          type: 'REVENUE',
          value: 200,
          occurredAt: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          eventId: '550e8400-e29b-41d4-a716-446655441002',
        },
        {
          type: 'ACTIVE',
          userId: 'analytics_user_1',
          occurredAt: new Date(
            now.getTime() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          eventId: '550e8400-e29b-41d4-a716-446655441003',
        },
        {
          type: 'ACTIVE',
          userId: 'analytics_user_2',
          occurredAt: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          eventId: '550e8400-e29b-41d4-a716-446655441004',
        },
      ];

      await request(app.getHttpServer())
        .post('/v1/ingest')
        .set('x-api-key', projectApiKey)
        .send(events);
    });

    describe('GET /v1/analytics/:projectId/mrr', () => {
      it('should get MRR analytics', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v1/analytics/${projectId}/mrr`)
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            to: new Date().toISOString().split('T')[0],
            interval: 'day',
          })
          .expect(200);

        expect(response.body).toHaveProperty('labels');
        expect(response.body).toHaveProperty('series');
        expect(Array.isArray(response.body.labels)).toBe(true);
        expect(Array.isArray(response.body.series)).toBe(true);
      });

      it('should reject request without auth', async () => {
        await request(app.getHttpServer())
          .get(`/v1/analytics/${projectId}/mrr`)
          .expect(401);
      });
    });

    describe('GET /v1/analytics/:projectId/active-users', () => {
      it('should get active users analytics', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v1/analytics/${projectId}/active-users`)
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            to: new Date().toISOString().split('T')[0],
            interval: 'day',
          })
          .expect(200);

        expect(response.body).toHaveProperty('labels');
        expect(response.body).toHaveProperty('series');
        expect(Array.isArray(response.body.labels)).toBe(true);
        expect(Array.isArray(response.body.series)).toBe(true);
      });

      it('should work with different intervals', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v1/analytics/${projectId}/active-users`)
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            interval: 'week',
          })
          .expect(200);

        expect(response.body).toHaveProperty('labels');
        expect(response.body).toHaveProperty('series');
      });
    });

    describe('GET /v1/analytics/:projectId/churn', () => {
      it('should get churn analytics', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v1/analytics/${projectId}/churn`)
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            to: new Date().toISOString().split('T')[0],
            interval: 'day',
          })
          .expect(200);

        expect(response.body).toHaveProperty('labels');
        expect(response.body).toHaveProperty('series');
        expect(Array.isArray(response.body.labels)).toBe(true);
        expect(Array.isArray(response.body.series)).toBe(true);
      });

      it('should reject request without auth', async () => {
        await request(app.getHttpServer())
          .get(`/v1/analytics/${projectId}/churn`)
          .expect(401);
      });
    });
  });
});
