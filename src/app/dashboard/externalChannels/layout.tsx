'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FacebookLogo, TiktokLogo, InstagramLogo, YoutubeLogo, SquaresFour } from '@phosphor-icons/react';
import { SiThreads } from 'react-icons/si';
import NotificationBell from './components/NotificationBell';
import { useAuthStore } from '@/store/auth-store';
import { filterAllowedPlatforms, canAccessExternalPlatform } from '@/lib/permissions';

const platforms = [
  { id: 'all', label: 'Tất cả', icon: SquaresFour, color: 'text-slate-700 dark:text-slate-300' },
  { id: 'facebook', label: 'Facebook', icon: FacebookLogo, color: 'text-blue-600' },
  { id: 'tiktok', label: 'TikTok', icon: TiktokLogo, color: 'text-slate-900 dark:text-white' },
  { id: 'instagram', label: 'Instagram', icon: InstagramLogo, color: 'text-pink-500' },
  { id: 'threads', label: 'Threads', icon: (props: any) => <SiThreads {...props} />, color: 'text-slate-900 dark:text-white' },
  { id: 'youtube', label: 'YouTube', icon: YoutubeLogo, color: 'text-red-600' },
  { id: 'douyin', label: 'Douyin', icon: TiktokLogo, color: 'text-cyan-500' },
  { id: 'xiaohongshu', label: 'XiaoHongShu', icon: null, emoji: '📕' },
  { id: 'kuaishou', label: 'KuaiShou', icon: null, emoji: '⚡' },
  { id: 'bilibili', label: 'Bilibili', icon: null, emoji: '📺' },
];

export default function ExternalChannelsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  const visiblePlatforms = filterAllowedPlatforms(user, platforms);

  const getActivePlatform = () => {
    for (const p of platforms) {
      if (pathname.includes(`/externalChannels/${p.id}`)) return p.id;
    }
    if (pathname.match(/\/externalChannels\/\d+/)) return 'facebook';
    return 'all';
  };

  const active = getActivePlatform();

  // Nếu user đang ở nền tảng mà họ không có quyền, tự chuyển về nền tảng hợp lệ đầu tiên
  useEffect(() => {
    if (!user) return;
    if (visiblePlatforms.length > 0 && !canAccessExternalPlatform(user, active)) {
      router.replace(`/dashboard/externalChannels/${visiblePlatforms[0].id}`);
    }
  }, [user, active, visiblePlatforms, router]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row justify-between">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Khám phá kênh ngoài</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tìm kiếm, cào và theo dõi nội dung từ các nền tảng mạng xã hội.</p>
        </div>

        {/* Right side: bell + platform tabs */}
        <div className="flex items-center gap-3">
        {/* Platform tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          {visiblePlatforms.map(p => {
            const isActive = active === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/dashboard/externalChannels/${p.id}`)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-all ${isActive
                    ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm'
                    : 'text-slate-500 hover:text-foreground'
                  }`}
              >
                {Icon ? <Icon size={15} weight={isActive ? 'fill' : 'regular'} className={isActive ? p.color : ''} /> : <span>{p.emoji}</span>}
                {p.label}
              </button>
            );
          })}
        </div>
        <NotificationBell />
        </div>

      </div>

      {/* Content */}
      {children}
    </div>
  );
}
