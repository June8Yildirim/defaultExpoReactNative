import { Redis } from 'ioredis';

import { env } from '../config/env.js';

let client: Redis | null = null;

/** The shared client, or `null` when REDIS_URL isn't set. */
export function redis(): Redis | null {
  return client;
}

export async function connectRedis(url = env.REDIS_URL): Promise<Redis | null> {
  if (!url) {
    console.log('[redis] REDIS_URL not set: caching disabled, rate limits kept in memory');
    return null;
  }
  client = new Redis(url, {
    lazyConnect: true,
    // Fail fast while disconnected so callers fall back instead of queueing.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  client.on('error', (err: Error) => console.error(`[redis] ${err.message}`));
  await client.connect();
  console.log(`[redis] connected to ${client.options.host}:${client.options.port}`);
  return client;
}

export async function disconnectRedis(): Promise<void> {
  await client?.quit();
  client = null;
}

export async function pingRedis(): Promise<void> {
  if (!client) throw new Error('Redis is not configured');
  await client.ping();
}
