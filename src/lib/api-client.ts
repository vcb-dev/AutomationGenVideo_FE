import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const _sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Extend config type to track 429 retry attempts
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry429?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const CSRF_COOKIE = 'vcbi_csrf';
const CSRF_HEADER = 'x-csrf-token';
const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${name}=`;
  const raw = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  if (!raw) return undefined;
  return decodeURIComponent(raw.slice(prefix.length));
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // Tăng lên 3 phút để tránh timeout khi đăng Instagram Reels
});

// In-flight GET request deduplication: prevents multiple identical simultaneous GET calls.
// Key = method + url + serialized params. Value = the shared Promise.
const _inFlight = new Map<string, Promise<any>>();

// Request interceptor - Bearer (nếu còn) + CSRF double-submit cho POST/PUT/PATCH/DELETE
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const method = (config.method || 'get').toLowerCase();
      if (MUTATING.has(method) && config.headers) {
        const csrf = readCookie(CSRF_COOKIE);
        if (csrf) config.headers[CSRF_HEADER] = csrf;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - 429 auto-retry + 401 redirect
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;

    // 429 Too Many Requests: wait then retry (max 3 times)
    if (error.response?.status === 429 && config) {
      config._retry429 = (config._retry429 ?? 0) + 1;
      if (config._retry429 <= 3) {
        const retryAfterSec = parseInt(
          (error.response.headers as Record<string, string>)['retry-after'] ?? '5',
          10,
        );
        await _sleep(Math.max(retryAfterSec * 1000, 2000));
        return apiClient(config);
      }
    }

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        if (!config?.url?.includes('/auth/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Deduplicated GET: if an identical GET is already in-flight, returns the same Promise
 * instead of firing a second request to the server.
 */
export function dedupedGet<T = any>(url: string, params?: Record<string, any>): Promise<T> {
  const key = `${url}::${params ? JSON.stringify(params) : ''}`;
  const existing = _inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const req = apiClient.get<T>(url, { params }).then((r) => {
    _inFlight.delete(key);
    return r.data;
  }).catch((e) => {
    _inFlight.delete(key);
    throw e;
  });

  _inFlight.set(key, req);
  return req;
}

export default apiClient;
