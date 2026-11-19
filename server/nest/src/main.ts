import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';
import type { AppConfig } from './config/configuration.js';
import { setupApp } from './setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  setupApp(app, {
    corsOrigins: config.get('corsOrigins', { infer: true }),
    trustProxy: config.get('trustProxy', { infer: true }),
  });

  const port = config.get('port', { infer: true });
  await app.listen(port);
  console.log(`[nest] listening on http://localhost:${port}`);
}

void bootstrap();
