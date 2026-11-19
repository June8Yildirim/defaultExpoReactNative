export interface AppConfig {
  port: number;
  corsOrigins: string[];
  mongodbUri: string;
  /** Optional. Unset: no caching, and rate limits are kept in memory (per process). */
  redisUrl?: string;
  /** Auth requests (register/login/refresh) allowed per client IP per window. */
  authRateLimit: { points: number; windowSec: number };
  /** Proxy hops in front of the app (1 on Cloud Run / behind a load balancer). */
  trustProxy: number;
  firebase: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    webApiKey?: string;
    authEmulatorHost?: string;
  };
}

export default (): AppConfig => ({
  port: Number(process.env.PORT ?? 4001),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:8081').split(',').map((o) => o.trim()),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/invitationcardapp',
  redisUrl: process.env.REDIS_URL || undefined,
  authRateLimit: {
    points: Number(process.env.AUTH_RATE_LIMIT_POINTS ?? 10),
    windowSec: Number(process.env.AUTH_RATE_LIMIT_WINDOW_SEC ?? 60),
  },
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || undefined,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || undefined,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || undefined,
    webApiKey: process.env.FIREBASE_WEB_API_KEY || undefined,
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST || undefined,
  },
});
