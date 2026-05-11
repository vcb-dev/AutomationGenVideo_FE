'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCircle, XCircle, Clock, X, RotateCcw, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socialApi, PLATFORM_META, SocialPlatform } from '@/lib/api/social';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  message: string;
  error_msg?: string | null;
  created_at: string;
  read?: boolean;
}

const POLL_INTERVAL = 30_000; // 30 giây

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [read, setRead] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('notif_read') || '[]')); } catch { return new Set(); }
  });
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await socialApi.history.notifications();
      if (Array.isArray(data)) setNotifications(data);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [load]);

  // Click ngoài để đóng
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !read.has(n.id)).length;

  const markAllRead = () => {
    const newRead = new Set(Array.from(read));
    notifications.forEach(n => newRead.add(n.id));
    setRead(newRead);
    localStorage.setItem('notif_read', JSON.stringify(Array.from(newRead)));
  };

  const markRead = (id: string) => {
    const newRead = new Set(Array.from(read));
    newRead.add(id);
    setRead(newRead);
    localStorage.setItem('notif_read', JSON.stringify(Array.from(newRead)));
  };

  const handleRetry = async (id: string) => {
    try {
      await socialApi.schedule.retry(id);
      toast.success('Đã đưa vào hàng chờ đăng lại');
      load();
    } catch {
      toast.error('Retry thất bại');
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[200] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">🔔 Thông báo đăng bài</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[10px] font-bold text-blue-600 hover:underline">
                    Đánh dấu đã đọc
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Bell className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm font-bold text-slate-400">Chưa có thông báo</p>
                  <p className="text-xs text-slate-300 mt-1">Thông báo sẽ hiển thị khi bạn đăng bài</p>
                </div>
              ) : notifications.map(n => {
                const meta = PLATFORM_META[n.platform] || PLATFORM_META.FACEBOOK;
                const isRead = read.has(n.id);
                const isOk = n.status === 'COMPLETED';
                const isFail = n.status === 'FAILED';
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-default ${!isRead ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Platform avatar */}
                      <div className={`w-8 h-8 ${meta.color} rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0 shadow-sm`}>
                        {meta.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-slate-700 truncate">{n.accountName || meta.label}</span>
                          {!isRead && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />}
                          <span className="ml-auto text-[10px] text-slate-400 flex-shrink-0">
                            {new Date(n.created_at).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-[11px] font-bold mb-1 ${
                          isOk ? 'text-emerald-600' : isFail ? 'text-red-500' : 'text-amber-600'
                        }`}>
                          {isOk ? <CheckCircle className="w-3 h-3" /> : isFail ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isOk ? 'Đăng bài thành công' : isFail ? 'Đăng bài thất bại' : 'Đang chờ xử lý'}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{n.message}</p>
                        {n.error_msg && (
                          <p className="text-[10px] text-red-400 mt-0.5 line-clamp-1">⚠ {n.error_msg}</p>
                        )}
                        {isFail && (
                          <button
                            onClick={() => handleRetry(n.id)}
                            className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> Đăng lại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <Link
                href="/dashboard/social/history"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Xem tất cả lịch sử <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
