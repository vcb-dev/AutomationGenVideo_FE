import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient from '../lib/api-client';
import type { User, LoginRequest, AuthResponse } from '../types/auth';

let _loadUserPromise: Promise<void> | null = null;

// Dọn dẹp các key token cũ trong localStorage nếu còn sót lại từ phiên bản trước
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
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
  logout: () => Promise<void>;
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
            const { user } = response.data;

            set({
              user,
              token: 'valid',
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

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch {
          // 403 CSRF / mạng: vẫn xóa state local; cookie chỉ mất khi BE trả 200 + Set-Cookie xoá
        }
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
            set({ isLoading: true });

            // apiClient tự động gửi cookie vcbi_at và tự động refresh bằng vcbi_rt nếu 401
            const response = await apiClient.get<User>('/auth/profile');
            const user = response.data;

            set({
              user,
              token: 'valid',
              isAuthenticated: true,
              isLoading: false,
            });
          } catch {
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
        set({ user, token: user ? 'valid' : null, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: !!state.user,
        token: state.user ? 'valid' : null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.isAuthenticated = true;
          state.token = 'valid';
        }
      },
      // Ngăn Zustand gọi setState trong lúc React đang hydrate (gây hydration mismatch).
      // Rehydrate thủ công trong AuthHydration component sau khi React hydrate xong.
      skipHydration: true,
    }
  )
);
