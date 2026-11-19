import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type App, applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import type { AppConfig } from '../config/configuration.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';
import { FIREBASE_APP, FIREBASE_AUTH } from './firebase.tokens.js';

export { FIREBASE_APP, FIREBASE_AUTH };

/**
 * Credentials, in order: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY,
 * then the Auth emulator (project id only), then Application Default Credentials.
 */
function createFirebaseApp(config: AppConfig['firebase']): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const { projectId, clientEmail, privateKey, authEmulatorHost } = config;
  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  if (authEmulatorHost) {
    return initializeApp({ projectId: projectId ?? 'demo-invitationcardapp' });
  }
  return initializeApp({ credential: applicationDefault(), projectId });
}

@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_APP,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        createFirebaseApp(config.get('firebase', { infer: true })),
    },
    {
      provide: FIREBASE_AUTH,
      inject: [FIREBASE_APP],
      useFactory: (app: App) => getAuth(app),
    },
    FirebaseAuthGuard,
  ],
  exports: [FIREBASE_APP, FIREBASE_AUTH, FirebaseAuthGuard],
})
export class FirebaseModule {}
