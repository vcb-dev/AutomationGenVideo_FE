'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Heart, Eye, ChatCircle, ShareNetwork,
  VideoCamera, ArrowsClockwise, BookmarkSimple, Timer, CircleNotch, FilmReel, Globe,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';

import ReelCard from '../../components/ReelCard';
import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export default function FanpageDetailPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fanpageId } = useParams<{ fanpageId: string }>();
  const id = Number(fanpageId);

  // ─── Filter state ─────────────────────────────────────
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minViews, setMinViews] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views'>('date');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const hasFilters = !!debouncedSearch || !!dateFrom || !!dateTo || !!minViews || sortBy !== 'date';
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setMinViews(''); setSortBy('date'); };

  // ─── Fanpage detail ───────────────────────────────────
  const detailQuery = useQuery({
    queryKey: ['scraper-fanpage-detail', id],
    queryFn: () => token ? scraperService.getFanpageDetail(token, id) : Promise.reject(),
    enabled: !!token && !!id,
    refetchInterval: 5000,
  });

  const isProcessingNow = detailQuery.data?.scraping_status === 'processing';

  // ─── Reels infinite scroll ───────────────────────────
  const reelsQuery = useInfiniteQuery({
    queryKey: ['scraper-fanpage-reels', id, debouncedSearch, dateFrom, dateTo, minViews, sortBy],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject();
      return scraperService.searchReels(token, {
        fanpage_id: id,
        page: pageParam,
        page_size: 24,
        q: debouncedSearch || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        min_views: minViews ? Number(minViews) : undefined,
        sort: sortBy,
      });
    },
    getNextPageParam: (last) => last.page < last.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!token && !!id,
    refetchInterval: isProcessingNow ? 8000 : false,
  });

  const prevProcessing = useRef(false);
  useEffect(() => {
    if (prevProcessing.current && !isProcessingNow) {
      queryClient.invalidateQueries({ queryKey: ['scraper-fanpage-reels', id] });
    }
    prevProcessing.current = !!isProcessingNow;
  }, [isProcessingNow, id, queryClient]);

  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (reelsQuery.isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && reelsQuery.hasNextPage) reelsQuery.fetchNextPage();
    }, { rootMargin: '200px' });
    if (node) observerRef.current.observe(node);
  }, [reelsQuery.isFetchingNextPage, reelsQuery.hasNextPage, reelsQuery.fetchNextPage]);

  // ─── Mutations ────────────────────────────────────────
  const scrapeMutation = useMutation({
    mutationFn: () => token ? scraperService.triggerScrapeReels(token, id) : Promise.reject(),
    onSuccess: (d) => {
      if (d.is_scraping) {
        toast(d.message, { icon: '⏳' });
      } else {
        toast.success(d.message);
      }
      queryClient.invalidateQueries({ queryKey: ['scraper-fanpage-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['scraper-fanpage-reels', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (field: 'is_bookmarked' | 'is_periodic_crawl') =>
      token ? scraperService.toggleFanpage(token, id, field) : Promise.reject(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scraper-fanpage-detail', id] }),
  });

  const fp = detailQuery.data;
  const allReels = reelsQuery.data?.pages.flatMap(p => p.reels) || [];
  const totalReels = reelsQuery.data?.pages[0]?.count || 0;
  const isProcessing = isProcessingNow;

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CircleNotch size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!fp) {
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <p className="text-sm text-foreground">Không tìm thấy fanpage.</p>
        <button onClick={() => router.back()} className="text-sm text-blue-500 hover:underline">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Profile Header ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {fp.header_image_url && (
          <div className="h-32 bg-slate-100 overflow-hidden">
            <img src={fp.header_image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="px-5 pb-5 pt-4">
          <div className="flex items-start gap-4">
            <div className={`w-20 h-20 rounded-full border-4 border-card bg-slate-100 overflow-hidden flex-shrink-0 ${fp.header_image_url ? '-mt-12 relative z-10' : ''}`}>
              {fp.profile_id ? (
                <img
                  src={`https://graph.facebook.com/${fp.profile_id}/picture?type=large`}
                  alt={fp.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-400">
                  <Users size={28} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-lg font-bold text-foreground truncate">{fp.name}</h1>
              <p className="text-sm text-slate-500">@{fp.handle || fp.profile_id}</p>
            </div>

            <button
              onClick={() => router.push('/dashboard/externalChannels/facebook')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
          </div>

          <div className="flex items-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{formatNum(fp.followers_count)}</p>
              <p className="text-xs text-slate-500">Follower</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{formatNum(fp.total_views || 0)}</p>
              <p className="text-xs text-slate-500">Lượt xem</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{formatNum(fp.total_likes || 0)}</p>
              <p className="text-xs text-slate-500">Lượt thích</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{fp.reels_count}</p>
              <p className="text-xs text-slate-500">Video</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => scrapeMutation.mutate()}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              <ArrowsClockwise size={15} className={isProcessing ? 'animate-spin' : ''} />
              {isProcessing ? 'Đang cào...' : fp.is_initial_scraped ? 'Cập nhật' : 'Cào lượt đầu (300)'}
            </button>
            <button
              onClick={() => toggleMutation.mutate('is_bookmarked')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md transition-colors ${fp.is_bookmarked ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <BookmarkSimple size={15} weight={fp.is_bookmarked ? 'fill' : 'regular'} />
              {fp.is_bookmarked ? 'Đã lưu' : 'Lưu'}
            </button>
            <button
              onClick={() => toggleMutation.mutate('is_periodic_crawl')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md transition-colors ${fp.is_periodic_crawl ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Timer size={15} weight={fp.is_periodic_crawl ? 'fill' : 'regular'} />
              {fp.is_periodic_crawl ? 'Cào định kỳ: BẬT' : 'Cào định kỳ'}
            </button>
            {fp.page_url && (
              <a
                href={fp.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Globe size={15} /> Facebook
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ─── Reels Grid ─────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Video {totalReels > 0 && <span className="font-normal text-slate-500">({totalReels})</span>}
        </h2>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo caption, hashtag..."
            className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <input
            type="number"
            value={minViews}
            onChange={e => setMinViews(e.target.value)}
            placeholder="Min views"
            className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'date' | 'views')}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="date">Mới nhất</option>
            <option value="views">Nhiều views nhất</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Từ ngày" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Đến ngày" />
          {hasFilters && (
            <button onClick={clearFilters} className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Xóa bộ lọc
            </button>
          )}
        </div>

        {reelsQuery.isLoading && (
          <div className="flex justify-center py-12">
            <CircleNotch size={28} className="animate-spin text-primary" />
          </div>
        )}

        {!reelsQuery.isLoading && allReels.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
            <FilmReel size={32} className="text-slate-300" />
            <p className="text-sm text-foreground font-medium">Chưa có Reels nào</p>
            <p className="text-xs text-slate-400">Bấm &quot;Cào lượt đầu&quot; để bắt đầu.</p>
          </div>
        )}

        {allReels.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {allReels.map(reel => (
                <ReelCard key={reel.post_id} reel={reel} />
              ))}
              {reelsQuery.isFetchingNextPage && Array.from({ length: 6 }).map((_, i) => (
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
            {!reelsQuery.hasNextPage && (
              <p className="text-xs text-slate-400 text-center py-4">Đã hiển thị toàn bộ {totalReels} video.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
