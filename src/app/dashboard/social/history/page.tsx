'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, CheckCircle, XCircle, Clock, Send, Calendar,
  Image as ImageIcon, ChevronDown, ChevronUp, Search,
  RefreshCw, Copy, RotateCcw, Filter, X, ArrowUpDown,
  TrendingUp, ChevronLeft, ChevronRight, Repeat2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { socialApi, SocialPost, PLATFORM_META, SocialPlatform } from '@/lib/api/social';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:3000';

function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (url.includes('127.0.0.1') || url.includes('localhost')) {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    return `${API_BASE}${path}`;
  }
  return url;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
}


// Mini bar chart: posts per day for last 14 days
function ActivityChart({ posts }: { posts: SocialPost[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d;
  });

  const counts = days.map(day => ({
    label: day.toLocaleDateString('vi', { day: '2-digit', month: '2-digit' }),
    total: posts.filter(p => {
      const pd = new Date(p.created_at);
      return pd.getFullYear() === day.getFullYear() &&
             pd.getMonth() === day.getMonth() &&
             pd.getDate() === day.getDate();
    }).length,
    success: posts.filter(p => {
      const pd = new Date(p.created_at);
      return p.status === 'COMPLETED' &&
             pd.getFullYear() === day.getFullYear() &&
             pd.getMonth() === day.getMonth() &&
             pd.getDate() === day.getDate();
    }).length,
  }));

  const max = Math.max(...counts.map(c => c.total), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold text-slate-700">Hoạt động 14 ngày qua</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Tổng</span>
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />Thành công</span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-20">
        {counts.map((c, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {c.label}: {c.total} bài
            </div>
            <div className="w-full flex flex-col-reverse gap-px" style={{ height: '72px' }}>
              {/* Success bar */}
              <div
                className="w-full bg-emerald-400 rounded-sm transition-all duration-300"
                style={{ height: `${(c.success / max) * 72}px` }}
              />
              {/* Failed bar on top */}
              {c.total > c.success && (
                <div
                  className="w-full bg-blue-200 rounded-sm"
                  style={{ height: `${((c.total - c.success) / max) * 72}px` }}
                />
              )}
            </div>
            {i % 2 === 0 && (
              <span className="text-[8px] text-slate-400 font-medium mt-1">{c.label.slice(0, 5)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const router = useRouter();
  const [posts, setPosts]         = useState<SocialPost[]>([]);
  const [stats, setStats]         = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId]   = useState<string | null>(null);

  // Filters
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<'all' | 'COMPLETED' | 'FAILED' | 'PENDING'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortOrder, setSortOrder]         = useState<'desc' | 'asc'>('desc');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [showFilters, setShowFilters]     = useState(false);
  const [page, setPage]                   = useState(1);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [data, s] = await Promise.all([
        socialApi.history.list(200),
        socialApi.history.stats(),
      ]);
      setPosts(data);
      setStats(s);
    } catch {
      toast.error('Không tải được lịch sử');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // All unique platforms in data
  const availablePlatforms = useMemo(() =>
    Array.from(new Set(posts.map(p => p.platform))),
  [posts]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...posts];

    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (platformFilter !== 'all') list = list.filter(p => p.platform === platformFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.message?.toLowerCase().includes(q) ||
        p.account?.name?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) list = list.filter(p => new Date(p.created_at) >= new Date(dateFrom));
    if (dateTo)   list = list.filter(p => new Date(p.created_at) <= new Date(dateTo + 'T23:59:59'));

    list.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });

    return list;
  }, [posts, statusFilter, platformFilter, search, dateFrom, dateTo, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [statusFilter, platformFilter, search, dateFrom, dateTo, sortOrder]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy nội dung');
  };

  const handleRetry = async (id: string) => {
    setActionId(id);
    try {
      await socialApi.schedule.retry(id);
      toast.success('Đã đưa vào hàng chờ đăng lại');
      await load(true);
    } catch {
      toast.error('Retry thất bại');
    } finally {
      setActionId(null);
    }
  };

  const handleRepost = (post: SocialPost) => {
    localStorage.setItem('compose_prefill', JSON.stringify({
      message: post.message,
      mediaUrls: post.media_urls || [],
    }));
    router.push('/dashboard/social/compose');
    toast.success('Đang mở trang soạn bài với nội dung đã sao chép');
  };

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setPlatformFilter('all');
    setDateFrom(''); setDateTo(''); setSortOrder('desc');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || platformFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 max-w-5xl py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Lịch sử đăng bài</h1>
              <p className="text-slate-500 text-sm mt-0.5">Theo dõi tất cả các bài đã đăng</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/social/stats"
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" /> Thống kê
              </Link>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
              <Link
                href="/dashboard/social/compose"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Send className="w-4 h-4" /> Đăng bài mới
              </Link>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Tổng bài',     value: stats.total,   color: 'text-slate-800',   bg: 'bg-slate-50',   border: 'border-slate-200' },
                { label: 'Thành công',   value: stats.success, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                { label: 'Thất bại',     value: stats.failed,  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200' },
                { label: 'Đang chờ',     value: stats.pending, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Platform badges */}
          {stats?.byPlatform && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPlatform).map(([platform, count]) => {
                const meta = (PLATFORM_META as any)[platform];
                if (!meta) return null;
                const isActive = platformFilter === platform;
                return (
                  <button
                    key={platform}
                    onClick={() => setPlatformFilter(isActive ? 'all' : platform)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    {meta.emoji} {meta.label}: {count as number}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl pt-5 space-y-4">

        {/* Activity chart */}
        {!loading && posts.length > 0 && <ActivityChart posts={posts} />}

        {/* Search + filter bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo nội dung, tên kênh..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="COMPLETED">✅ Thành công</option>
              <option value="FAILED">❌ Thất bại</option>
              <option value="PENDING">⏳ Đang chờ</option>
            </select>

            {/* Sort */}
            <button
              onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              title={sortOrder === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'}
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
            </button>

            {/* Advanced filter toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                showFilters || dateFrom || dateTo
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" /> Lọc thêm
            </button>
          </div>

          {/* Advanced filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-3 pt-1 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Từ ngày:</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Đến ngày:</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500">Platform:</label>
                    <select
                      value={platformFilter}
                      onChange={e => setPlatformFilter(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    >
                      <option value="all">Tất cả</option>
                      {availablePlatforms.map(p => {
                        const meta = (PLATFORM_META as any)[p];
                        return <option key={p} value={p}>{meta?.emoji} {meta?.label || p}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Đang lọc:</span>
              {search && (
                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  "{search}" <X onClick={() => setSearch('')} className="w-3 h-3 cursor-pointer hover:text-blue-900" />
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {statusFilter} <X onClick={() => setStatusFilter('all')} className="w-3 h-3 cursor-pointer" />
                </span>
              )}
              {platformFilter !== 'all' && (
                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {platformFilter} <X onClick={() => setPlatformFilter('all')} className="w-3 h-3 cursor-pointer" />
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {dateFrom || '...'} → {dateTo || '...'} <X onClick={() => { setDateFrom(''); setDateTo(''); }} className="w-3 h-3 cursor-pointer" />
                </span>
              )}
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-bold ml-1">
                Xoá tất cả
              </button>
              <span className="ml-auto text-xs text-slate-400 font-medium">
                {filtered.length} / {posts.length} bài
              </span>
            </div>
          )}
        </div>

        {/* Post list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-20">
            <BarChart3 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-1">
              {hasActiveFilters ? 'Không tìm thấy bài nào' : 'Chưa có lịch sử đăng bài'}
            </h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 hover:underline font-medium">
                Xoá bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {paginated.map((post, idx) => {
              const meta = (PLATFORM_META as any)[post.platform] || PLATFORM_META.FACEBOOK;
              const isOk   = post.status === 'COMPLETED';
              const isFail = post.status === 'FAILED';
              const isPending = post.status === 'PENDING';
              const isExpanded = expandedId === post.id;
              const hasMedia = post.media_urls && post.media_urls.length > 0;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Platform icon */}
                      <div className={`w-10 h-10 ${meta.color} rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0 shadow-sm`}>
                        {meta.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{meta.label}</span>
                          {post.account && (
                            <span className="text-xs text-slate-400 font-medium">· {post.account.name}</span>
                          )}
                          {hasMedia && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 font-bold">
                              <ImageIcon className="w-3 h-3" />
                              {post.media_urls.length} file
                            </span>
                          )}
                          {/* Status badge */}
                          <span className={`ml-auto text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                            isOk      ? 'bg-emerald-100 text-emerald-700' :
                            isFail    ? 'bg-red-100 text-red-700' :
                            isPending ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-500'
                          }`}>
                            {isOk ? <CheckCircle className="w-3 h-3" /> : isFail ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {isOk ? 'Thành công' : isFail ? 'Thất bại' : isPending ? 'Đang chờ' : 'Đã huỷ'}
                          </span>
                        </div>

                        {/* Message preview */}
                        <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed mb-2">
                          {post.message || <span className="italic text-slate-400">Không có nội dung</span>}
                        </p>

                        {/* Bottom row: meta info + actions */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            {post.source === 'SCHEDULED' ? <Calendar className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                            {post.source === 'SCHEDULED' ? 'Lên lịch' : 'Đăng ngay'}
                          </span>
                          <span className="font-medium">{new Date(post.created_at).toLocaleString('vi')}</span>

                          {post.error_msg && (
                            <span className="text-red-400 truncate max-w-[250px] font-medium" title={post.error_msg}>
                              ⚠ {post.error_msg.length > 60 ? post.error_msg.slice(0, 60) + '…' : post.error_msg}
                            </span>
                          )}

                          {/* Action buttons */}
                          <div className="ml-auto flex items-center gap-1">
                            {/* Copy content */}
                            {post.message && (
                              <button
                                onClick={() => handleCopy(post.message)}
                                title="Copy nội dung"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Repost */}
                            {isOk && (
                              <button
                                onClick={() => handleRepost(post)}
                                title="Đăng lại bài này"
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                              >
                                <Repeat2 className="w-3 h-3" /> Đăng lại
                              </button>
                            )}

                            {/* Retry failed */}
                            {isFail && (
                              <button
                                onClick={() => handleRetry(post.id)}
                                disabled={actionId === post.id}
                                title="Đăng lại"
                                className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className={`w-3 h-3 ${actionId === post.id ? 'animate-spin' : ''}`} />
                                Thử lại
                              </button>
                            )}

                            {/* Expand media */}
                            {hasMedia && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : post.id)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-slate-100 transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isExpanded ? 'Ẩn' : 'Xem media'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Media thumbnails */}
                  <AnimatePresence>
                    {hasMedia && isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Media đính kèm ({post.media_urls.length})
                          </p>
                          <div className="flex flex-col gap-4">
                            {post.media_urls.map((url, i) => {
                              const resolved = resolveMediaUrl(url);
                              const isVideo  = isVideoUrl(url);
                              return isVideo ? (
                                <div key={i} className="rounded-xl overflow-hidden bg-black">
                                  <video
                                    src={resolved}
                                    controls
                                    preload="metadata"
                                    className="w-full max-h-[480px] object-contain"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLVideoElement).poster = '';
                                      (e.currentTarget.parentElement as HTMLElement).innerHTML =
                                        '<p class="text-xs text-slate-400 p-4 text-center">File không còn trên server</p>';
                                    }}
                                  />
                                </div>
                              ) : (
                                <a key={i} href={resolved} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={resolved}
                                    alt=""
                                    className="max-h-[480px] rounded-xl object-contain w-full bg-slate-100 hover:opacity-90 transition-opacity"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).alt = 'Ảnh không còn trên server';
                                      (e.target as HTMLImageElement).className += ' opacity-30';
                                    }}
                                  />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                      page === p
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs text-slate-400 font-medium ml-2">
              Trang {page}/{totalPages} · {filtered.length} bài
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
