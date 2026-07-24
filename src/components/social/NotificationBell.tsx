'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, BellOff, BellRing, CheckCircle, XCircle, Clock, X, RotateCcw, ExternalLink,
  ClipboardList, Upload, Inbox, PackageX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socialApi, PLATFORM_META, SocialPlatform } from '@/lib/api/social';
import {
  getTaskNotifications,
  getTaskNotificationUnreadCount,
  markTaskNotificationRead,
  markAllTaskNotificationsRead,
} from '@/lib/api/task-auto';
import type { Notification as TaskNotification } from '@/types/task-auto';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useSocialLang } from '@/contexts/SocialLanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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

type BellTab = 'system' | 'task';

const POLL_INTERVAL = 30_000;

const TASK_NOTIF_META: Record<string, { icon: typeof ClipboardList; color: string }> = {
  TASK_ASSIGNED: { icon: ClipboardList, color: 'bg-blue-500' },
  TASK_SUBMITTED: { icon: Upload, color: 'bg-violet-500' },
  TASK_APPROVED: { icon: CheckCircle, color: 'bg-emerald-500' },
  TASK_REJECTED: { icon: XCircle, color: 'bg-red-500' },
  TEAM_PUSH_REQUEST: { icon: Inbox, color: 'bg-amber-500' },
  AUTO_ASSIGN_EMPTY_WAREHOUSE: { icon: PackageX, color: 'bg-amber-500' },
  CONTENT_APPROVAL_REQUESTED: { icon: Inbox, color: 'bg-violet-500' },
  CONTENT_APPROVED: { icon: CheckCircle, color: 'bg-emerald-500' },
  CONTENT_REJECTED: { icon: XCircle, color: 'bg-red-500' },
};

