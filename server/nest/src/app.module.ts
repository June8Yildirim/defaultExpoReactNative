import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './auth/auth.module.js';
import configuration, { type AppConfig } from './config/configuration.js';
import { FirebaseModule } from './firebase/firebase.module.js';
import { HealthController } from './health/health.controller.js';
import { InvitationsModule } from './invitations/invitations.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('mongodbUri', { infer: true }),
        serverSelectionTimeoutMS: 5_000,
      }),
    }),
    RedisModule,
    FirebaseModule,
    AuthModule,
    InvitationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
