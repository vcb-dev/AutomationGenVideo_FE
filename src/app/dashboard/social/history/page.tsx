'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, CheckCircle, XCircle, Clock, Send, Calendar,
  Image as ImageIcon, Search,
  RefreshCw, Copy, RotateCcw, Filter, X, ArrowUpDown,
  TrendingUp, ChevronLeft, ChevronRight, Repeat2, Play, ExternalLink,
  LayoutGrid, List, Eye, FileVideo, FileImage,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { socialApi, SocialPost, HistoryMember, PLATFORM_META } from '@/lib/api/social';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:3000';

function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (url.includes('127.0.0.1') || url.includes('localhost')) {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    return `${API_BASE}${path}`;
  }
  return url;
}

/** Trích xuất Google Drive fileId từ URL */
function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const ucMatch = url.match(/drive\.google\.com\/uc[^?]*\?.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return ucMatch[1];
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  return null;
}

function isDriveUrl(url: string): boolean {
  return url.includes('drive.google.com');
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url) || isDriveUrl(url);
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
const GRID_PAGE_SIZE = 42;

/** Lấy URL bài đã đăng từ result trả về bởi platform publisher */
function getPostUrl(result?: Record<string, unknown> | null): string | null {
  if (!result) return null;
  if (typeof result.url === 'string' && result.url) return result.url;
  if (typeof result.videoId === 'string') return `https://youtube.com/watch?v=${result.videoId}`;
  return null;
}

// ── Grid thumbnail item ─────────────────────────────────────────────────────
function GridItem({ post, onClick }: { post: SocialPost; onClick: (p: SocialPost) => void }) {
  const meta = (PLATFORM_META as any)[post.platform] || PLATFORM_META.FACEBOOK;
  const firstMedia = post.media_urls?.[0];
  const isVideo = firstMedia ? isVideoUrl(firstMedia) : false;
  const isDrive = firstMedia ? isDriveUrl(firstMedia) : false;
  const driveFileId = isDrive && firstMedia ? extractDriveFileId(firstMedia) : null;

  const thumbSrc =
    post.thumb_url ||
    (driveFileId ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w400` : null) ||
    (!isVideo && firstMedia ? resolveMediaUrl(firstMedia) : null);

  // Video thông thường (non-Drive): dùng URL gốc để browser tự render frame đầu
  const regularVideoSrc = isVideo && !isDrive && firstMedia ? resolveMediaUrl(firstMedia) : null;

  const isOk   = post.status === 'COMPLETED';
  const isFail = post.status === 'FAILED';

  return (
    <div
      onClick={() => onClick(post)}
      className="relative aspect-square cursor-pointer overflow-hidden bg-slate-800 group"
    >
      {/* Thumbnail */}
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : regularVideoSrc ? (
        // Browser tự hiện frame đầu của video khi preload="metadata"
        <video
          src={regularVideoSrc}
          preload="metadata"
          muted
          playsInline
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        />
      ) : (
        <div className={`w-full h-full flex flex-col items-center justify-center gap-1 ${meta.color} bg-opacity-80`}>
          <span className="text-3xl">{meta.emoji}</span>
          {isVideo
            ? <FileVideo className="w-5 h-5 text-white/60" />
            : <FileImage className="w-5 h-5 text-white/60" />}
        </div>
      )}

      {/* Hover overlay — play button */}
      {(isVideo || isDrive) && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-slate-800 ml-0.5" />
          </div>
        </div>
      )}

      {/* Bottom gradient: media count (eye style như TikTok) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 pb-1.5 pt-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-white text-[11px] font-bold drop-shadow">
            <Eye className="w-3 h-3" />
            {post.media_urls?.length ?? 0}
          </span>
          <span className="text-white/70 text-[10px] font-medium">
            {meta.emoji}
          </span>
        </div>
      </div>

      {/* Status dot */}
      <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow ${
        isOk ? 'bg-emerald-400' : isFail ? 'bg-red-400' : 'bg-amber-400'
      }`} />
    </div>
  );
}

