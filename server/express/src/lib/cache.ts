import { redis } from './redis.js';

/**
 * JSON cache on Redis. Every call is best-effort: when Redis is unset or unreachable, reads fall
 * through to `load()` and writes are skipped, so the cache can never take the API down.
 */
export const cache = {
  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const client = redis();
    if (client) {
      try {
        const hit = await client.get(key);
        if (hit !== null) return JSON.parse(hit) as T;
      } catch (err) {
        console.warn(`[cache] get ${key} failed: ${(err as Error).message}`);
      }
    }
    const value = await load();
    if (client) {
      client
        .set(key, JSON.stringify(value), 'EX', ttlSeconds)
        .catch((err: Error) => console.warn(`[cache] set ${key} failed: ${err.message}`));
    }
    return value;
  },

  async del(...keys: string[]): Promise<void> {
    const client = redis();
    if (!client || keys.length === 0) return;
    try {
      await client.del(...keys);
    } catch (err) {
      console.warn(`[cache] del ${keys.join(', ')} failed: ${(err as Error).message}`);
    }
  },
};
