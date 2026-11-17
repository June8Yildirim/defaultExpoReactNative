import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { apiClient, REFRESH_PATH } from '@/lib/api/client';
import { onUnauthorized } from '@/lib/auth/auth-events';
import { loadTokens, resetTokenCache, saveTokens } from '@/lib/auth/token-storage';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void mockStore.set(key, value),
  deleteItemAsync: async (key: string) => void mockStore.delete(key),
}));

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data?: unknown };

/** Replaces the network with `handler`, rejecting non-2xx like real adapters do. */
function mockServer(handler: Handler) {
  const calls: InternalAxiosRequestConfig[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    const { status, data = {} } = handler(config);
    const response: AxiosResponse = { status, data, statusText: '', headers: {}, config };
    if (status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response);
    }
    return response;
  };
  return calls;
}

const auth = (config: InternalAxiosRequestConfig) => config.headers.get('Authorization');

beforeEach(() => {
  mockStore.clear();
  resetTokenCache();
});

it('attaches the bearer token', async () => {
  await saveTokens({ accessToken: 'abc' });
  const calls = mockServer(() => ({ status: 200 }));

  await apiClient.get('/api/me');

  expect(auth(calls[0])).toBe('Bearer abc');
});

it('sends no token when skipAuth is set or nobody is signed in', async () => {
  const calls = mockServer(() => ({ status: 200 }));

  await apiClient.get('/api/public');
  await saveTokens({ accessToken: 'abc' });
  await apiClient.get('/api/public', { skipAuth: true });

  expect(auth(calls[0])).toBeFalsy();
  expect(auth(calls[1])).toBeFalsy();
});

it('refreshes on 401 and replays the request with the new token', async () => {
  await saveTokens({ accessToken: 'old', refreshToken: 'r1' });
  const calls = mockServer((config) => {
    if (config.url === REFRESH_PATH) return { status: 200, data: { accessToken: 'new' } };
    return auth(config) === 'Bearer new' ? { status: 200, data: 'ok' } : { status: 401 };
  });

  const { data } = await apiClient.get('/api/me');

  expect(data).toBe('ok');
  expect(calls.map((c) => c.url)).toEqual(['/api/me', REFRESH_PATH, '/api/me']);
  expect(await loadTokens()).toEqual({ accessToken: 'new', refreshToken: 'r1' });
});

it('makes a single refresh call for concurrent 401s', async () => {
  await saveTokens({ accessToken: 'old', refreshToken: 'r1' });
  const calls = mockServer((config) => {
    if (config.url === REFRESH_PATH) return { status: 200, data: { accessToken: 'new' } };
    return auth(config) === 'Bearer new' ? { status: 200 } : { status: 401 };
  });

  await Promise.all([apiClient.get('/api/a'), apiClient.get('/api/b'), apiClient.get('/api/c')]);

  expect(calls.filter((c) => c.url === REFRESH_PATH)).toHaveLength(1);
});

it('signs out when the refresh fails', async () => {
  await saveTokens({ accessToken: 'old', refreshToken: 'expired' });
  mockServer(() => ({ status: 401 }));
  const listener = jest.fn();
  const unsubscribe = onUnauthorized(listener);

  await expect(apiClient.get('/api/me')).rejects.toMatchObject({ response: { status: 401 } });

  expect(listener).toHaveBeenCalledTimes(1);
  expect(await loadTokens()).toBeNull();
  expect(mockStore.size).toBe(0);
  unsubscribe();
});

it('signs out straight away when there is no refresh token', async () => {
  await saveTokens({ accessToken: 'old' });
  const calls = mockServer(() => ({ status: 401 }));
  const listener = jest.fn();
  const unsubscribe = onUnauthorized(listener);

  await expect(apiClient.get('/api/me')).rejects.toBeDefined();

  expect(calls).toHaveLength(1);
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
});

it('does not sign out for a 401 on a skipAuth request', async () => {
  await saveTokens({ accessToken: 'abc', refreshToken: 'r1' });
  mockServer(() => ({ status: 401 }));
  const listener = jest.fn();
  const unsubscribe = onUnauthorized(listener);

  await expect(apiClient.get('/api/login', { skipAuth: true })).rejects.toBeDefined();

  expect(listener).not.toHaveBeenCalled();
  expect(await loadTokens()).toEqual({ accessToken: 'abc', refreshToken: 'r1' });
  unsubscribe();
});
