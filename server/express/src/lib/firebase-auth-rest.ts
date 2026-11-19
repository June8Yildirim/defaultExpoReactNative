import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

/**
 * Email/password sign-in and token refresh through the Firebase Auth REST API, so the mobile app
 * can keep its own token storage and refresh flow without bundling the Firebase client SDK.
 * https://firebase.google.com/docs/reference/rest/auth
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  uid: string;
}

function baseUrl(host: string): string {
  return env.FIREBASE_AUTH_EMULATOR_HOST
    ? `http://${env.FIREBASE_AUTH_EMULATOR_HOST}/${host}`
    : `https://${host}`;
}

function apiKey(): string {
  if (env.FIREBASE_WEB_API_KEY) return env.FIREBASE_WEB_API_KEY;
  if (env.FIREBASE_AUTH_EMULATOR_HOST) return 'emulator';
  throw new HttpError(500, 'FIREBASE_WEB_API_KEY is not configured');
}

/** Firebase error codes that are the caller's fault, mapped to an HTTP status. */
const CLIENT_ERRORS: Record<string, number> = {
  EMAIL_EXISTS: 409,
  EMAIL_NOT_FOUND: 401,
  INVALID_PASSWORD: 401,
  INVALID_LOGIN_CREDENTIALS: 401,
  USER_DISABLED: 403,
  INVALID_EMAIL: 400,
  WEAK_PASSWORD: 400,
  MISSING_PASSWORD: 400,
  TOO_MANY_ATTEMPTS_TRY_LATER: 429,
  TOKEN_EXPIRED: 401,
  INVALID_REFRESH_TOKEN: 401,
  USER_NOT_FOUND: 401,
};

async function post<T>(url: string, body: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new HttpError(503, 'Auth service unavailable');
  }
  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  } & T;
  if (!response.ok) {
    // Messages look like "WEAK_PASSWORD : Password should be at least 6 characters".
    const message = data.error?.message ?? 'AUTH_ERROR';
    const code = message.split(' ')[0];
    throw new HttpError(CLIENT_ERRORS[code] ?? 502, code);
  }
  return data;
}

interface IdentityResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

async function identity(
  endpoint: 'signUp' | 'signInWithPassword',
  email: string,
  password: string,
): Promise<AuthTokens> {
  const data = await post<IdentityResponse>(
    `${baseUrl('identitytoolkit.googleapis.com')}/v1/accounts:${endpoint}?key=${apiKey()}`,
    { email, password, returnSecureToken: true },
  );
  return {
    accessToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: Number(data.expiresIn),
    uid: data.localId,
  };
}

export const signUp = (email: string, password: string) => identity('signUp', email, password);
export const signIn = (email: string, password: string) =>
  identity('signInWithPassword', email, password);

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const data = await post<{
    id_token: string;
    refresh_token: string;
    expires_in: string;
    user_id: string;
  }>(`${baseUrl('securetoken.googleapis.com')}/v1/token?key=${apiKey()}`, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return {
    accessToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in),
    uid: data.user_id,
  };
}
