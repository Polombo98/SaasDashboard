import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Server } from 'http';

interface HealthResponse {
  ok: boolean;
  service: string;
  time: string;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200);

    const body = response.body as HealthResponse;
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('service');
    expect(body.ok).toBe(true);
    expect(body.service).toBe('api');
  });
});
