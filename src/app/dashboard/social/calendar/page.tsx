'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Clock, CheckCircle,
  XCircle, AlertCircle, X, Send, Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { socialApi, SocialPost, PLATFORM_META, SocialPlatform } from '@/lib/api/social';
import toast from 'react-hot-toast';
import { useSocialLang } from '@/contexts/SocialLanguageContext';

function getStatusConfig(t: ReturnType<typeof useSocialLang>['t']) {
  return {
    PENDING:   { label: t.calendar.statusPending,   color: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  icon: Clock },
    COMPLETED: { label: t.calendar.statusCompleted,  color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
    FAILED:    { label: t.calendar.statusFailed,     color: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',    icon: XCircle },
    CANCELLED: { label: t.calendar.statusCancelled,  color: 'bg-slate-400',   text: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',  icon: AlertCircle },
  };
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const { t } = useSocialLang();
  const STATUS_CONFIG = getStatusConfig(t);
  const WEEKDAYS = t.calendar.weekdays;
  const MONTHS = t.calendar.months;
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await socialApi.schedule.list();
      setPosts(data);
    } catch {
      toast.error(t.calendar.failedToLoadSchedule);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build calendar grid for current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();   // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Pad before first day
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  // Pad after last day to complete final row
  while (cells.length % 7 !== 0) cells.push(null);

  const getPostsForDay = (day: Date) =>
    posts.filter(p => p.scheduled_at && isSameDay(new Date(p.scheduled_at), day));

  const selectedPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToday  = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today);
  };

  const handleCancel = async (id: string) => {
    if (!confirm(t.calendar.cancelPostConfirm)) return;
    setActionId(id);
    try {
      await socialApi.schedule.cancel(id);
      toast.success(t.calendar.cancelled);
      await load();
      // Refresh selected day posts
    } catch {
      toast.error(t.calendar.cancelFailed);
    } finally {
      setActionId(null);
    }
  };

  const handleRetry = async (id: string) => {
    setActionId(id);
    try {
      await socialApi.schedule.retry(id);
      toast.success(t.calendar.retryQueued);
      await load();
    } catch {
      toast.error(t.calendar.retryFailed);
    } finally {
      setActionId(null);
    }
  };

  // Count by status for the current month
  const monthPosts = posts.filter(p => {
    if (!p.scheduled_at) return false;
    const d = new Date(p.scheduled_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const pending   = monthPosts.filter(p => p.status === 'PENDING').length;
  const completed = monthPosts.filter(p => p.status === 'COMPLETED').length;
  const failed    = monthPosts.filter(p => p.status === 'FAILED').length;

  return (
    <div className="flex h-[calc(100vh-88px)] bg-slate-50 overflow-hidden">

      {/* ── LEFT: Calendar ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white transition-colors text-slate-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-bold text-slate-800 text-sm min-w-[120px] text-center">
                {MONTHS[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white transition-colors text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={goToday}
              className="px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
            >
              {t.calendar.today}
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Month stats */}
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-amber-600">
                <div className="w-2 h-2 rounded-full bg-amber-500" />{t.calendar.pendingCount(pending)}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />{t.calendar.completedCount(completed)}
              </span>
              {failed > 0 && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-500" />{t.calendar.failedCount(failed)}
                </span>
              )}
            </div>
            <Link
              href="/dashboard/social/compose?tab=schedule"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> {t.calendar.scheduleNew}
            </Link>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-white border-b border-slate-200 flex-shrink-0">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-7 gap-px bg-slate-200 h-full">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="bg-white animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-slate-200">
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="bg-slate-50 min-h-[110px]" />;
                }

                const dayPosts = getPostsForDay(day);
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const isPast = day < today && !isToday;
                const isSun = day.getDay() === 0;
                const isSat = day.getDay() === 6;

                // Group dots by platform (max 3 shown + overflow)
                const shown = dayPosts.slice(0, 4);
                const overflow = dayPosts.length - shown.length;

                return (
                  <motion.div
                    key={day.toISOString()}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[110px] bg-white p-2 cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/30'
                        : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    {/* Day number */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                      isToday
                        ? 'bg-blue-600 text-white shadow-md'
                        : isSun
                        ? 'text-red-400'
                        : isSat
                        ? 'text-blue-500'
                        : isPast
                        ? 'text-slate-300'
                        : 'text-slate-700'
                    }`}>
                      {day.getDate()}
                    </div>

                    {/* Post badges */}
                    <div className="space-y-1">
                      {shown.map((post) => {
                        const meta = PLATFORM_META[post.platform as SocialPlatform] || PLATFORM_META.FACEBOOK;
                        const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.PENDING;
                        const time = post.scheduled_at
                          ? new Date(post.scheduled_at).toLocaleTimeString(t.dateLocale, { hour: '2-digit', minute: '2-digit' })
                          : '';
                        return (
                          <div
                            key={post.id}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold truncate ${cfg.bg} ${cfg.border} border`}
                          >
                            <span>{meta.emoji}</span>
                            <span className={`truncate ${cfg.text}`}>{time}</span>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.color}`} />
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <div className="text-[10px] font-bold text-slate-400 pl-1">
                          {t.calendar.morePosts(overflow)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Day detail panel ── */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            key="panel"
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[340px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 shadow-xl"
          >
            {/* Panel header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {WEEKDAYS[selectedDay.getDay()]}
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  {selectedDay.getDate()} {MONTHS[selectedDay.getMonth()]} {selectedDay.getFullYear()}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPosts.length === 0
                    ? t.calendar.noPostsThisDay
                    : t.calendar.postCount(selectedPosts.length)}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Post list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedPosts.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">{t.calendar.noScheduledPostsThisDay}</p>
                  <Link
                    href="/dashboard/social/compose?tab=schedule"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> {t.calendar.addPost}
                  </Link>
                </div>
              ) : (
                selectedPosts
                  .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
                  .map((post) => {
                    const meta = PLATFORM_META[post.platform as SocialPlatform] || PLATFORM_META.FACEBOOK;
                    const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.PENDING;
                    const StatusIcon = cfg.icon;
                    const time = post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleTimeString(t.dateLocale, { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}
                      >
                        {/* Platform + time + status */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 ${meta.color} rounded-xl flex items-center justify-center text-white text-base shadow-sm`}>
                              {meta.emoji}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-700">{meta.label}</p>
                              {post.account && (
                                <p className="text-[10px] text-slate-400">{post.account.name}</p>
                              )}
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">{time}</span>
                        </div>

                        {/* Message */}
                        <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed mb-3">
                          {post.message}
                        </p>

                        {/* Media count */}
                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className="flex gap-1 mb-3 flex-wrap">
                            {post.media_urls.slice(0, 3).map((url, i) => (
                              <div key={i} className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                {/\.(mp4|mov|webm)$/i.test(url) ? (
                                  <video src={url} className="w-full h-full object-cover" muted />
                                ) : (
                                  <img src={url} className="w-full h-full object-cover" />
                                )}
                              </div>
                            ))}
                            {post.media_urls.length > 3 && (
                              <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                +{post.media_urls.length - 3}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Error message */}
                        {post.error_msg && (
                          <p className="text-[10px] text-red-500 mb-3 bg-red-50 rounded-lg px-2 py-1.5 border border-red-100">
                            {post.error_msg.length > 100 ? post.error_msg.slice(0, 100) + '…' : post.error_msg}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {post.status === 'FAILED' && (
                            <button
                              onClick={() => handleRetry(post.id)}
                              disabled={actionId === post.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {actionId === post.id ? t.calendar.retrying : t.calendar.retry}
                            </button>
                          )}
                          {post.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(post.id)}
                              disabled={actionId === post.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-red-200 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              {actionId === post.id ? t.calendar.cancelling : t.calendar.cancelPost}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </div>

            {/* Quick stats for selected day */}
            {selectedPosts.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="grid grid-cols-3 gap-2">
                  {(['PENDING', 'COMPLETED', 'FAILED'] as const).map((status) => {
                    const count = selectedPosts.filter(p => p.status === status).length;
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <div key={status} className={`text-center py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                        <p className={`text-lg font-black ${cfg.text}`}>{count}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${cfg.text} opacity-70`}>
                          {cfg.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