// ── Post detail modal ───────────────────────────────────────────────────────
function PostDetailModal({
  post, onClose, onRetry, onRepost, actionId, canFilter,
}: {
  post: SocialPost;
  onClose: () => void;
  onRetry: (id: string) => void;
  onRepost: (p: SocialPost) => void;
  actionId: string | null;
  canFilter: boolean;
}) {
  const meta = (PLATFORM_META as any)[post.platform] || PLATFORM_META.FACEBOOK;
  const isOk      = post.status === 'COMPLETED';
  const isFail    = post.status === 'FAILED';
  const isPending = post.status === 'PENDING';
  const hasMedia  = post.media_urls && post.media_urls.length > 0;

  const fullMsg    = post.message || '';
  const hashtagRegex = /(#\S+)/g;
  const hashtags   = fullMsg.match(hashtagRegex) || [];
  const textOnly   = fullMsg.replace(hashtagRegex, '').trim();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Media */}
          {hasMedia && (
            <div className="w-full bg-black max-h-64 overflow-hidden flex-shrink-0">
              {post.media_urls.slice(0, 1).map((url, i) => {
                const resolved = resolveMediaUrl(url);
                const isVid    = isVideoUrl(url);
                const isDrv    = isDriveUrl(url);
                const fid      = isDrv ? extractDriveFileId(url) : null;
                const thumbUrl = (i === 0 && post.thumb_url)
                  ? post.thumb_url
                  : fid ? `https://drive.google.com/thumbnail?id=${fid}&sz=w800` : null;
                const viewUrl  = fid ? `https://drive.google.com/file/d/${fid}/view` : url;

                return isVid ? (
                  isDrv ? (
                    <div key={i} className="relative w-full h-64">
                      {thumbUrl && <img src={thumbUrl} alt="" className="w-full h-full object-contain" />}
                      <a href={viewUrl} target="_blank" rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/40 transition-colors">
                        <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
                          <Play className="w-6 h-6 text-slate-800 ml-1" />
                        </div>
                      </a>
                    </div>
                  ) : (
                    <video key={i} src={resolved} controls preload="metadata"
                      className="w-full max-h-64 object-contain" />
                  )
                ) : (
                  <img key={i} src={resolved} alt=""
                    className="w-full max-h-64 object-contain" />
                );
              })}
            </div>
          )}

          <div className="p-4 overflow-y-auto flex-1">
            {/* Platform + account + status */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className={`w-7 h-7 ${meta.color} rounded-lg flex items-center justify-center text-sm flex-shrink-0 shadow-sm`}>
                {meta.emoji}
              </div>
              <span className="font-bold text-slate-900 text-sm">{meta.label}</span>
              {post.account && <span className="text-xs text-slate-400">· {post.account.name}</span>}
              {canFilter && post.user && (
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 font-bold">
                  👤 {post.user.full_name}{post.user.team ? ` · ${post.user.team}` : ''}
                </span>
              )}
              <span className={`ml-auto text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                isOk ? 'bg-emerald-100 text-emerald-700' : isFail ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {isOk ? <CheckCircle className="w-3 h-3" /> : isFail ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {isOk ? 'Thành công' : isFail ? 'Thất bại' : isPending ? 'Đang chờ' : 'Đã huỷ'}
              </span>
            </div>

            {/* Text */}
            {textOnly && (
              <p className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-line">{textOnly}</p>
            )}

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {hashtags.map((tag, i) => (
                  <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium border border-blue-100">{tag}</span>
                ))}
              </div>
            )}

            {/* Error */}
            {post.error_msg && (
              <div className="flex items-start gap-1.5 mb-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{post.error_msg}</span>
              </div>
            )}

            {/* Media count */}
            {hasMedia && post.media_urls.length > 1 && (
              <div className="text-xs text-slate-400 mb-3">📎 {post.media_urls.length} file đính kèm</div>
            )}

            {/* Link bài đã đăng */}
            {isOk && (() => {
              const postUrl = getPostUrl(post.result as Record<string, unknown> | null);
              return postUrl ? (
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 mb-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors w-full"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{postUrl}</span>
                </a>
              ) : null;
            })()}

            {/* Footer */}
            <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-3 flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                {post.source === 'SCHEDULED' ? <Calendar className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                {post.source === 'SCHEDULED' ? 'Lên lịch' : 'Đăng ngay'}
              </span>
              <span className="font-medium">{new Date(post.created_at).toLocaleString('vi')}</span>
              <div className="ml-auto flex items-center gap-1.5">
                {post.message && (
                  <button onClick={() => { navigator.clipboard.writeText(post.message); toast.success('Đã copy'); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
                {isOk && (
                  <button onClick={() => onRepost(post)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition-colors">
                    <Repeat2 className="w-3 h-3" /> Đăng lại
                  </button>
                )}
                {isFail && (
                  <button onClick={() => onRetry(post.id)} disabled={actionId === post.id}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors disabled:opacity-50">
                    <RotateCcw className={`w-3 h-3 ${actionId === post.id ? 'animate-spin' : ''}`} />
                    Thử lại
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Phân quyền
  const isAdmin   = user?.roles?.some(r => ['ADMIN', 'MANAGER'].includes(r)) ?? false;
  const isLeader  = !isAdmin && (user?.roles?.some(r => r === 'LEADER') ?? false);
  const canFilter = isAdmin || isLeader;

  const [posts, setPosts]       = useState<SocialPost[]>([]);
  const [stats, setStats]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Bộ lọc thành viên (chỉ admin/leader)
  const [members, setMembers]       = useState<HistoryMember[]>([]);
  const [teams, setTeams]           = useState<string[]>([]);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');

  // Bộ lọc nội dung
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<'all' | 'COMPLETED' | 'FAILED' | 'PENDING'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortOrder, setSortOrder]         = useState<'desc' | 'asc'>('desc');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [showFilters, setShowFilters]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');
  const [selectedPost, setSelectedPost]   = useState<SocialPost | null>(null);

  // Tải danh sách teams + members (một lần, khi mount)
  useEffect(() => {
    if (!canFilter) return;
    socialApi.history.teams().then(setTeams).catch(() => {});
    socialApi.history.members().then(setMembers).catch(() => {});
  }, [canFilter]);

  // Khi đổi team filter → tải lại members theo team đó
  useEffect(() => {
    if (!canFilter) return;
    socialApi.history.members(teamFilter !== 'all' ? teamFilter : undefined)
      .then(setMembers)
      .catch(() => {});
    setMemberFilter('all'); // reset member khi đổi team
  }, [teamFilter, canFilter]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = {
        limit: 500,
        ...(teamFilter !== 'all'   ? { team: teamFilter }         : {}),
        ...(memberFilter !== 'all' ? { employeeId: memberFilter } : {}),
      };
      const [data, s] = await Promise.all([
        socialApi.history.list(params),
        socialApi.history.stats({ team: teamFilter !== 'all' ? teamFilter : undefined, employeeId: memberFilter !== 'all' ? memberFilter : undefined }),
      ]);
      setPosts(data);
      setStats(s);
    } catch {
      toast.error('Không tải được lịch sử');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamFilter, memberFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // All unique platforms in data
  const availablePlatforms = useMemo(() =>
    Array.from(new Set(posts.map(p => p.platform))),
  [posts]);

  // Filtered + sorted list (lọc client-side)
  const filtered = useMemo(() => {
    let list = [...posts];

    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (platformFilter !== 'all') list = list.filter(p => p.platform === platformFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.message?.toLowerCase().includes(q) ||
        p.account?.name?.toLowerCase().includes(q) ||
        p.user?.full_name?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) list = list.filter(p => new Date(p.executed_at ?? p.created_at) >= new Date(dateFrom));
    if (dateTo)   list = list.filter(p => new Date(p.executed_at ?? p.created_at) <= new Date(dateTo + 'T23:59:59.999'));

    list.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });

    return list;
  }, [posts, statusFilter, platformFilter, search, dateFrom, dateTo, sortOrder]);

  const currentPageSize = viewMode === 'grid' ? GRID_PAGE_SIZE : PAGE_SIZE;
  const totalPages = Math.ceil(filtered.length / currentPageSize);
  const paginated  = filtered.slice((page - 1) * currentPageSize, page * currentPageSize);

  // Reset to page 1 when filter or viewMode changes
  useEffect(() => { setPage(1); }, [statusFilter, platformFilter, search, dateFrom, dateTo, sortOrder, teamFilter, memberFilter, viewMode]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy nội dung');
  };

  const handleRetry = async (id: string) => {
    setActionId(id);
    try {
      await socialApi.schedule.retry(id);
      toast.success('Đã đưa vào hàng chờ đăng lại');
      await loadData(true);
    } catch {
      toast.error('Retry thất bại');
    } finally {
      setActionId(null);
    }
  };

  const handleRepost = (post: SocialPost) => {
    // Lưu data vào localStorage để compose page đọc lại
    localStorage.setItem('compose_prefill', JSON.stringify({
      message: post.message,
      mediaUrls: post.media_urls || [],
      platform: post.platform,
      // accountId không gửi kèm — user tự chọn kênh đăng lại trên trang compose
    }));
    router.push('/dashboard/social/compose');
    toast.success('Đang mở trang soạn bài với nội dung đã sao chép');
  };

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setPlatformFilter('all');
    setDateFrom(''); setDateTo(''); setSortOrder('desc');
    setTeamFilter('all'); setMemberFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || platformFilter !== 'all' || dateFrom || dateTo
    || teamFilter !== 'all' || memberFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 py-6">
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
              {/* View mode toggle */}
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50'}`}
                  title="Dạng lưới"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50'}`}
                  title="Dạng danh sách"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => loadData(true)}
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

      <div className="w-full px-4 pt-5 space-y-4">

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

          {/* Bộ lọc thành viên — chỉ hiện với admin/leader */}
          {canFilter && (
            <div className="flex gap-2 flex-wrap pt-1">
              {/* Team filter — chỉ admin thấy nhiều team */}
              {isAdmin && teams.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Team:</label>
                  <select
                    value={teamFilter}
                    onChange={e => setTeamFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="all">Tất cả team</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {/* Thành viên */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Thành viên:</label>
                <select
                  value={memberFilter}
                  onChange={e => setMemberFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white max-w-[220px]"
                >
                  <option value="all">Tất cả thành viên</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}{m.team ? ` (${m.team})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {(teamFilter !== 'all' || memberFilter !== 'all') && (
                <button
                  onClick={() => { setTeamFilter('all'); setMemberFilter('all'); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 border border-indigo-200 rounded-lg bg-indigo-50"
                >
                  Xoá lọc thành viên
                </button>
              )}
            </div>
          )}

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

        {/* Post list / grid */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-0.5">
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="aspect-square bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
              ))}
            </div>
          )
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
        ) : viewMode === 'grid' ? (
          /* ── GRID VIEW ── */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-0.5">
            {paginated.map(post => (
              <GridItem key={post.id} post={post} onClick={setSelectedPost} />
            ))}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="space-y-4">
            {paginated.map((post, idx) => {
              const meta = (PLATFORM_META as any)[post.platform] || PLATFORM_META.FACEBOOK;
              const isOk      = post.status === 'COMPLETED';
              const isFail    = post.status === 'FAILED';
              const isPending = post.status === 'PENDING';
              const hasMedia  = post.media_urls && post.media_urls.length > 0;

              // Tách hashtag ra khỏi message
              const fullMsg   = post.message || '';
              const hashtagRegex = /(#\S+)/g;
              const hashtags  = fullMsg.match(hashtagRegex) || [];
              const textOnly  = fullMsg.replace(hashtagRegex, '').trim();

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* ── Media (video/ảnh) — hiển thị to luôn ── */}
                  {hasMedia && (
                    <div className="w-full bg-black">
                      {post.media_urls.map((url, i) => {
                        const resolved = resolveMediaUrl(url);
                        const isVideo  = isVideoUrl(url);
                        const isDrive  = isDriveUrl(url);
                        const driveFileId = isDrive ? extractDriveFileId(url) : null;
                        const thumbnailUrl = driveFileId
                          ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1280`
                          : null;
                        const driveViewUrl = driveFileId
                          ? `https://drive.google.com/file/d/${driveFileId}/view`
                          : url;
                        // Ảnh bìa tùy chỉnh (do user chọn) ưu tiên hơn auto-thumbnail Drive
                        const coverUrl = (i === 0 && post.thumb_url) ? post.thumb_url : thumbnailUrl;
                        return isVideo ? (
                          isDrive ? (
                            <div key={i} className="relative w-full" style={{ minHeight: '200px' }}>
                              {coverUrl && (
                                <img
                                  src={coverUrl}
                                  alt="Video thumbnail"
                                  className="w-full max-h-[480px] object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <a
                                href={driveViewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 hover:bg-black/40 transition-colors group"
                              >
                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                  <Play className="w-7 h-7 text-slate-800 ml-1" />
                                </div>
                                <span className="mt-3 text-white text-sm font-semibold flex items-center gap-1.5">
                                  Xem video trên Drive <ExternalLink className="w-3.5 h-3.5" />
                                </span>
                              </a>
                            </div>
                          ) : (
                          <video
                            key={i}
                            src={resolved}
                            controls
                            preload="metadata"
                            className="w-full max-h-[520px] object-contain"
                            onError={(e) => {
                              (e.currentTarget.parentElement as HTMLElement).innerHTML =
                                '<p class="text-xs text-slate-400 p-6 text-center">File không còn trên server</p>';
                            }}
                          />
                          )
                        ) : (
                          <a key={i} href={resolved} target="_blank" rel="noopener noreferrer">
                            <img
                              src={resolved}
                              alt=""
                              className="w-full max-h-[520px] object-contain hover:opacity-90 transition-opacity"
                              onError={(e) => {
                                (e.target as HTMLImageElement).alt = 'Ảnh không còn trên server';
                                (e.target as HTMLImageElement).style.opacity = '0.3';
                              }}
                            />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Nội dung + hashtag + thông tin ── */}
                  <div className="p-4">
                    {/* Header: platform + account + status */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className={`w-8 h-8 ${meta.color} rounded-lg flex items-center justify-center text-white text-base flex-shrink-0 shadow-sm`}>
                        {meta.emoji}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{meta.label}</span>
                      {post.account && (
                        <span className="text-xs text-slate-400 font-medium">· {post.account.name}</span>
                      )}
                      {/* Tên thành viên — chỉ hiện với admin/leader */}
                      {canFilter && post.user && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 font-bold">
                          👤 {post.user.full_name}{post.user.team ? ` · ${post.user.team}` : ''}
                        </span>
                      )}
                      {hasMedia && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 font-bold">
                          <ImageIcon className="w-3 h-3" /> {post.media_urls.length} file
                        </span>
                      )}
                      <span className={`ml-auto text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        isOk      ? 'bg-emerald-100 text-emerald-700' :
                        isFail    ? 'bg-red-100 text-red-700'         :
                        isPending ? 'bg-amber-100 text-amber-700'     :
                                    'bg-slate-100 text-slate-500'
                      }`}>
                        {isOk      ? <CheckCircle className="w-3 h-3" /> :
                         isFail    ? <XCircle className="w-3 h-3" />     :
                                     <Clock className="w-3 h-3" />}
                        {isOk ? 'Thành công' : isFail ? 'Thất bại' : isPending ? 'Đang chờ' : 'Đã huỷ'}
                      </span>
                    </div>

                    {/* Nội dung text */}
                    {textOnly && (
                      <p className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-line">
                        {textOnly}
                      </p>
                    )}
                    {!textOnly && !hasMedia && (
                      <p className="text-sm italic text-slate-400 mb-3">Không có nội dung</p>
                    )}

                    {/* Hashtags */}
                    {hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {hashtags.map((tag, i) => (
                          <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Error */}
                    {post.error_msg && (
                      <div className="flex items-start gap-1.5 mb-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{post.error_msg}</span>
                      </div>
                    )}

                    {/* Link bài đã đăng */}
                    {isOk && (() => {
                      const postUrl = getPostUrl(post.result as Record<string, unknown> | null);
                      return postUrl ? (
                        <a
                          href={postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 mb-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{postUrl}</span>
                        </a>
                      ) : null;
                    })()}

                    {/* Footer: thời gian + actions */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-100 pt-3 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        {post.source === 'SCHEDULED' ? <Calendar className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                        {post.source === 'SCHEDULED' ? 'Lên lịch' : 'Đăng ngay'}
                      </span>
                      <span className="font-medium">{new Date(post.created_at).toLocaleString('vi')}</span>

                      <div className="ml-auto flex items-center gap-1.5">
                        {post.message && (
                          <button
                            onClick={() => handleCopy(post.message)}
                            title="Copy nội dung"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isOk && (() => {
                          const postUrl = getPostUrl(post.result as Record<string, unknown> | null);
                          return postUrl ? (
                            <button
                              onClick={() => { navigator.clipboard.writeText(postUrl); toast.success('Đã copy link bài đăng'); }}
                              title="Copy link bài đăng"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-blue-400 hover:text-blue-600 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          ) : null;
                        })()}
                        {isOk && (
                          <button
                            onClick={() => handleRepost(post)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                          >
                            <Repeat2 className="w-3 h-3" /> Đăng lại
                          </button>
                        )}
                        {isFail && (
                          <button
                            onClick={() => handleRetry(post.id)}
                            disabled={actionId === post.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3 h-3 ${actionId === post.id ? 'animate-spin' : ''}`} />
                            Thử lại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Detail modal — grid mode */}
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onRetry={handleRetry}
            onRepost={handleRepost}
            actionId={actionId}
            canFilter={canFilter}
          />
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
