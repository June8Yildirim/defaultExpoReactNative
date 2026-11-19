import { type App, applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';

import { env } from '../config/env.js';

/**
 * Firebase Admin is initialized lazily from, in order:
 * 1. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 * 2. Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, gcloud, or GCP runtime)
 * With FIREBASE_AUTH_EMULATOR_HOST set, the Admin SDK talks to the emulator and needs only a
 * project id.
 */
function firebaseApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;

  if (projectId && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  if (env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: projectId ?? 'demo-invitationcardapp' });
  }
  return initializeApp({ credential: applicationDefault(), projectId });
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}
