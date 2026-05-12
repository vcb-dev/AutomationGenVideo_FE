import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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

function getDedupeKey(config: InternalAxiosRequestConfig): string | null {
  if (config.method?.toUpperCase() !== 'GET') return null;
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${config.url}::${params}`;
}

// Request interceptor - add auth token + attach dedupe key
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        if (!error.config?.url?.includes('/auth/login')) {
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
