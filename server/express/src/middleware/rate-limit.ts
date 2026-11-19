import type { RequestHandler } from 'express';
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';

import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { redis } from '../lib/redis.js';

/**
 * Per-IP limit for the auth endpoints, to slow down password guessing. Counters live in Redis so
 * every instance shares them; if Redis is unset or fails, an in-memory limiter takes over.
 * Call after `connectRedis()`.
 */
export function createAuthRateLimit(): RequestHandler {
  const options = {
    keyPrefix: 'rl:auth',
    points: env.AUTH_RATE_LIMIT_POINTS,
    duration: env.AUTH_RATE_LIMIT_WINDOW_SEC,
  };
  const memory = new RateLimiterMemory(options);
  const client = redis();
  const limiter = client
    ? new RateLimiterRedis({ ...options, storeClient: client, insuranceLimiter: memory })
    : memory;

  return async (req, res, next) => {
    try {
      await limiter.consume(req.ip ?? 'unknown');
      next();
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        res.set('Retry-After', String(Math.ceil(err.msBeforeNext / 1000)));
        return next(new HttpError(429, 'Too many requests'));
      }
      next(err);
    }
  };
}
