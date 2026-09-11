'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CircleNotch, FilmReel, Warning, Eye, Heart, ChatCircle, FacebookLogo, TiktokLogo, InstagramLogo, PaperPlaneTilt, MagnifyingGlass, X, ArrowsDownUp, SquaresFour } from '@phosphor-icons/react';

import { useAuthStore } from '@/store/auth-store';
import { platformStyle } from '@/lib/platform-config';
import { scraperService, ExternalVideo } from '@/services/scraperService';
import { videoLibraryService } from '@/services/videoLibraryService';
import { useSubmitVideoToLibrary } from '@/hooks/useProposeVideo';
import { dedupeById } from '@/lib/dedupe-pages';
import FilterSelect from '../components/FilterSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import WatchFeedButton from '../components/WatchFeedButton';
import QuickAddChannel from '../components/QuickAddChannel';

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const posted = new Date(dateStr).getTime();
  const diffMs = now - posted;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} ngày trước`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 5) return `${diffW} tuần trước`;
  const diffM = Math.floor(diffD / 30);
  if (diffM < 12) return `${diffM} tháng trước`;
  return `${Math.floor(diffD / 365)} năm trước`;
}

function proxyImg(url: string, platform: string): string {
  if (!url) return '';
  if (platform === 'instagram' && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function getAuthorAvatar(video: ExternalVideo): string {
  if (video.platform === 'facebook' && video.author_id) {
    return `https://graph.facebook.com/${video.author_id}/picture?type=small`;
  }
  if (video.platform === 'instagram' && video.author_avatar) {
    return proxyImg(video.author_avatar, 'instagram');
  }
  return video.author_avatar || '';
}


