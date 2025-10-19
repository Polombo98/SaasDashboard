import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Server } from 'http';

describe('Teams & Projects (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get(PrismaService);

    await app.init();

    // Create and login a test user
    const testEmail = `teams-test-${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: testEmail,
      password: 'Test1234!',
      name: 'Teams Test User',
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Teams', () => {
    let teamId: string;

    describe('POST /v1/teams', () => {
      it('should create a new team', async () => {
        const response = await request(app.getHttpServer())
          .post('/v1/teams')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test Team',
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Test Team');
        expect(response.body).toHaveProperty('createdAt');

        teamId = response.body.id;
      });

      it('should reject team creation without auth', async () => {
        await request(app.getHttpServer())
          .post('/v1/teams')
          .send({
            name: 'Unauthorized Team',
          })
          .expect(401);
      });

      it('should reject team creation with empty name', async () => {
        await request(app.getHttpServer())
          .post('/v1/teams')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: '',
          })
          .expect(400);
      });
    });

    describe('GET /v1/teams/mine', () => {
      it('should get user teams', async () => {
        const response = await request(app.getHttpServer())
          .get('/v1/teams/mine')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
      });

      it('should reject request without auth', async () => {
        await request(app.getHttpServer()).get('/v1/teams/mine').expect(401);
      });
    });

    describe('POST /v1/teams/:teamId/members', () => {
      let memberEmail: string;

      beforeAll(async () => {
        // Create another user to add as member
        memberEmail = `member-${Date.now()}@example.com`;
        await request(app.getHttpServer()).post('/v1/auth/register').send({
          email: memberEmail,
          password: 'Test1234!',
          name: 'Member User',
        });

        await prisma.user.update({
          where: { email: memberEmail },
          data: { emailVerified: true },
        });
      });

      it('should add a member to the team', async () => {
        const response = await request(app.getHttpServer())
          .post(`/v1/teams/${teamId}/members`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: memberEmail,
            role: 'MEMBER',
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.role).toBe('MEMBER');
        expect(response.body.teamId).toBe(teamId);
      });

      it('should reject adding member with non-existent email', async () => {
        await request(app.getHttpServer())
          .post(`/v1/teams/${teamId}/members`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: 'nonexistent@example.com',
            role: 'MEMBER',
          })
          .expect(404);
      });

      it('should reject adding member without auth', async () => {
        await request(app.getHttpServer())
          .post(`/v1/teams/${teamId}/members`)
          .send({
            email: memberEmail,
            role: 'MEMBER',
          })
          .expect(401);
      });
    });
  });

  describe('Projects', () => {
    let teamId: string;
    let projectId: string;

    beforeAll(async () => {
      // Create a team for project tests
      const teamResponse = await request(app.getHttpServer())
        .post('/v1/teams')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Project Test Team',
        });

      teamId = teamResponse.body.id;
    });

    describe('POST /v1/teams/:teamId/projects', () => {
      it('should create a new project', async () => {
        const response = await request(app.getHttpServer())
          .post(`/v1/teams/${teamId}/projects`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test Project',
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Test Project');
        expect(response.body).toHaveProperty('apiKey');
        expect(response.body.apiKey).toMatch(/^proj_/);

        projectId = response.body.id;
      });

      it('should reject project creation without auth', async () => {
        await request(app.getHttpServer())
          .post(`/v1/teams/${teamId}/projects`)
          .send({
            name: 'Unauthorized Project',
          })
          .expect(401);
      });

      it('should reject project creation with empty name', async () => {
        await request(app.getHttpServer())
          .post(`/v1/teams/${teamId}/projects`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: '',
          })
          .expect(400);
      });
    });

    describe('GET /v1/teams/:teamId/projects', () => {
      it('should get team projects', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v1/teams/${teamId}/projects`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('apiKey');
      });

      it('should reject request without auth', async () => {
        await request(app.getHttpServer())
          .get(`/v1/teams/${teamId}/projects`)
          .expect(401);
      });
    });

    describe('POST /v1/teams/:teamId/projects/:projectId/rotate-key', () => {
      it('should rotate project API key', async () => {
        // Get current projects
        const beforeRotation = await request(app.getHttpServer())
          .get(`/v1/teams/${teamId}/projects`)
          .set('Authorization', `Bearer ${accessToken}`);

        const project = beforeRotation.body.find(
          (p: { id: string }) => p.id === projectId,
        );

        expect(project).toBeDefined();
        const oldApiKey = project?.apiKey;

        const response = await request(app.getHttpServer())
          .post(`/v1/teams/${teamId}/projects/${projectId}/rotate-key`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('apiKey');
        expect(response.body.apiKey).toMatch(/^proj_/);
        expect(response.body.apiKey).not.toBe(oldApiKey);
      });

      it('should reject key rotation without auth', async () => {
        await request(app.getHttpServer())
          .post(`/v1/teams/${teamId}/projects/${projectId}/rotate-key`)
          .expect(401);
      });
    });
  });
});
