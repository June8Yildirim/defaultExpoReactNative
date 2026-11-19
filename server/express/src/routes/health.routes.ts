import { Router } from 'express';

import { pingMongo } from '../lib/mongo.js';
import { pingRedis, redis } from '../lib/redis.js';

export const healthRouter = Router();

async function check(ping: () => Promise<void>): Promise<'ok' | 'error'> {
  try {
    await ping();
    return 'ok';
  } catch {
    return 'error';
  }
}

healthRouter.get('/', async (_req, res) => {
  const mongo = await check(pingMongo);
  const cache = redis() ? await check(pingRedis) : 'disabled';
  // Redis is only a cache and rate-limit store with fallbacks, so it's reported but never fatal.
  const healthy = mongo === 'ok';
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'error', mongo, redis: cache });
});
