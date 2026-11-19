import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  uid: string;
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

/**
 * Email/password sign-in and token refresh through the Firebase Auth REST API, so the mobile app
 * keeps its own token storage and refresh flow without bundling the Firebase client SDK.
 * https://firebase.google.com/docs/reference/rest/auth
 */
@Injectable()
export class FirebaseAuthRestService {
  private readonly firebase: AppConfig['firebase'];

  constructor(config: ConfigService<AppConfig, true>) {
    this.firebase = config.get('firebase', { infer: true });
  }

  signUp(email: string, password: string) {
    return this.identity('signUp', email, password);
  }

  signIn(email: string, password: string) {
    return this.identity('signInWithPassword', email, password);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const data = await this.post<{
      id_token: string;
      refresh_token: string;
      expires_in: string;
      user_id: string;
    }>(`${this.baseUrl('securetoken.googleapis.com')}/v1/token?key=${this.apiKey()}`, {
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

  private async identity(
    endpoint: 'signUp' | 'signInWithPassword',
    email: string,
    password: string,
  ): Promise<AuthTokens> {
    const data = await this.post<{
      idToken: string;
      refreshToken: string;
      expiresIn: string;
      localId: string;
    }>(
      `${this.baseUrl('identitytoolkit.googleapis.com')}/v1/accounts:${endpoint}?key=${this.apiKey()}`,
      { email, password, returnSecureToken: true },
    );
    return {
      accessToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: Number(data.expiresIn),
      uid: data.localId,
    };
  }

  private baseUrl(host: string): string {
    const emulator = this.firebase.authEmulatorHost;
    return emulator ? `http://${emulator}/${host}` : `https://${host}`;
  }

  private apiKey(): string {
    if (this.firebase.webApiKey) return this.firebase.webApiKey;
    if (this.firebase.authEmulatorHost) return 'emulator';
    throw new InternalServerErrorException('FIREBASE_WEB_API_KEY is not configured');
  }

  private async post<T>(url: string, body: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ServiceUnavailableException('Auth service unavailable');
    }
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } } & T;
    if (!response.ok) {
      // Messages look like "WEAK_PASSWORD : Password should be at least 6 characters".
      const code = (data.error?.message ?? 'AUTH_ERROR').split(' ')[0];
      throw new HttpException(code, CLIENT_ERRORS[code] ?? 502);
    }
    return data;
  }
}