function AllVideoCard({ video }: { video: ExternalVideo }) {
  // platformStyle LUÔN trả về kiểu dáng dùng được. Tra thẳng vào bảng rồi `.icon` như
  // trước là cách đã làm trang này vỡ trắng khi gặp video Douyin.
  const config = platformStyle(video.platform);
  const PlatformIcon = config.icon;
  const { token } = useAuthStore();
  // Leader/Admin them thang vao Bo Suu Tap, con lai vao hang cho duyet — xem useProposeVideo.ts
  const { submit, successMessage, actionLabel, doneLabel } = useSubmitVideoToLibrary();
  const proposeMutation = useMutation({
    mutationFn: () => {
      return submit({
        video_id: video.post_id,
        platform: video.platform,
        title: video.description?.slice(0, 200) || '',
        description: video.description || '',
        video_url: video.url,
        author_username: video.author_username || '',
        author_name: video.author_name || '',
        thumbnail_url: video.thumbnail_url || undefined,
        views_count: video.play_count,
        likes_count: video.likes_count,
        comments_count: video.comments_count,
        source: 'SCRAPED',
      });
    },
    onSuccess: () => toast.success(successMessage),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col">
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden"
      >
        {video.thumbnail_url ? (
          <img
            src={proxyImg(video.thumbnail_url, video.platform)}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 -z-10">
          <PlatformIcon size={32} className="text-slate-600" />
        </div>

        {/* Metrics overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2.5 pt-8">
          <div className="flex items-center gap-2.5 text-white text-xs">
            <span className="flex items-center gap-1">
              <Eye size={12} weight="fill" />
              {formatNum(video.play_count)}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={12} weight="fill" />
              {formatNum(video.likes_count)}
            </span>
            <span className="flex items-center gap-1">
              <ChatCircle size={12} weight="fill" />
              {formatNum(video.comments_count)}
            </span>
          </div>
        </div>

        {/* Duration badge */}
        {video.duration_seconds && video.duration_seconds > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-white text-xs font-medium">
            {Math.floor(video.duration_seconds / 60)}:{String(Math.round(video.duration_seconds % 60)).padStart(2, '0')}
          </div>
        )}

        {/* Platform badge */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
          <PlatformIcon size={12} weight="fill" />
        </div>
      </a>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
          {video.description || 'Không có mô tả'}
        </p>

        {/* Author */}
        <div className="flex items-center gap-2 mt-auto pt-1.5">
          <img
            src={getAuthorAvatar(video)}
            alt=""
            className="w-5 h-5 rounded-full ring-1 ring-slate-200 dark:ring-slate-600"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {video.author_name || `@${video.author_username}`}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {relativeTime(video.date_posted)}
          </p>
          <button
            onClick={() => proposeMutation.mutate()}
            disabled={proposeMutation.isPending || proposeMutation.isSuccess}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {proposeMutation.isPending ? (
              <CircleNotch size={12} weight="bold" className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={12} weight="bold" />
            )}
            {proposeMutation.isSuccess ? doneLabel : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AllExternalVideosPage() {
  const { token } = useAuthStore();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [platform, setPlatform] = useState('');
  const [minPlays, setMinPlays] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const hasFilters = !!debouncedSearch || !!platform || !!minPlays || !!dateFrom || !!dateTo || sortBy !== 'date';
  const clearFilters = () => { setSearch(''); setPlatform(''); setMinPlays(''); setDateFrom(''); setDateTo(''); setSortBy('date'); };

  const videosQuery = useInfiniteQuery({
    queryKey: ['all-external-videos', debouncedSearch, sortBy, platform, minPlays, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.getAllExternalVideos(token, {
        page: pageParam,
        page_size: 24,
        q: debouncedSearch || undefined,
        sort: sortBy,
        platform: platform || undefined,
        min_plays: minPlays ? Number(minPlays) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
    },
    getNextPageParam: (last) => last.page < last.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!token,
  });

  const allVideos = dedupeById(videosQuery.data?.pages.flatMap(p => p.videos) || []);
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

  return (
    <div className="flex flex-col gap-5">
      <QuickAddChannel />

      <div>
        <WatchFeedButton platform="all" label="Xem ngay tại đây" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border rounded-xl p-3 shadow-xs">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo caption, hashtag..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <FilterSelect
          value={platform}
          onChange={setPlatform}
          options={[
            { value: '', label: 'Tất cả nền tảng' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'instagram', label: 'Instagram' },
          ]}
          placeholder="Tất cả nền tảng"
          icon={<SquaresFour size={15} />}
        />
        <div className="relative w-32">
          <Eye size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="number"
            value={minPlays}
            onChange={e => setMinPlays(e.target.value)}
            placeholder="Min view"
            className="w-full pl-8 pr-6 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {minPlays && (
            <button
              type="button"
              onClick={() => setMinPlays('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <FilterSelect
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: 'date', label: 'Mới nhất' },
            { value: 'plays', label: 'Nhiều views nhất' },
            { value: 'likes', label: 'Nhiều likes nhất' },
          ]}
          placeholder="Sắp xếp"
          icon={<ArrowsDownUp size={15} />}
        />
        <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Từ ngày" />
        <DatePicker value={dateTo} onChange={setDateTo} placeholder="Đến ngày" align="right" />
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all cursor-pointer select-none ml-auto sm:ml-0"
          >
            <X size={13} weight="bold" /> Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Count */}
      <h2 className="text-sm font-semibold text-foreground">
        Tất cả video {totalVideos > 0 && <span className="font-normal text-slate-500">({totalVideos})</span>}
      </h2>

      {/* Loading */}
      {videosQuery.isLoading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
          <p className="text-sm text-slate-500">Đang tải videos...</p>
        </div>
      )}

      {/* Error */}
      {videosQuery.isError && (
        <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
          <Warning size={32} className="text-amber-500" />
          <p className="text-sm text-foreground">Có lỗi xảy ra.</p>
          <button onClick={() => videosQuery.refetch()} className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-slate-50">Thử lại</button>
        </div>
      )}

      {/* Empty */}
      {!videosQuery.isLoading && !videosQuery.isError && allVideos.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
          <FilmReel size={32} className="text-slate-300" />
          <p className="text-sm text-foreground font-medium">Chưa có video nào</p>
          <p className="text-xs text-slate-400 text-center max-w-sm">Cào dữ liệu từ các tab Facebook, TikTok, Instagram trước.</p>
        </div>
      )}

      {/* Grid */}
      {allVideos.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {allVideos.map(v => <AllVideoCard key={`${v.platform}-${v.post_id}`} video={v} />)}
            {videosQuery.isFetchingNextPage && Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-[9/16] bg-slate-200 dark:bg-slate-700" />
                <div className="p-3 space-y-2"><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" /><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" /></div>
              </div>
            ))}
          </div>
          <div ref={loadMoreRef} className="h-4" />
          {!videosQuery.hasNextPage && <p className="text-xs text-slate-400 text-center py-4">Đã hiển thị toàn bộ {totalVideos} videos.</p>}
        </>
      )}
    </div>
  );
}
