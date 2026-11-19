import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:8081'),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/invitationcardapp'),
  /** Optional. Unset: no caching, and rate limits are kept in memory (per process). */
  REDIS_URL: z.string().optional(),
  /** Auth requests (register/login/refresh) allowed per client IP per window. */
  AUTH_RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  /** Proxy hops in front of the app (1 on Cloud Run / behind a load balancer), so req.ip is the client's. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_WEB_API_KEY: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const env = load();
