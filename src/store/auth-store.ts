import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient from '../lib/api-client';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';

const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));

    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }

    const expiresAtMs = payload.exp * 1000;
    return Date.now() >= expiresAtMs;
  } catch {
    return true;
  }
};

// Ensure local auth storage is cleared when it is no longer valid.
if (typeof window !== 'undefined') {
  try {
    const existingToken = localStorage.getItem('auth_token');
    if (existingToken && isTokenExpired(existingToken)) {
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
  register: (data: RegisterRequest) => Promise<void>;
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
          } catch (error: any) {
            const isNetworkOrTimeout =
              error.code === 'ECONNABORTED' ||
              error.code === 'ERR_NETWORK' ||
              !error.response;

            if (isNetworkOrTimeout && attempt < MAX_RETRIES) {
              await new Promise(r => setTimeout(r, 1000 * attempt));
              continue;
            }

            let errorMessage = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
            if (Array.isArray(errorMessage)) {
              errorMessage = errorMessage.join(', ');
            }
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        }
      },

      register: async (data: RegisterRequest) => {
        try {
          set({ isLoading: true, error: null });

          const response = await apiClient.post<AuthResponse>('/auth/register', data);
          const { access_token, user } = response.data;

          // Save to localStorage
          localStorage.setItem('auth_token', access_token);
          localStorage.setItem('auth_user', JSON.stringify(user));

          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          let errorMessage = error.response?.data?.message || 'Registration failed';
          if (Array.isArray(errorMessage)) {
            errorMessage = errorMessage.join(', ');
          }
          set({ error: errorMessage, isLoading: false });
          throw error;
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
        try {
          const token = localStorage.getItem('auth_token');

          if (!token) {
            set({ isAuthenticated: false, user: null, token: null });
            return;
          }

          // Check token expiry on client to avoid showing stale sessions
          if (isTokenExpired(token)) {
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

          set({ isLoading: true });

          const response = await apiClient.get<User>('/auth/profile');
          const user = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
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
