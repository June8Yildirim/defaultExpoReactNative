import { vi } from 'vitest';
import { ConfigModule } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuthRateLimitGuard } from '../src/auth/auth-rate-limit.guard.js';
import { AuthController } from '../src/auth/auth.controller.js';
import { FirebaseAuthRestService } from '../src/auth/firebase-auth-rest.service.js';
import { FIREBASE_AUTH } from '../src/firebase/firebase.tokens.js';
import { FirebaseAuthGuard } from '../src/firebase/firebase-auth.guard.js';
import { HealthController } from '../src/health/health.controller.js';
import { RedisService } from '../src/redis/redis.service.js';
import { setupApp } from '../src/setup-app.js';

/** Boots the HTTP pipeline with Firebase, MongoDB and Redis stubbed out — no network needed. */
describe('nest app (e2e)', () => {
  let app: NestExpressApplication;
  const verifyIdToken = vi.fn();
  const signIn = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [() => ({ authRateLimit: { points: 5, windowSec: 60 } })],
        }),
      ],
      controllers: [AuthController, HealthController],
      providers: [
        FirebaseAuthGuard,
        AuthRateLimitGuard,
        { provide: RedisService, useValue: { client: null } },
        { provide: FIREBASE_AUTH, useValue: { verifyIdToken } },
        { provide: FirebaseAuthRestService, useValue: { signIn } },
        { provide: getConnectionToken(), useValue: { readyState: 0 } },
      ],
    }).compile();
    app = setupApp(moduleRef.createNestApplication<NestExpressApplication>(), {
      corsOrigins: ['http://localhost:8081'],
    });
    await app.init();
  });

  afterAll(() => app.close());

  it('reports 503 from /api/health when MongoDB is not connected', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(503);
    expect(res.body).toEqual({ status: 'error', mongo: 'error', redis: 'disabled' });
  });

  it('rejects /api/auth/me without a bearer token', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    expect(res.body).toEqual({ error: 'Missing bearer token' });
  });

  it('returns the verified user from /api/auth/me', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.co', email_verified: true });
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer good')
      .expect(200);
    expect(res.body).toEqual({ uid: 'u1', email: 'a@b.co', emailVerified: true });
    expect(verifyIdToken).toHaveBeenCalledWith('good');
  });

  it('validates login payloads before calling Firebase', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'nope' }).expect(400);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials', async () => {
    signIn.mockResolvedValueOnce({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 3600,
      uid: 'u1',
    });
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'secret1' })
      .expect(200, { accessToken: 'a', refreshToken: 'r', expiresIn: 3600, uid: 'u1' });
  });

  it('rate-limits the auth endpoints per IP', async () => {
    // Two login requests above already used 2 of the 5 points.
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post('/api/auth/login').send({}).expect(400);
    }
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({}).expect(429);
    expect(res.body).toEqual({ error: 'Too many requests' });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});
