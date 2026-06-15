'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Header from '@/components/layout/Header';
import { BackgroundTaskManager } from '@/components/social/BackgroundTaskManager';
import { SocialLanguageProvider } from '@/contexts/SocialLanguageContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout, token } = useAuthStore(s => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    logout: s.logout,
    token: s.token,
  }));
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [allowedMenuIds, setAllowedMenuIds] = useState<string[]>([]);

  useEffect(() => {
    setIsHydrated(true);
    router.prefetch('/');
  }, [router]);

  useEffect(() => {
    if (!isHydrated || isAuthenticated || user || isLoggingOut) return;
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
      router.push('/');
    } else if (!useAuthStore.getState().isLoading) {
      useAuthStore.getState().loadUser();
    }
  }, [isHydrated, isAuthenticated, user, router, isLoggingOut]);

  useEffect(() => {
    const CACHE_KEY = 'perm_menu_ids';
    const CACHE_TTL = 5 * 60 * 1000;

    const fetchPermissions = async () => {
      if (!token) return;

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
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/role-permissions/my-tabs`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
  }, [token]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { sessionStorage.removeItem('perm_menu_ids'); } catch { /* ignore */ }
    router.replace('/');
    setTimeout(() => {
      logout();
    }, 500);
  };

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <SocialLanguageProvider>
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
    </SocialLanguageProvider>
  );
}
