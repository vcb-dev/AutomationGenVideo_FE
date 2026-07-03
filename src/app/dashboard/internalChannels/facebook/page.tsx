'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  CircleNotch, FilmReel, Warning, CaretDown, CaretUp,
  Eye, ThumbsUp, ChatCircle, VideoCamera, Users, ArrowsClockwise, Archive,
  SquaresFour, Rows, Buildings, UserCircle,
} from '@phosphor-icons/react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import PageTableRow from '../PageTableRow';
import { useAuthStore } from '@/store/auth-store';
import { FacebookPage, PaginatedPages, PageFilters } from '@/types/facebook';
import { facebookService } from '@/services/facebookService';
import { scraperService, ExternalVideo } from '@/services/scraperService';
import { channelsService, ChannelInfo } from '@/services/channelsService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function relativeTime(dateStr: string): string {
  const diffD = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffD === 0) return 'Hôm nay';
  if (diffD < 7) return `${diffD} ngày trước`;
  if (diffD < 30) return `${Math.floor(diffD / 7)} tuần trước`;
  if (diffD < 365) return `${Math.floor(diffD / 30)} tháng trước`;
  return `${Math.floor(diffD / 365)} năm trước`;
}

// ─── FacebookPageCard ────────────────────────────────────────────────────────