export default function NotificationBell() {
  const { t } = useSocialLang();
  const router = useRouter();
  const push = usePushNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<BellTab>('system');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [taskNotifs, setTaskNotifs] = useState<TaskNotification[]>([]);
  const [taskUnreadCount, setTaskUnreadCount] = useState(0);
  const [read, setRead] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('notif_read') || '[]')); } catch { return new Set(); }
  });
  const ref = useRef<HTMLDivElement>(null);
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async () => {
    try {
      const data = await socialApi.history.notifications();
      if (Array.isArray(data)) setNotifications(data);
      else if (data && Array.isArray((data as { notifications?: Notification[] }).notifications)) {
        setNotifications((data as { notifications: Notification[] }).notifications);
      }
    } catch {}
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([
        getTaskNotifications({ limit: 20 }),
        getTaskNotificationUnreadCount(),
      ]);
      setTaskNotifs(list.data);
      setTaskUnreadCount(unread.count);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    loadTasks();
    const timer = setInterval(() => { load(); loadTasks(); }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [load, loadTasks]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !read.has(n.id)).length;
  const totalUnread = unread + taskUnreadCount;

  const saveRead = (set: Set<string>) => {
    const arr = Array.from(set);
    const pruned = arr.length > 200 ? arr.slice(arr.length - 200) : arr;
    setRead(new Set(pruned));
    localStorage.setItem('notif_read', JSON.stringify(pruned));
  };

  const markAllRead = () => {
    const newRead = new Set(Array.from(read));
    notifications.forEach(n => newRead.add(n.id));
    saveRead(newRead);
  };

  const markRead = (id: string) => {
    const newRead = new Set(Array.from(read));
    newRead.add(id);
    saveRead(newRead);
  };

  const markAllTaskRead = () => {
    if (taskUnreadCount === 0) return;
    setTaskNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setTaskUnreadCount(0);
    markAllTaskNotificationsRead().catch(() => {});
  };

  const markTaskRead = (n: TaskNotification) => {
    if (n.is_read) return;
    setTaskNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    setTaskUnreadCount(c => Math.max(0, c - 1));
    markTaskNotificationRead(n.id).catch(() => {});
  };

  const handleBellClick = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      if (tab === 'system') markAllRead();
      else markAllTaskRead();
    }
  };

  const handleTabChange = (next: BellTab) => {
    setTab(next);
    if (next === 'system') markAllRead();
    else markAllTaskRead();
  };

  const handleTaskClick = (n: TaskNotification) => {
    markTaskRead(n);
    setOpen(false);
    if (n.task_id) router.push(`/dashboard/task-auto/tasks?taskId=${n.task_id}`);
  };

  const handleTogglePush = async () => {
    if (push.loading) return;
    try {
      if (push.subscribed) {
        await push.unsubscribe();
        toast.success(t.pushDisabled);
      } else {
        const ok = await push.subscribe();
        if (ok) toast.success(t.pushEnabled);
        else toast.error(t.pushPermissionDenied);
      }
    } catch (err) {
      console.error('[push] toggle failed:', err);
      toast.error(t.pushToggleFailed);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await socialApi.schedule.retry(id);
      toast.success(tRef.current.retryQueued);
      load();
    } catch {
      toast.error(tRef.current.retryFailed);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center"
          >
            {totalUnread > 9 ? '9+' : totalUnread}
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
              <h3 className="font-bold text-slate-800 text-sm">{t.notifTitle}</h3>
              <div className="flex items-center gap-1">
                {push.supported && (
                  <button
                    onClick={handleTogglePush}
                    disabled={push.loading}
                    title={push.subscribed ? t.pushDisabled : t.pushEnabled}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-50"
                  >
                    {push.subscribed
                      ? <BellRing className="w-3.5 h-3.5 text-blue-600" />
                      : <BellOff className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 pt-2 gap-1 border-b border-slate-100">
              {(['system', 'task'] as BellTab[]).map(tabId => {
                const isActive = tab === tabId;
                const count = tabId === 'system' ? unread : taskUnreadCount;
                return (
                  <button
                    key={tabId}
                    onClick={() => handleTabChange(tabId)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-colors ${
                      isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tabId === 'system' ? t.notifTabSystem : t.notifTabTask}
                    {count > 0 && (
                      <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* List */}
            {tab === 'system' ? (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Bell className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-sm font-bold text-slate-400">{t.noNotifs}</p>
                    <p className="text-xs text-slate-300 mt-1">{t.notifsHint}</p>
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
                        <div className={`w-8 h-8 ${meta.color} rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0 shadow-sm`}>
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-slate-700 truncate">{n.accountName || meta.label}</span>
                            {!isRead && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />}
                            <span className="ml-auto text-[10px] text-slate-400 flex-shrink-0">
                              {new Date(n.created_at).toLocaleTimeString(t.dateLocale, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-[11px] font-bold mb-1 ${
                            isOk ? 'text-emerald-600' : isFail ? 'text-red-500' : 'text-amber-600'
                          }`}>
                            {isOk ? <CheckCircle className="w-3 h-3" /> : isFail ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {isOk ? t.postSuccess : isFail ? t.postFailed : t.postPending}
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
                              <RotateCcw className="w-2.5 h-2.5" /> {t.retry}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                {taskNotifs.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <ClipboardList className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-sm font-bold text-slate-400">{t.taskNotifEmpty}</p>
                    <p className="text-xs text-slate-300 mt-1">{t.taskNotifHint}</p>
                  </div>
                ) : taskNotifs.map(n => {
                  const meta = TASK_NOTIF_META[n.type] || { icon: Bell, color: 'bg-slate-400' };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleTaskClick(n)}
                      className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 ${meta.color} rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-slate-700 truncate">{n.title}</span>
                            {!n.is_read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />}
                            <span className="ml-auto text-[10px] text-slate-400 flex-shrink-0">
                              {new Date(n.created_at).toLocaleTimeString(t.dateLocale, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {n.body && <p className="text-[11px] text-slate-500 line-clamp-2">{n.body}</p>}
                          {n.task?.content_title && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">📌 {n.task.content_title}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <Link
                href={tab === 'system' ? '/dashboard/social/history' : '/dashboard/task-auto/tasks'}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                {tab === 'system' ? t.viewHistory : t.viewTasks} <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
