import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';

const app = createApp();

describe('express app', () => {
  it('reports 503 from /api/health when MongoDB is not connected', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 503);
  });

  it('rejects protected routes without a bearer token', async () => {
    const res = await request(app).get('/api/invitations');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Missing bearer token');
  });

  it('validates login payloads before calling Firebase', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nope' });
    assert.equal(res.status, 400);
  });

  it('rate-limits the auth endpoints per IP', async () => {
    const limited = createApp(); // fresh limiter, default 10 requests per window
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) {
      statuses.push((await request(limited).post('/api/auth/login').send({})).status);
    }
    assert.deepEqual(statuses, Array(10).fill(400));
    const blocked = await request(limited).post('/api/auth/login').send({});
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers['retry-after']) > 0);
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/missing');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Not found' });
  });
});
