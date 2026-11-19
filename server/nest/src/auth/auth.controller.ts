import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';

import { CurrentUser } from '../firebase/current-user.decorator.js';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { CredentialsDto, RefreshDto } from './dto/credentials.dto.js';
import { FirebaseAuthRestService } from './firebase-auth-rest.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly firebaseAuth: FirebaseAuthRestService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  register(@Body() { email, password }: CredentialsDto) {
    return this.firebaseAuth.signUp(email, password);
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(200)
  login(@Body() { email, password }: CredentialsDto) {
    return this.firebaseAuth.signIn(email, password);
  }

  /** Contract used by the app's apiClient: POST { refreshToken } → { accessToken, refreshToken? }. */
  @Post('refresh')
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(200)
  refresh(@Body() { refreshToken }: RefreshDto) {
    return this.firebaseAuth.refresh(refreshToken);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  me(@CurrentUser() user: DecodedIdToken) {
    const { uid, email, email_verified: emailVerified, name, picture } = user;
    return { uid, email, emailVerified, name, picture };
  }
}
