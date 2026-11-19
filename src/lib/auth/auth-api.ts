import { apiClient } from '@/lib/api/client';
import type { AuthTokens } from '@/lib/auth/token-storage';

export type Credentials = { email: string; password: string };

/** Returned by the Express and Nest servers in `server/` (Firebase Auth behind the scenes). */
export type AuthResponse = AuthTokens & { expiresIn: number; uid: string };

/**
 * Email/password auth against the backend. Pass the result to `useAuth().signIn(...)`.
 * `skipAuth` keeps a wrong password (401) from triggering a token refresh or sign-out.
 */
export async function loginWithEmail(credentials: Credentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', credentials, {
    skipAuth: true,
  });
  return data;
}

export async function registerWithEmail(credentials: Credentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/register', credentials, {
    skipAuth: true,
  });
  return data;
}