function FacebookPageCard({
  page: p,
  channelInfo,
  onViewVideos,
  onScrape,
  onBackfill,
}: {
  page: FacebookPage;
  channelInfo: ChannelInfo;
  onViewVideos: () => void;
  onScrape: () => void;
  onBackfill: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Status badges */}
      {(p.is_scraping || !p.is_active) && (
        <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-0">
          {p.is_scraping && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-xs font-medium">
              <CircleNotch size={10} weight="bold" className="animate-spin" /> Đang cào
            </span>
          )}
          {!p.is_active && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-xs font-medium">
              Inactive
            </span>
          )}
        </div>
      )}

      {/* Avatar + info */}
      <div className="flex items-center gap-3 p-3.5 pb-2">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-600">
          <img
            src={`https://graph.facebook.com/${p.page_id}/picture?type=large`}
            alt={p.name}
            className="w-full h-full object-cover"
            onError={e => {
              const t = e.target as HTMLImageElement;
              if (p.avatar_url && t.src !== p.avatar_url) t.src = p.avatar_url;
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
          {p.username && <p className="text-xs text-slate-400 truncate">@{p.username}</p>}
          {p.category && <p className="text-xs text-slate-400 truncate">{p.category}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-blue-500" />
          <span className="text-sm font-bold text-foreground">{formatNum(p.followers_count)}</span>
        </div>
        {p.likes_count > 0 && (
          <div className="flex items-center gap-1.5">
            <ThumbsUp size={13} className="text-pink-500" />
            <span className="text-xs text-slate-500">{formatNum(p.likes_count)}</span>
          </div>
        )}
        {(p.video_count ?? 0) > 0 && (
          <div className="flex items-center gap-1.5">
            <VideoCamera size={13} className="text-purple-500" />
            <span className="text-xs text-slate-500">{p.video_count}</span>
          </div>
        )}
      </div>

      {/* Team / Owner */}
      <div className="grid grid-cols-2 gap-x-3 px-3.5 py-2 border-t border-border/50 bg-slate-50/30 dark:bg-slate-800/20">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
            <Buildings size={10} />
            <span className="text-[10px] uppercase tracking-wide">Team</span>
          </div>
          <p className={`text-xs truncate ${channelInfo.team_name ? 'font-medium text-foreground' : 'italic text-slate-400'}`}>
            {channelInfo.team_name ?? 'Chưa có dữ liệu'}
          </p>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
            <UserCircle size={10} />
            <span className="text-[10px] uppercase tracking-wide">Chủ kênh</span>
          </div>
          <p className={`text-xs truncate ${channelInfo.owner_name ? 'font-medium text-foreground' : 'italic text-slate-400'}`}>
            {channelInfo.owner_name ?? 'Chưa có dữ liệu'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-border bg-slate-50/50 dark:bg-slate-800/30">
        <button
          onClick={onViewVideos}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-r border-border"
        >
          <VideoCamera size={13} weight="bold" /> Xem video
        </button>
        <button
          onClick={onScrape}
          disabled={p.is_scraping}
          className="flex items-center gap-1 px-3 py-2.5 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors border-r border-border disabled:opacity-40"
          title="Cào video mới"
        >
          {p.is_scraping
            ? <CircleNotch size={13} weight="bold" className="animate-spin" />
            : <ArrowsClockwise size={13} weight="bold" />}
        </button>
        <button
          onClick={onBackfill}
          disabled={p.is_scraping}
          className="flex items-center gap-1 px-3 py-2.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
          title="Backfill video cũ"
        >
          <Archive size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── FbVideoCard ─────────────────────────────────────────────────────────────

function FbVideoCard({ video: v }: { video: ExternalVideo }) {
  return (
    <a
      href={v.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden max-h-[280px]">
        {v.thumbnail_url ? (
          <img
            src={v.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1"><Eye size={12} weight="fill" />{formatNum(v.play_count)}</span>
            <span className="flex items-center gap-1"><ThumbsUp size={12} weight="fill" />{formatNum(v.likes_count)}</span>
            <span className="flex items-center gap-1"><ChatCircle size={12} weight="fill" />{formatNum(v.comments_count)}</span>
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{v.description || 'Không có mô tả'}</p>
        {v.author_name && (
          <div className="flex items-center gap-1.5 mt-auto pt-1.5">
            <img
              src={v.author_id ? `https://graph.facebook.com/${v.author_id}/picture?type=small` : (v.author_avatar || '')}
              alt=""
              className="w-4 h-4 rounded-full"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-xs text-slate-500 truncate">{v.author_name}</span>
          </div>
        )}
        <p className="text-xs text-slate-400">{relativeTime(v.date_posted)}</p>
      </div>
    </a>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FacebookChannelsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const autoSyncDone = useRef(false);

  // ── Pages state ──────────────────────────────────────────
  const [pagesData, setPagesData] = useState<PaginatedPages | null>(null);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pagesCollapsed, setPagesCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const searchTimer = useRef<NodeJS.Timeout>();
  useEffect(() => {
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchPages = useCallback(async () => {
    if (!token) return;
    setPagesLoading(true);
    try {
      const filters: PageFilters = {
        page, page_size: pageSize,
        search: debouncedSearch || undefined,
        status: status || undefined,
      };
      const result = await facebookService.getPages(token, filters);
      if (result.count === 0 && !autoSyncDone.current && !debouncedSearch && !status) {
        autoSyncDone.current = true;
        setSyncing(true);
        const synced = await facebookService.syncAndGetPages(token);
        if (synced.length > 0) toast.success(`Đã tìm thấy ${synced.length} kênh Facebook!`);
        setSyncing(false);
        setPagesData(await facebookService.getPages(token, filters));
      } else {
        setPagesData(result);
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi tải danh sách kênh');
    } finally {
      setPagesLoading(false);
    }
  }, [token, page, debouncedSearch, status]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleScrape = async (pg: FacebookPage) => {
    if (!token) return;
    try {
      const res = await facebookService.triggerScrape(token, pg.page_id);
      toast.success(res.message);
      pollUntilDone(pg.page_id);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleBackfill = async (pg: FacebookPage) => {
    if (!token) return;
    try {
      const res = await facebookService.triggerBackfill(token, pg.page_id);
      toast.success(res.message);
      pollUntilDone(pg.page_id);
    } catch (e: any) { toast.error(e.message); }
  };

  const pollUntilDone = (pageId: string) => {
    setPagesData(prev => prev ? {
      ...prev,
      pages: prev.pages.map(p => p.page_id === pageId ? { ...p, is_scraping: true } : p),
    } : prev);
    const interval = setInterval(async () => {
      if (!token) return;
      try {
        const all = await facebookService.getPages(token, { page: 1, page_size: 1000 });
        const target = all.pages.find(p => p.page_id === pageId);
        if (target && !target.is_scraping) {
          clearInterval(interval);
          fetchPages();
          toast.success(`Cào xong ${target.name}: ${target.video_count || 0} video`);
        }
      } catch { clearInterval(interval); }
    }, 5000);
    setTimeout(() => clearInterval(interval), 300_000);
  };

  const pages = pagesData?.pages || [];
  const totalPagesCount = pagesData?.total_pages || 1;
  const totalCount = pagesData?.count || 0;

  const [channelInfoMap, setChannelInfoMap] = useState<Record<string, ChannelInfo>>({});
  const pagesKey = pages.map(p => p.page_id).join(',');
  useEffect(() => {
    if (!pages.length) return;
    const identifiers = pages.flatMap(p => [
      p.page_id,
      p.username,
      `https://www.facebook.com/${p.page_id}`,
      `https://facebook.com/${p.page_id}`,
      p.username ? `https://www.facebook.com/${p.username}` : null,
      p.username ? `https://facebook.com/${p.username}` : null,
      p.username ? `https://fb.com/${p.username}` : null,
    ].filter(Boolean) as string[]);
    channelsService.scraperLookup(identifiers).then(setChannelInfoMap);
  }, [pagesKey]);

  const getFbChannelInfo = (p: FacebookPage): ChannelInfo => {
    const keys = [
      p.page_id,
      p.username,
      `https://www.facebook.com/${p.page_id}`,
      `https://facebook.com/${p.page_id}`,
      p.username ? `https://www.facebook.com/${p.username}` : null,
      p.username ? `https://facebook.com/${p.username}` : null,
      p.username ? `https://fb.com/${p.username}` : null,
    ].filter(Boolean) as string[];
    for (const k of keys) if (channelInfoMap[k]) return channelInfoMap[k];
    return { team_name: null, owner_name: null };
  };

  // ── Videos state ─────────────────────────────────────────
  const [videoSearch, setVideoSearch] = useState('');
  const [debouncedVideoSearch, setDebouncedVideoSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const videoSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    videoSearchTimer.current = setTimeout(() => setDebouncedVideoSearch(videoSearch), 300);
    return () => clearTimeout(videoSearchTimer.current);
  }, [videoSearch]);

  const videosQuery = useInfiniteQuery({
    queryKey: ['owned-fb-videos', debouncedVideoSearch, sortBy, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.getOwnedChannelVideos(token, {
        page: pageParam,
        page_size: 24,
        platform: 'facebook',
        q: debouncedVideoSearch || undefined,
        sort: sortBy,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
    },
    getNextPageParam: (last) => last.page < last.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!token,
  });

  const allVideos = videosQuery.data?.pages.flatMap(p => p.videos) || [];
  const totalVideos = videosQuery.data?.pages[0]?.count || 0;

  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (videosQuery.isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && videosQuery.hasNextPage) videosQuery.fetchNextPage();
    }, { rootMargin: '200px' });
    if (node) observerRef.current.observe(node);
  }, [videosQuery.isFetchingNextPage, videosQuery.hasNextPage, videosQuery.fetchNextPage]);

  const hasVideoFilters = !!debouncedVideoSearch || !!dateFrom || !!dateTo || sortBy !== 'date';

  return (
    <div className="flex flex-col gap-5">

      {/* ── Pages Section (collapsible) ──────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setPagesCollapsed(!pagesCollapsed)}
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <h2 className="text-sm font-semibold text-foreground">
              Kênh Facebook {totalCount > 0 && <span className="font-normal text-slate-500">({totalCount})</span>}
            </h2>
            {pagesCollapsed ? <CaretDown size={15} /> : <CaretUp size={15} />}
          </button>

          {/* View mode toggle */}
          {!pagesCollapsed && (
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-slate-400 hover:text-foreground'}`}
                title="Dạng card"
              >
                <SquaresFour size={15} weight={viewMode === 'card' ? 'fill' : 'regular'} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-slate-400 hover:text-foreground'}`}
                title="Dạng bảng"
              >
                <Rows size={15} weight={viewMode === 'table' ? 'fill' : 'regular'} />
              </button>
            </div>
          )}
        </div>

        {!pagesCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên kênh..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <select
                value={status}
                onChange={e => { setStatus(e.target.value as any); setPage(1); }}
                className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Loading / empty / grid */}
            {pagesLoading || syncing ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <CircleNotch size={24} weight="bold" className="animate-spin text-primary" />
                <p className="text-sm text-slate-500">{syncing ? 'Đang đồng bộ...' : 'Đang tải...'}</p>
              </div>
            ) : pages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                {debouncedSearch || status ? 'Không tìm thấy kết quả.' : 'Chưa có kênh Facebook nào.'}
              </p>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pages.map(p => (
                  <FacebookPageCard
                    key={p.page_id}
                    page={p}
                    channelInfo={getFbChannelInfo(p)}
                    onViewVideos={() => router.push(`/dashboard/channels/facebook/${p.page_id}/videos`)}
                    onScrape={() => handleScrape(p)}
                    onBackfill={() => handleBackfill(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span className="w-10"></span>
                  <span>Kênh</span>
                  <span className="w-28 text-center">Followers</span>
                  <span className="w-20 text-center">Likes</span>
                  <span className="w-24 text-center">Team</span>
                  <span className="w-40 text-center">Chủ kênh</span>
                  <span className="w-28 text-center">Trạng thái</span>
                  <span className="w-48 text-center">Hành động</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pages.map(p => (
                    <PageTableRow
                      key={p.page_id}
                      page={p}
                      channelInfo={getFbChannelInfo(p)}
                      onViewVideos={() => router.push(`/dashboard/channels/facebook/${p.page_id}/videos`)}
                      onTriggerScrape={() => handleScrape(p)}
                      onBackfill={() => handleBackfill(p)}
                      loadingVideos={false}
                      selectedPageId={undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPagesCount > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">Trang {page}/{totalPagesCount}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
                    <ChevronLeft size={12} /> Trước
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPagesCount, p + 1))} disabled={page >= totalPagesCount} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
                    Sau <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Videos Section ───────────────────────────────── */}
      <div>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-4 mb-4">
          <input
            type="text"
            value={videoSearch}
            onChange={e => setVideoSearch(e.target.value)}
            placeholder="Tìm theo caption, hashtag..."
            className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="date">Mới nhất</option>
            <option value="plays">Nhiều views nhất</option>
            <option value="likes">Nhiều likes nhất</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Từ ngày" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Đến ngày" />
          {hasVideoFilters && (
            <button onClick={() => { setVideoSearch(''); setSortBy('date'); setDateFrom(''); setDateTo(''); }} className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
              Xóa bộ lọc
            </button>
          )}
        </div>

        <h2 className="text-sm font-semibold text-foreground mb-3">
          Video {totalVideos > 0 && <span className="font-normal text-slate-500">({totalVideos})</span>}
        </h2>

        {videosQuery.isLoading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
            <p className="text-sm text-slate-500">Đang tải video...</p>
          </div>
        )}

        {videosQuery.isError && (
          <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
            <Warning size={32} className="text-amber-500" />
            <p className="text-sm text-foreground">Có lỗi xảy ra.</p>
            <button onClick={() => videosQuery.refetch()} className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-slate-50">Thử lại</button>
          </div>
        )}

        {!videosQuery.isLoading && !videosQuery.isError && allVideos.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
            <FilmReel size={32} className="text-slate-300" />
            <p className="text-sm text-foreground font-medium">Chưa có video nào</p>
            <p className="text-xs text-slate-400 text-center max-w-sm">Bấm nút cào trên từng kênh để lấy video về.</p>
          </div>
        )}

        {allVideos.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allVideos.map(v => <FbVideoCard key={v.post_id} video={v} />)}
              {videosQuery.isFetchingNextPage && Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-[9/16] max-h-[280px] bg-slate-200 dark:bg-slate-700" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
            <div ref={loadMoreRef} className="h-4" />
            {!videosQuery.hasNextPage && (
              <p className="text-xs text-slate-400 text-center py-4">Đã hiển thị toàn bộ {totalVideos} video.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
