import { Module } from '@nestjs/common';

import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { AuthController } from './auth.controller.js';
import { FirebaseAuthRestService } from './firebase-auth-rest.service.js';

@Module({
  controllers: [AuthController],
  providers: [FirebaseAuthRestService, AuthRateLimitGuard],
})
export class AuthModule {}
