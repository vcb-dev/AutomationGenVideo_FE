'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  SquaresFour,
  FacebookLogo,
  TiktokLogo,
  InstagramLogo,
  YoutubeLogo,
} from '@phosphor-icons/react';
import { SiThreads } from 'react-icons/si';
import { useAuthStore } from '@/store/auth-store';
import { filterAllowedInternalPlatforms, canAccessInternalPlatform } from '@/lib/permissions';

const TABS = [
  { id: 'all', label: 'Tất cả', icon: SquaresFour, color: 'text-slate-700 dark:text-slate-300' },
  { id: 'facebook', label: 'Facebook', icon: FacebookLogo, color: 'text-blue-600' },
  { id: 'tiktok', label: 'TikTok', icon: TiktokLogo, color: 'text-slate-900 dark:text-white' },
  { id: 'instagram', label: 'Instagram', icon: InstagramLogo, color: 'text-pink-500' },
  { id: 'threads', label: 'Threads', icon: (props: any) => <SiThreads {...props} />, color: 'text-slate-900 dark:text-white' },
  { id: 'youtube', label: 'YouTube', icon: YoutubeLogo, color: 'text-red-600' },
];

export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  const visibleTabs = filterAllowedInternalPlatforms(user, TABS);

  const getActiveTab = () => {
    for (const tab of TABS) {
      if (pathname.includes(`/internalChannels/${tab.id}`)) return tab.id;
    }
    return 'all';
  };

  const active = getActiveTab();

  // Nếu user đang ở tab mà họ không có quyền, tự chuyển về tab hợp lệ đầu tiên
  useEffect(() => {
    if (!user) return;
    if (visibleTabs.length > 0 && !canAccessInternalPlatform(user, active)) {
      router.replace(`/dashboard/internalChannels/${visibleTabs[0].id}`);
    }
  }, [user, active, visibleTabs, router]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Kênh nội bộ</h1>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý các kênh mạng xã hội thuộc sở hữu</p>
        </div>

        {/* Platform tabs */}
        {visibleTabs.length > 0 && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            {visibleTabs.map(tab => {
              const isActive = active === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => router.push(`/dashboard/internalChannels/${tab.id}`)}
                  className={[
                    'flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-all',
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm'
                      : 'text-slate-500 hover:text-foreground',
                  ].join(' ')}
                >
                  {Icon ? (
                    <Icon size={15} weight={isActive ? 'fill' : 'regular'} className={isActive ? tab.color : ''} />
                  ) : (
                    <span>{(tab as any).emoji ?? '📕'}</span>
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {visibleTabs.length === 0 && user?.permissions && user.permissions.length > 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Bạn không có quyền truy cập bất kỳ nền tảng kênh nội bộ nào.
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
