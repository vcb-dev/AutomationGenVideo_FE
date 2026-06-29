'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleNotch, FilmReel, Warning, CaretDown, CaretUp, FacebookLogo, MagnifyingGlassPlus } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import DiscoveryBar from '../components/DiscoveryBar';
import FanpageCard from '../components/FanpageCard';
import ReelCard from '../components/ReelCard';
import FilterPanel from '../components/FilterPanel';
import { useAuthStore } from '@/store/auth-store';
import { scraperService, ScrapedFanpage } from '@/services/scraperService';

const PAGE_SIZE_FANPAGES = 12;
const PAGE_SIZE_REELS = 24;

export default function FacebookExternalPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fanpage pagination + search
  const [fpPage, setFpPage] = useState(1);
  const [fpSearch, setFpSearch] = useState('');
  const [debouncedFpSearch, setDebouncedFpSearch] = useState('');
  const fpSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fpSearchTimer.current = setTimeout(() => { setDebouncedFpSearch(fpSearch); setFpPage(1); }, 300);
    return () => clearTimeout(fpSearchTimer.current);
  }, [fpSearch]);

  // Reels filter
  const [reelSearch, setReelSearch] = useState('');
  const [selectedFanpage, setSelectedFanpage] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [minViews, setMinViews] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [debouncedReelSearch, setDebouncedReelSearch] = useState('');
  const reelSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    reelSearchTimer.current = setTimeout(() => setDebouncedReelSearch(reelSearch), 300);
    return () => clearTimeout(reelSearchTimer.current);
  }, [reelSearch]);

  // Collapse fanpages section
  const [fpCollapsed, setFpCollapsed] = useState(false);

  // Scrape by URL
  const [pageUrl, setPageUrl] = useState('');
  const scrapeByUrlMutation = useMutation({
    mutationFn: (url: string) => {
      if (!token) throw new Error('No token');
      return scraperService.fanpageScrapeByUrl(token, url);
    },
    onSuccess: (data) => {
      if (data.already_exists) {
        toast(data.message, { icon: '📋' });
        router.push(`/dashboard/externalChannels/facebook/${data.fanpage_id}`);
      } else if (data.is_scraping) {
        toast(data.message, { icon: '⏳' });
      } else {
        toast.success(data.message);
      }
      setPageUrl('');
      queryClient.invalidateQueries({ queryKey: ['scraper-fanpages'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Fanpages Query (paginated from backend) ─────────
  const fanpagesQuery = useQuery({
    queryKey: ['scraper-fanpages', fpPage, debouncedFpSearch],
    queryFn: () => token ? scraperService.getFanpages(token, {
      page: fpPage, page_size: PAGE_SIZE_FANPAGES, search: debouncedFpSearch || undefined,
    }) : Promise.reject('No token'),
    enabled: !!token,
    refetchInterval: 15000,
  });

  // ─── Reels Infinite Scroll ────────────────────────────
  const reelsQuery = useInfiniteQuery({
    queryKey: ['scraper-reels', debouncedReelSearch, selectedFanpage, sortBy, minViews, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.searchReels(token, {
        q: debouncedReelSearch || undefined,
        page: pageParam,
        page_size: PAGE_SIZE_REELS,
        fanpage_id: selectedFanpage ? Number(selectedFanpage) : undefined,
        sort: sortBy,
        min_views: minViews ? Number(minViews) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
    },
    getNextPageParam: (lastPage) => lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!token,
  });

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
    mutationFn: (fp: ScrapedFanpage) => {
      if (!token) throw new Error('No token');
      return scraperService.triggerScrapeReels(token, fp.id);
    },
    onSuccess: (data) => {
      if (data.is_scraping) {
        toast(data.message, { icon: '⏳' });
      } else {
        toast.success(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['scraper-fanpages'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: 'is_bookmarked' | 'is_periodic_crawl' }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleFanpage(token, id, field);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scraper-fanpages'] }),
  });

  // ─── Handlers ─────────────────────────────────────────
  const handleDiscoveryTriggered = () => {
    toast.success('Hệ thống đang tìm kiếm Fanpage mới từ Google...');
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['scraper-fanpages'] }), 15000);
  };

  const fpData = fanpagesQuery.data;
  const fanpages = fpData?.fanpages || [];
  const fpTotalPages = fpData?.total_pages || 1;
  const fpTotal = fpData?.count || 0;

  const allReels = reelsQuery.data?.pages.flatMap(p => p.reels) || [];
  const totalReels = reelsQuery.data?.pages[0]?.count || 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Scrape by URL */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <FacebookLogo size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
            <input
              type="text"
              value={pageUrl}
              onChange={e => setPageUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pageUrl.trim()) scrapeByUrlMutation.mutate(pageUrl.trim()); }}
              placeholder="Nhập Facebook page URL (vd: https://www.facebook.com/pagename)"
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <button
            onClick={() => scrapeByUrlMutation.mutate(pageUrl.trim())}
            disabled={scrapeByUrlMutation.isPending || !pageUrl.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-sm hover:shadow-md transition-all"
          >
            {scrapeByUrlMutation.isPending ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : (
              <MagnifyingGlassPlus size={16} weight="bold" />
            )}
            {scrapeByUrlMutation.isPending ? 'Đang gửi...' : 'Cào Reels'}
          </button>
        </div>
      </div>

      {/* Discovery Bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <DiscoveryBar onDiscoveryTriggered={handleDiscoveryTriggered} />
      </div>

      {/* ─── Fanpages Section (collapsible) ─────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setFpCollapsed(!fpCollapsed)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Fanpages ({fpTotal})
          </h2>
          {fpCollapsed ? <CaretDown size={16} /> : <CaretUp size={16} />}
        </button>

        {!fpCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            <input
              type="text"
              value={fpSearch}
              onChange={e => setFpSearch(e.target.value)}
              placeholder="Tìm fanpage theo tên..."
              className="w-full max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />

            {fanpagesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <CircleNotch size={24} className="animate-spin text-primary" />
              </div>
            ) : fanpages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Chưa có fanpage nào.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {fanpages.map(fp => (
                  <FanpageCard
                    key={fp.id}
                    fanpage={fp}
                    onScrapeReels={() => scrapeMutation.mutate(fp)}
                    onToggleBookmark={() => toggleMutation.mutate({ id: fp.id, field: 'is_bookmarked' })}
                    onTogglePeriodic={() => toggleMutation.mutate({ id: fp.id, field: 'is_periodic_crawl' })}
                    onViewDetail={() => router.push(`/dashboard/externalChannels/facebook/${fp.id}`)}
                  />
                ))}
              </div>
            )}

            {fpTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">Trang {fpPage}/{fpTotalPages}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFpPage(p => Math.max(1, p - 1))} disabled={fpPage <= 1} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
                    <ChevronLeft size={12} /> Trước
                  </button>
                  <button onClick={() => setFpPage(p => Math.min(fpTotalPages, p + 1))} disabled={fpPage >= fpTotalPages} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
                    Sau <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Reels Section ───────────────────────────────── */}
      <div>
        <FilterPanel
          search={reelSearch}
          onSearchChange={setReelSearch}
          selectedFanpage={selectedFanpage}
          onFanpageChange={setSelectedFanpage}
          sortBy={sortBy}
          onSortChange={setSortBy}
          minViews={minViews}
          onMinViewsChange={setMinViews}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          fanpages={fanpages}
        />

        <h2 className="text-sm font-semibold text-foreground my-3">
          Reels {totalReels > 0 && <span className="font-normal text-slate-500">({totalReels})</span>}
        </h2>

        {reelsQuery.isLoading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
            <p className="text-sm text-slate-500">Đang tải Reels...</p>
          </div>
        )}

        {reelsQuery.isError && (
          <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
            <Warning size={32} className="text-amber-500" />
            <p className="text-sm text-foreground">Có lỗi xảy ra khi tải dữ liệu.</p>
            <button onClick={() => reelsQuery.refetch()} className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-slate-50">Thử lại</button>
          </div>
        )}

        {!reelsQuery.isLoading && !reelsQuery.isError && allReels.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
            <FilmReel size={32} className="text-slate-300" />
            <p className="text-sm text-foreground font-medium">Không tìm thấy Reels nào</p>
            <p className="text-xs text-slate-400 text-center max-w-sm">Thử thay đổi bộ lọc hoặc bấm &quot;Khám phá ngay&quot; để cào dữ liệu mới.</p>
          </div>
        )}

        {allReels.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allReels.map(reel => <ReelCard key={reel.post_id} reel={reel} />)}
              {reelsQuery.isFetchingNextPage && Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-[9/16] max-h-[280px] bg-slate-200 dark:bg-slate-700" />
                  <div className="p-3 space-y-2"><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" /><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" /></div>
                </div>
              ))}
            </div>
            <div ref={loadMoreRef} className="h-4" />
            {!reelsQuery.hasNextPage && <p className="text-xs text-slate-400 text-center py-4">Đã hiển thị toàn bộ {totalReels} Reels.</p>}
          </>
        )}
      </div>
    </div>
  );
}
