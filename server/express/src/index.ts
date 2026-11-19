import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './lib/mongo.js';
import { connectRedis, disconnectRedis } from './lib/redis.js';

await connectMongo();
await connectRedis();

const server = createApp().listen(env.PORT, () => {
  console.log(`[express] listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`[express] ${signal} received, shutting down`);
  server.close();
  await Promise.all([disconnectMongo(), disconnectRedis()]);
  process.exit(0);
}
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
