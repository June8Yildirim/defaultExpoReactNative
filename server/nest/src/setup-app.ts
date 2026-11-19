import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import { HttpExceptionFilter } from './common/http-exception.filter.js';

export interface SetupOptions {
  corsOrigins: string[];
  /** Proxy hops in front of the app, so `request.ip` (used by rate limiting) is the client's. */
  trustProxy?: number;
}

/** Shared by main.ts and the e2e tests so both run the same pipeline. */
export function setupApp(
  app: NestExpressApplication,
  { corsOrigins, trustProxy = 0 }: SetupOptions,
) {
  // Same paths as the Expo API routes, so the app only needs EXPO_PUBLIC_API_URL changed.
  app.setGlobalPrefix('api');
  app.set('trust proxy', trustProxy);
  app.use(helmet());
  app.enableCors({ origin: corsOrigins });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
