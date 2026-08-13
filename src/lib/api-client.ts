import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { createSessionRefresher, csrfHeader, shouldAttemptRefresh } from './auth/refresh-session';

const _sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Extend config type to track 429 retry attempts
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry429?: number;
  /** Đã thử làm mới phiên cho request này chưa — chặn thử đi thử lại vô hạn. */
  _retriedAfterRefresh?: boolean;
}

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

/**
 * Xin access token mới bằng cookie refresh 7 ngày.
 *
 * Gọi bằng `axios` trần chứ KHÔNG qua `apiClient`: đi qua apiClient thì chính request này lại
 * rơi vào interceptor bên dưới, và một lần refresh hỏng sẽ tự gọi lại chính nó.
 *
 * Cập nhật cả `auth_token` trong localStorage vì vài trang (video-library, video-downloader)
 * còn gọi `fetch` thẳng bằng token lấy từ đó, không đi qua apiClient — bỏ qua thì những chỗ ấy
 * vẫn cầm token đã chết.
 */
const sessionRefresher = createSessionRefresher(async () => {
  const { data } = await axios.post(
    `${API_URL}/auth/refresh`,
    null,
    { withCredentials: true, headers: csrfHeader(document.cookie) },
  );

  const token: string | null = data?.access_token ?? null;
  if (token) localStorage.setItem('auth_token', token);
  return token;
});

// Request interceptor - add auth token
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

    // 401: access token sống 15 phút, refresh token sống 7 ngày. Xin token mới rồi gửi lại
    // chính request vừa hỏng — người dùng không thấy gì. Chỉ khi xin không được mới coi là
    // phiên đã chết. Trước đây bỏ hẳn bước này nên cứ đúng 15 phút là văng ra /login giữa lúc
    // đang làm việc, dù phiên còn hiệu lực tới một tuần.
    if (
      typeof window !== 'undefined' &&
      config &&
      shouldAttemptRefresh(error.response?.status, config.url, !!config._retriedAfterRefresh)
    ) {
      config._retriedAfterRefresh = true;

      const token = await sessionRefresher.refresh().catch(() => null);
      if (token) {
        // Gắn lại tay: request interceptor đã chạy từ trước khi có token mới.
        if (config.headers) config.headers.Authorization = `Bearer ${token}`;
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
