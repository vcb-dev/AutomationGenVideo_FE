'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CircleNotch, FilmReel, Warning, Eye, Heart, ChatCircle, FacebookLogo, TiktokLogo, InstagramLogo, YoutubeLogo } from '@phosphor-icons/react';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, ExternalVideo } from '@/services/scraperService';

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

const platformConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  facebook:  { icon: FacebookLogo,  color: 'text-blue-600',                 bg: 'bg-blue-50 dark:bg-blue-900/30',  label: 'Facebook'  },
  tiktok:    { icon: TiktokLogo,    color: 'text-slate-800 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800',  label: 'TikTok'    },
  instagram: { icon: InstagramLogo, color: 'text-pink-500',                 bg: 'bg-pink-50 dark:bg-pink-900/30',  label: 'Instagram' },
  youtube:   { icon: YoutubeLogo,   color: 'text-red-600',                  bg: 'bg-red-50 dark:bg-red-900/30',    label: 'YouTube'   },
};

function VideoCard({ video }: { video: ExternalVideo }) {
  const config = platformConfig[video.platform] ?? platformConfig.tiktok;
  const PlatformIcon = config.icon;

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden max-h-[320px]">
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
          {PlatformIcon ? <PlatformIcon size={32} className="text-slate-600" /> : <span className="text-2xl">📕</span>}
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
          {PlatformIcon ? <PlatformIcon size={12} weight="fill" /> : <span className="text-xs">📕</span>}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
          {video.description || 'Không có mô tả'}
        </p>
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
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {relativeTime(video.date_posted)}
        </p>
      </div>
    </a>
  );
}

export default function AllOwnedVideosPage() {
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
    queryKey: ['owned-channel-videos', debouncedSearch, sortBy, platform, minPlays, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.getOwnedChannelVideos(token, {
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

  return (
    <div className="flex flex-col gap-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo caption, hashtag..."
          className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <select
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="">Tất cả nền tảng</option>
          <option value="facebook">Facebook</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
        </select>
        <input
          type="number"
          value={minPlays}
          onChange={e => setMinPlays(e.target.value)}
          placeholder="Min plays"
          className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="date">Mới nhất</option>
          <option value="plays">Nhiều plays nhất</option>
          <option value="likes">Nhiều likes nhất</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Từ ngày" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Đến ngày" />
        {hasFilters && (
          <button onClick={clearFilters} className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Xóa bộ lọc
          </button>
        )}
      </div>

      <h2 className="text-sm font-semibold text-foreground">
        Tất cả video {totalVideos > 0 && <span className="font-normal text-slate-500">({totalVideos})</span>}
      </h2>

      {videosQuery.isLoading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
          <p className="text-sm text-slate-500">Đang tải videos...</p>
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
          <p className="text-xs text-slate-400 text-center max-w-sm">Thêm kênh nội bộ từ các tab Facebook, TikTok, Instagram, YouTube trước.</p>
        </div>
      )}

      {allVideos.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {allVideos.map(v => <VideoCard key={`${v.platform}-${v.post_id}`} video={v} />)}
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
            <p className="text-xs text-slate-400 text-center py-4">Đã hiển thị toàn bộ {totalVideos} videos.</p>
          )}
        </>
      )}
    </div>
  );
}
