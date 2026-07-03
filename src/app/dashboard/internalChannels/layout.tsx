'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  SquaresFour,
  FacebookLogo,
  TiktokLogo,
  InstagramLogo,
} from '@phosphor-icons/react';

const TABS = [
  { id: 'all',          label: 'Tất cả',      icon: SquaresFour,   color: 'text-slate-700' },
  { id: 'facebook',     label: 'Facebook',     icon: FacebookLogo,  color: 'text-blue-600'  },
  { id: 'tiktok',       label: 'TikTok',       icon: TiktokLogo,    color: 'text-slate-900' },
  { id: 'instagram',    label: 'Instagram',    icon: InstagramLogo, color: 'text-pink-500'  },
  // { id: 'douyin',       label: 'Douyin',       icon: TiktokLogo,    color: 'text-cyan-500'  },
  // { id: 'xiaohongshu',  label: 'Xiaohongshu',  icon: null,          color: '',              },
];

export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const active = TABS.find(t => pathname.endsWith(`/internalChannels/${t.id}`))?.id ?? 'all';

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Kênh nội bộ</h1>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý các kênh mạng xã hội thuộc sở hữu</p>
        </div>

        {/* Platform tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          {TABS.map(tab => {
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
                {Icon
                  ? <Icon size={15} weight={isActive ? 'fill' : 'regular'} className={isActive ? tab.color : ''} />
                  : <span>📕</span>}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
