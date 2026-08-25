'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CircleNotch, LinkSimple } from '@phosphor-icons/react';

import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';
import { UserRole } from '@/types/auth';

type DetectedPlatform = 'tiktok' | 'douyin' | 'instagram' | 'youtube' | 'xiaohongshu' | 'kuaishou' | 'bilibili' | 'facebook' | null;

// Nhận diện cả domain đầy đủ lẫn domain rút gọn (link copy từ app điện thoại).
// Link rút gọn được BE tự follow redirect để lấy URL thật (resolve-short-link.util.ts).
function detectPlatform(url: string): DetectedPlatform {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok'; // gồm cả vt./vm.tiktok.com
  if (u.includes('douyin.com')) return 'douyin'; // gồm cả v.douyin.com
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('kuaishou.com')) return 'kuaishou'; // gồm cả v.kuaishou.com
  if (u.includes('bilibili.com') || u.includes('b23.tv')) return 'bilibili';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  return null;
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  douyin: 'Douyin',
  instagram: 'Instagram',
  youtube: 'YouTube',
  xiaohongshu: 'Xiaohongshu',
  kuaishou: 'Kuaishou',
  bilibili: 'Bilibili',
  facebook: 'Facebook',
};

const DEFAULT_COUNT = 50;
const MAX_COUNT = 1000;

export default function QuickAddChannel() {
  const { token, user } = useAuthStore();
  const canManageChannels = user?.roles?.some(r => [UserRole.ADMIN, UserRole.LEADER].includes(r)) ?? false;
  const [url, setUrl] = useState('');
  const [count, setCount] = useState(String(DEFAULT_COUNT));

  const detected = url.trim() ? detectPlatform(url.trim()) : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = url.trim();
      if (!token) throw new Error('Chưa đăng nhập');
      const platform = detectPlatform(trimmed);
      if (!platform) throw new Error('Không nhận diện được nền tảng từ URL này');
      // Để trống / số không hợp lệ → gửi undefined, BE dùng mặc định của nó.
      const parsed = Number(count);
      const n = Number.isFinite(parsed) && parsed > 0 ? Math.min(MAX_COUNT, Math.floor(parsed)) : undefined;
      switch (platform) {
        case 'tiktok': return scraperService.tiktokProfileScrape(token, trimmed, undefined, n);
        case 'douyin': return scraperService.douyinProfileScrape(token, trimmed, n);
        case 'instagram': return scraperService.instagramProfileScrape(token, trimmed, undefined, n);
        case 'youtube': return scraperService.youtubeChannelScrape(token, trimmed, undefined, n);
        case 'kuaishou': return scraperService.kuaishouProfileScrape(token, trimmed, n);
        case 'bilibili': return scraperService.bilibiliProfileScrape(token, trimmed, n);
        case 'xiaohongshu': return scraperService.xhsProfileScrape(token, trimmed, n);
        // Facebook cào theo fanpage, BE không nhận tham số số lượng riêng.
        case 'facebook': return scraperService.fanpageScrapeByUrl(token, trimmed);
      }
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Đã thêm kênh, đang cào...');
      setUrl('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canManageChannels) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <LinkSimple size={14} weight="bold" className="text-primary" />
        Thêm kênh yêu thích để cào — dán URL bất kỳ nền tảng
      </p>
      <p className="text-xs text-slate-400 mb-2">
        Số video là mức tối đa muốn lấy — nếu kênh có ít hơn thì chỉ lấy được đúng số kênh đó có.
        {detected === 'facebook' && ' Facebook cào theo fanpage nên không áp dụng số này.'}
      </p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && url.trim() && !mutation.isPending) mutation.mutate(); }}
          placeholder="Dán URL kênh TikTok / Douyin / Instagram / YouTube / Xiaohongshu / Kuaishou / Bilibili / Facebook..."
          className="flex-1 px-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <input
          type="number"
          value={count}
          onChange={e => setCount(e.target.value)}
          min={1}
          max={MAX_COUNT}
          title={`Số video muốn cào (1-${MAX_COUNT}). Để trống = ${DEFAULT_COUNT}.`}
          placeholder="Số video"
          className="w-28 px-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !url.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
        >
          {mutation.isPending && <CircleNotch size={16} weight="bold" className="animate-spin" />}
          {mutation.isPending ? 'Đang thêm...' : 'Thêm & cào'}
        </button>
      </div>
      {url.trim() && (
        <p className="text-xs text-slate-400 mt-1.5">
          {detected ? (
            <>
              Nhận diện: <span className="font-medium text-foreground">{PLATFORM_LABEL[detected]}</span>
            </>
          ) : (
            <span className="text-amber-500">Không nhận diện được nền tảng từ URL này.</span>
          )}
        </p>
      )}
    </div>
  );
}
