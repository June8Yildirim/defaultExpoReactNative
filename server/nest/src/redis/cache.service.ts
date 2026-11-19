import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from './redis.service.js';

/**
 * JSON cache on Redis. Every call is best-effort: when Redis is unset or unreachable, reads fall
 * through to `load()` and writes are skipped, so the cache can never take the API down.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const client = this.redis.client;
    if (client) {
      try {
        const hit = await client.get(key);
        if (hit !== null) return JSON.parse(hit) as T;
      } catch (err) {
        this.logger.warn(`get ${key} failed: ${(err as Error).message}`);
      }
    }
    const value = await load();
    client
      ?.set(key, JSON.stringify(value), 'EX', ttlSeconds)
      .catch((err: Error) => this.logger.warn(`set ${key} failed: ${err.message}`));
    return value;
  }

  async del(...keys: string[]): Promise<void> {
    const client = this.redis.client;
    if (!client || keys.length === 0) return;
    try {
      await client.del(...keys);
    } catch (err) {
      this.logger.warn(`del ${keys.join(', ')} failed: ${(err as Error).message}`);
    }
  }
}
