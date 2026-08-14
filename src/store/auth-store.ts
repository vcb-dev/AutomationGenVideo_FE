import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient, { sessionRefresher } from '../lib/api-client';
import type { User, LoginRequest, AuthResponse } from '../types/auth';

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

/** Token không giải mã được — rác thật sự, không cứu được bằng refresh. */
const isTokenMalformed = (token: string): boolean => decodeJwtPayload(token) === null;

const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return Date.now() >= payload.exp * 1000;
};

let _loadUserPromise: Promise<void> | null = null;

// Chỉ dọn ngay ở đây khi token là rác không giải mã được. Access token hết hạn (đúng access
// token 15 phút) KHÔNG được xoá ở bước này — loadUser() bên dưới sẽ thử làm mới bằng refresh
// token (cookie 7 ngày) trước khi coi phiên là chết. Xoá sớm ở đây là lỗi cũ: F5/mở tab mới sau
// mốc 15 phút là mất token trước khi loadUser() kịp thử refresh, kết quả bị đá thẳng về trang chủ.
if (typeof window !== 'undefined') {
  try {
    const existingToken = localStorage.getItem('auth_token');
    if (existingToken && isTokenMalformed(existingToken)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth-storage');
    }
  } catch {
    // Ignore storage access errors
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        const MAX_RETRIES = 2;
        set({ isLoading: true, error: null });

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
            const { access_token, user } = response.data;

            localStorage.setItem('auth_token', access_token);
            localStorage.setItem('auth_user', JSON.stringify(user));

            set({
              user,
              token: access_token,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          } catch (error: unknown) {
            const axiosError = error as { code?: string; response?: { data?: { message?: string | string[] } } };
            const isNetworkOrTimeout =
              axiosError.code === 'ECONNABORTED' ||
              axiosError.code === 'ERR_NETWORK' ||
              !axiosError.response;

            if (isNetworkOrTimeout && attempt < MAX_RETRIES) {
              await new Promise(r => setTimeout(r, 1000 * attempt));
              continue;
            }

            let errorMessage = axiosError.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
            if (Array.isArray(errorMessage)) {
              errorMessage = errorMessage.join(', ');
            }
            set({ error: errorMessage as string, isLoading: false });
            throw error;
          }
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      loadUser: async () => {
        if (_loadUserPromise) return _loadUserPromise;
        _loadUserPromise = (async () => {
          try {
            const token = localStorage.getItem('auth_token');

            if (!token) {
              set({ isAuthenticated: false, user: null, token: null });
              return;
            }

            set({ isLoading: true });

            // Access token hết hạn (đúng mốc 15 phút) không có nghĩa phiên đã chết — refresh
            // token (cookie vcbi_rt) còn sống tới 7 ngày. Thử làm mới trước, chỉ đăng xuất thật
            // khi refresh cũng thất bại (refresh token cũng hết hạn/bị thu hồi).
            if (isTokenExpired(token)) {
              const refreshed = await sessionRefresher.refresh().catch(() => null);
              if (!refreshed) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                set({
                  user: null,
                  token: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
                return;
              }
              // sessionRefresher đã ghi token mới vào localStorage — apiClient bên dưới tự đọc
              // lại qua request interceptor, không cần truyền tay.
            }

            const response = await apiClient.get<User>('/auth/profile');
            const user = response.data;

            // Đọc lại từ localStorage: nếu vừa refresh ở trên, `token` (biến đầu hàm) vẫn là
            // access token cũ đã hết hạn — state phải giữ token MỚI mà sessionRefresher đã ghi.
            const latestToken = localStorage.getItem('auth_token');

            set({
              user,
              token: latestToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch {
            // Token invalid or expired
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');

            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          } finally {
            _loadUserPromise = null;
          }
        })();
        return _loadUserPromise;
      },

      clearError: () => set({ error: null }),

      setUser: (user: User) => {
        set({ user });
        localStorage.setItem('auth_user', JSON.stringify(user));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        // Do not persist isAuthenticated; derive it from a valid token + profile
      }),
      // Ngăn Zustand gọi setState trong lúc React đang hydrate (gây hydration mismatch).
      // Rehydrate thủ công trong AuthHydration component sau khi React hydrate xong.
      skipHydration: true,
    }
  )
);
