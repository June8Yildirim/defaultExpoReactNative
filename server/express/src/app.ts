import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { invitationsRouter } from './routes/invitations.routes.js';

/**
 * Builds the app without connecting to anything, so tests can import it directly. In production,
 * call it after `connectRedis()` so the auth rate limit uses Redis.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '1mb' }));

  // Same paths as the Expo API routes, so the app only needs EXPO_PUBLIC_API_URL changed.
  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter());
  app.use('/api/invitations', invitationsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
