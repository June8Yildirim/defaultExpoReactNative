import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Response } from 'express';
import type { Connection } from 'mongoose';

import { RedisService } from '../redis/redis.service.js';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const mongo = await this.ping(async () => {
      if (this.connection.readyState !== 1 || !this.connection.db) throw new Error();
      await this.connection.db.admin().ping();
    });
    const client = this.redis.client;
    const redis = client ? await this.ping(() => client.ping()) : 'disabled';

    // Redis is only a cache and rate-limit store with fallbacks, so it's reported but never fatal.
    const healthy = mongo === 'ok';
    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: healthy ? 'ok' : 'error', mongo, redis };
  }

  private async ping(fn: () => Promise<unknown>): Promise<'ok' | 'error'> {
    try {
      await fn();
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
