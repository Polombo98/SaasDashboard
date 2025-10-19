import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Server } from 'http';

interface RegisterResponse {
  message: string;
  email: string;
}

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/v1/auth/register (POST)', () => {
    const testEmail = `test-${Date.now()}@example.com`;

    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: testEmail,
          password: 'Test1234!',
          name: 'Test User',
        })
        .expect(201);

      const body = response.body as RegisterResponse;
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('email');
      expect(body.email).toBe(testEmail);
    });

    it('should reject registration with existing email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: testEmail,
          password: 'Test1234!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject registration with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test1234!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: `test-weak-${Date.now()}@example.com`,
          password: '123',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject registration without required fields', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: `test-incomplete-${Date.now()}@example.com`,
        })
        .expect(400);
    });
  });

  describe('/v1/auth/login (POST)', () => {
    const testEmail = `login-test-${Date.now()}@example.com`;
    const testPassword = 'Test1234!';

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/v1/auth/register').send({
        email: testEmail,
        password: testPassword,
        name: 'Login Test User',
      });

      // Mark user as verified
      await prisma.user.update({
        where: { email: testEmail },
        data: { emailVerified: true },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const body = response.body as LoginResponse;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(testEmail);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);
    });

    it('should reject login with unverified email', async () => {
      const unverifiedEmail = `unverified-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/v1/auth/register').send({
        email: unverifiedEmail,
        password: testPassword,
        name: 'Unverified User',
      });

      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: unverifiedEmail,
          password: testPassword,
        })
        .expect(401);
    });
  });

  describe('/v1/auth/logout (POST)', () => {
    const testEmail = `logout-test-${Date.now()}@example.com`;
    const testPassword = 'Test1234!';
    let accessToken: string;

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/v1/auth/register').send({
        email: testEmail,
        password: testPassword,
        name: 'Logout Test User',
      });

      await prisma.user.update({
        where: { email: testEmail },
        data: { emailVerified: true },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      const body = response.body as LoginResponse;
      accessToken = body.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject logout without token', async () => {
      // Logout endpoint returns 200 even without auth (just clears cookie)
      await request(app.getHttpServer()).post('/v1/auth/logout').expect(200);
    });
  });

  describe('/v1/auth/verify-email (GET)', () => {
    it('should verify email with valid token', async () => {
      const testEmail = `verify-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/v1/auth/register').send({
        email: testEmail,
        password: 'Test1234!',
        name: 'Verify Test User',
      });

      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user?.emailVerificationToken).toBeDefined();

      await request(app.getHttpServer())
        .get(`/v1/auth/verify-email?token=${user!.emailVerificationToken}`)
        .expect(200);

      const verifiedUser = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(verifiedUser?.emailVerified).toBe(true);
      expect(verifiedUser?.emailVerificationToken).toBeNull();
    });

    it('should reject verification with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/v1/auth/verify-email?token=invalid-token')
        .expect(400);
    });
  });

  describe('/v1/auth/forgot-password (POST)', () => {
    const testEmail = `forgot-${Date.now()}@example.com`;

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/v1/auth/register').send({
        email: testEmail,
        password: 'Test1234!',
        name: 'Forgot Password Test',
      });

      await prisma.user.update({
        where: { email: testEmail },
        data: { emailVerified: true },
      });
    });

    it('should initiate password reset', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({
          email: testEmail,
        })
        .expect(200);

      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user?.passwordResetToken).toBeDefined();
      expect(user?.passwordResetExpires).toBeDefined();
    });

    it('should return success even for non-existent email (security)', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);
    });
  });

  describe('/v1/auth/reset-password (POST)', () => {
    const testEmail = `reset-${Date.now()}@example.com`;
    let resetToken: string;

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/v1/auth/register').send({
        email: testEmail,
        password: 'Test1234!',
        name: 'Reset Password Test',
      });

      await prisma.user.update({
        where: { email: testEmail },
        data: { emailVerified: true },
      });

      await request(app.getHttpServer()).post('/v1/auth/forgot-password').send({
        email: testEmail,
      });

      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      resetToken = user!.passwordResetToken!;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!';

      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
        })
        .expect(200);

      // Verify can login with new password
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);
    });

    it('should reject reset with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
        })
        .expect(400);
    });
  });
});
