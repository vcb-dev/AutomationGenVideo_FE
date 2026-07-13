'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Facebook, Instagram, Music2, Music, BookOpen, Youtube } from 'lucide-react';

type Item = {
  id: 'facebook' | 'instagram' | 'tiktok' | 'douyin' | 'xiaohongshu' | 'youtube';
  label: string;
  href: string;
  icon: any;
};

const PLATFORM_ITEMS: Item[] = [
  { id: 'facebook', label: 'Facebook', href: '/dashboard/facebook/channels', icon: Facebook },
  { id: 'instagram', label: 'Instagram', href: '/dashboard/instagram/channels', icon: Instagram },
  { id: 'tiktok', label: 'TikTok', href: '/dashboard/ai/channels', icon: Music2 },
  { id: 'douyin', label: 'Douyin', href: '/dashboard/douyin/channels', icon: Music },
  { id: 'xiaohongshu', label: 'Xiaohongshu', href: '/dashboard/xiaohongshu/channels', icon: BookOpen },
  { id: 'youtube', label: 'YouTube', href: '/dashboard/youtube/channels', icon: Youtube },
];

export default function ChannelsPlatformSwitcher() {
  const pathname = usePathname() || '';
  const router = useRouter();

  const activeHref = PLATFORM_ITEMS.find((it) => pathname.startsWith(it.href))?.href || '';

  // Prefetch all platform pages to reduce first-click lag
  useEffect(() => {
    const t = setTimeout(() => {
      PLATFORM_ITEMS.forEach((it) => {
        try { router.prefetch(it.href); } catch (_) {}
      });
    }, 200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PLATFORM_ITEMS.map((it) => {
        const active = activeHref === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.id}
            href={it.href}
            prefetch={true}
            onMouseEnter={() => {
              try { router.prefetch(it.href); } catch (_) {}
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm md:text-base font-black transition shadow-sm border ${
              active
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-700'}`} />
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

