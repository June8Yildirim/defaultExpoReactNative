import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import type { AppConfig } from '../config/configuration.js';

/** Owns the shared Redis connection. `client` is `null` when REDIS_URL isn't set. */
@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('Redis');
  readonly client: Redis | null;

  constructor(config: ConfigService<AppConfig, true>) {
    const url = config.get('redisUrl', { infer: true });
    this.client = url
      ? new Redis(url, {
          lazyConnect: true,
          // Fail fast while disconnected so callers fall back instead of queueing.
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        })
      : null;
    this.client?.on('error', (err: Error) => this.logger.error(err.message));
  }

  async onModuleInit() {
    if (!this.client) {
      this.logger.log('REDIS_URL not set: caching disabled, rate limits kept in memory');
      return;
    }
    await this.client.connect();
    this.logger.log(`connected to ${this.client.options.host}:${this.client.options.port}`);
  }

  async onApplicationShutdown() {
    await this.client?.quit();
  }
}
