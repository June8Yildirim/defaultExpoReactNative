import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  type RateLimiterAbstract,
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
} from 'rate-limiter-flexible';

import type { AppConfig } from '../config/configuration.js';
import { RedisService } from '../redis/redis.service.js';

/**
 * Per-IP limit for the auth endpoints, to slow down password guessing. Counters live in Redis so
 * every instance shares them; if Redis is unset or fails, an in-memory limiter takes over.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly limiter: RateLimiterAbstract;

  constructor(config: ConfigService<AppConfig, true>, redis: RedisService) {
    const { points, windowSec } = config.get('authRateLimit', { infer: true });
    const options = { keyPrefix: 'rl:auth', points, duration: windowSec };
    const memory = new RateLimiterMemory(options);
    this.limiter = redis.client
      ? new RateLimiterRedis({ ...options, storeClient: redis.client, insuranceLimiter: memory })
      : memory;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    try {
      await this.limiter.consume(request.ip ?? 'unknown');
      return true;
    } catch (err) {
      if (!(err instanceof RateLimiterRes)) throw err;
      http.getResponse<Response>().setHeader('Retry-After', Math.ceil(err.msBeforeNext / 1000));
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
