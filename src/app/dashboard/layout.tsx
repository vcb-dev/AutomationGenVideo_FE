'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Header from '@/components/layout/Header';
import { BackgroundTaskManager } from '@/components/social/BackgroundTaskManager';
import { fetchWithAuth } from '@/lib/api-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore(s => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    logout: s.logout,
  }));
  const [isHydrated, setIsHydrated] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return !!useAuthStore.getState().user; } catch { return false; }
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [allowedMenuIds, setAllowedMenuIds] = useState<string[]>([]);

  useEffect(() => {
    setIsHydrated(true);
    router.prefetch('/');
  }, [router]);

  useEffect(() => {
    if (!isHydrated || isLoggingOut) return;
    if (!user && !isAuthenticated && !useAuthStore.getState().isLoading) {
      useAuthStore.getState().loadUser().then(() => {
        if (!useAuthStore.getState().isAuthenticated) {
          router.push('/');
        }
      }).catch(() => {
        router.push('/');
      });
    }
  }, [isHydrated, isAuthenticated, user, router, isLoggingOut]);

  useEffect(() => {
    const CACHE_KEY = 'perm_menu_ids';
    const CACHE_TTL = 5 * 60 * 1000;

    const fetchPermissions = async () => {
      if (!user) return;

      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) {
            setAllowedMenuIds(data);
            return;
          }
        }
      } catch { /* ignore */ }

      try {
        // Phải có giá trị mặc định giống api-client.ts. Thiếu nó thì khi .env trống, chuỗi
        // thành "undefined/role-permissions/my-tabs" và trình duyệt ghép vào đường dẫn hiện
        // tại — mọi trang dashboard đều ăn một lỗi 404 vô hình.
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetchWithAuth(`${apiBase}/role-permissions/my-tabs`);
        if (response.ok) {
          const data = await response.json();
          setAllowedMenuIds(data);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('Failed to fetch header permissions', err);
      }
    };
    fetchPermissions();
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { sessionStorage.removeItem('perm_menu_ids'); } catch { /* ignore */ }
    await logout();
    router.replace('/');
  };

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        user={user}
        onLogout={handleLogout}
        allowedMenuIds={allowedMenuIds}
      />

      <main className="flex-1 p-6">
        {children}
      </main>
      <BackgroundTaskManager />
    </div>
  );
}
