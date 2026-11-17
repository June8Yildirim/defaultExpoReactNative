import { type AxiosError, create, isAxiosError } from 'axios';

import { emitUnauthorized } from '@/lib/auth/auth-events';
import { clearTokens, loadTokens, saveTokens } from '@/lib/auth/token-storage';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Send without the Authorization header, and never trigger a refresh or sign-out. */
    skipAuth?: boolean;
    /** Internal: set once a request has been replayed after a token refresh. */
    _retried?: boolean;
  }
}

/**
 * Refresh contract: POST { refreshToken } → 200 { accessToken, refreshToken? }.
 * The server doesn't implement this route yet.
 */
export const REFRESH_PATH = '/api/auth/refresh';

/**
 * Shared API client.
 *
 * The `fetch` adapter matters: Expo Router resolves relative URLs such as `/api/...` against
 * the dev server (and the `expo-router` plugin `origin` in production) only through `fetch`,
 * not XMLHttpRequest. Set EXPO_PUBLIC_API_URL to call a different backend.
 */
export const apiClient = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? '',
  adapter: 'fetch',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request that wants auth.
apiClient.interceptors.request.use(async (config) => {
  if (config.skipAuth) return config;
  const tokens = await loadTokens();
  if (tokens) config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  return config;
});

/** Shared between concurrent 401s so only one refresh call is made. */
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens?.refreshToken) return null;
  try {
    const { data } = await apiClient.post<{ accessToken: string; refreshToken?: string }>(
      REFRESH_PATH,
      { refreshToken: tokens.refreshToken },
      { skipAuth: true },
    );
    await saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? tokens.refreshToken,
    });
    return data.accessToken;
  } catch {
    return null;
  }
}

// On 401: refresh once and replay the request; if that fails, sign out.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isUnauthorized(error) || !error.config || error.config.skipAuth) {
      return Promise.reject(error);
    }

    const original = error.config;
    if (!original._retried) {
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const accessToken = await refreshing;
      if (accessToken) {
        original._retried = true;
        return apiClient(original);
      }
    }

    await clearTokens();
    emitUnauthorized();
    return Promise.reject(error);
  },
);

export function isUnauthorized(error: unknown): error is AxiosError {
  return isAxiosError(error) && error.response?.status === 401;
}

/** HTTP status of a failed request, or undefined for network errors and non-axios errors. */
export function errorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}
