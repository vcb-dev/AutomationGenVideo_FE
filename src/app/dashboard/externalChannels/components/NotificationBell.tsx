'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, CircleNotch, CheckCircle, X, Trash } from '@phosphor-icons/react';
import { useScrapingStore, ScrapeNotification } from '@/store/scraping-store';

function relativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  return `${Math.floor(diffMin / 60)} giờ trước`;
}

const platformLabel: Record<ScrapeNotification['platform'], string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  xiaohongshu: 'Xiaohongshu',
  douyin: 'Douyin',
};

function NotificationItem({ n }: { n: ScrapeNotification }) {
  const { removeNotification } = useScrapingStore();

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
      <div className="mt-0.5 flex-shrink-0">
        {n.status === 'scraping' ? (
          <CircleNotch size={16} weight="bold" className="animate-spin text-blue-500" />
        ) : n.status === 'done' ? (
          <CheckCircle size={16} weight="fill" className="text-emerald-500" />
        ) : (
          <X size={16} weight="bold" className="text-red-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-snug">
          {platformLabel[n.platform]} — <span className="text-slate-500 font-normal">"{n.label}"</span>
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {n.status === 'scraping' && 'Đang cào dữ liệu...'}
          {n.status === 'done' && (
            n.newCount !== undefined
              ? `Hoàn thành · ${n.newCount > 0 ? `+${n.newCount} video mới` : 'Không có video mới'}`
              : 'Hoàn thành'
          )}
          {n.status === 'error' && 'Cào thất bại'}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">{relativeTime(n.startedAt)}</p>
      </div>

      <button
        onClick={() => removeNotification(n.id)}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex-shrink-0"
      >
        <X size={12} className="text-slate-400" />
      </button>
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, clearAll } = useScrapingStore();
  const panelRef = useRef<HTMLDivElement>(null);

  const scrapingCount = notifications.filter(n => n.status === 'scraping').length;
  const unreadCount = notifications.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Thông báo cào dữ liệu"
      >
        {scrapingCount > 0 ? (
          <CircleNotch size={18} weight="bold" className="animate-spin text-blue-500" />
        ) : (
          <Bell size={18} weight={open ? 'fill' : 'regular'} className="text-slate-600 dark:text-slate-300" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-2xl z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Thông báo cào</p>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash size={12} /> Xóa tất cả
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <Bell size={24} className="text-slate-300" />
              <p className="text-xs text-slate-400">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
              {notifications.map(n => <NotificationItem key={n.id} n={n} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
