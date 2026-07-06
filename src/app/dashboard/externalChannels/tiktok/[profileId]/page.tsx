'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Heart, Eye, ChatCircle, ShareNetwork,
  VideoCamera, ArrowsClockwise, BookmarkSimple, Timer, CircleNotch,
  FilmReel, SealCheck,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, TikTokProfileVideo } from '@/services/scraperService';
import { useScrapingStore } from '@/store/scraping-store';

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

function ProfileVideoCard({ video }: { video: TikTokProfileVideo }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden max-h-[320px]">
        {video.cover_image ? (
          <img
            src={video.cover_image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
            <VideoCamera size={32} />
          </div>
        )}

        {/* Metrics overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2.5 pt-8">
          <div className="flex items-center gap-2.5 text-white text-xs">
            <span className="flex items-center gap-1">
              <Eye size={12} weight="fill" />
              {formatNum(video.play_count)}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={12} weight="fill" />
              {formatNum(video.digg_count)}
            </span>
            <span className="flex items-center gap-1">
              <ChatCircle size={12} weight="fill" />
              {formatNum(video.comment_count)}
            </span>
          </div>
        </div>

        {/* Duration badge */}
        {video.video_duration > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-white text-xs font-medium">
            {Math.floor(video.video_duration / 60)}:{String(video.video_duration % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
          {video.description}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-auto">
          {relativeTime(video.date_posted)}
        </p>
      </div>
    </a>
  );
}

export default function TikTokProfileDetailPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profileId } = useParams<{ profileId: string }>();
  const id = Number(profileId);
  const { addNotification, updateNotification } = useScrapingStore();
  const scrapeNotifIdRef = useRef<string | null>(null);
  const beforeVideoCountRef = useRef(0);

  // ─── Filter state ─────────────────────────────────────
  const [search, setSearch] = useState('');
  const [minPlays, setMinPlays] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'plays' | 'likes'>('date');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const hasFilters = !!debouncedSearch || !!minPlays || sortBy !== 'date';
  const clearFilters = () => { setSearch(''); setMinPlays(''); setSortBy('date'); };

  // ─── Profile detail ───────────────────────────────────
  const detailQuery = useQuery({
    queryKey: ['tiktok-profile-detail', id],
    queryFn: () => token ? scraperService.getTiktokProfileDetail(token, id) : Promise.reject(),
    enabled: !!token && !!id,
    refetchInterval: 5000,
  });

  const isProcessingNow = detailQuery.data?.scraping_status === 'processing';

  // ─── Videos infinite scroll ───────────────────────────
  const videosQuery = useInfiniteQuery({
    queryKey: ['tiktok-profile-videos', id, debouncedSearch, minPlays, sortBy],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject();
      return scraperService.getTiktokProfileVideos(token, id, {
        page: pageParam,
        page_size: 24,
        q: debouncedSearch || undefined,
        min_plays: minPlays ? Number(minPlays) : undefined,
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
      queryClient.invalidateQueries({ queryKey: ['tiktok-profile-videos', id] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-profile-detail', id] });
      if (scrapeNotifIdRef.current) {
        const after = videosQuery.data?.pages[0]?.count ?? 0;
        updateNotification(scrapeNotifIdRef.current, {
          status: 'done',
          completedAt: new Date(),
          newCount: Math.max(0, after - beforeVideoCountRef.current),
        });
        scrapeNotifIdRef.current = null;
      }
    }
    prevProcessing.current = !!isProcessingNow;
  }, [isProcessingNow, id, queryClient, updateNotification]);

  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (videosQuery.isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && videosQuery.hasNextPage) videosQuery.fetchNextPage();
    }, { rootMargin: '200px' });
    if (node) observerRef.current.observe(node);
  }, [videosQuery.isFetchingNextPage, videosQuery.hasNextPage, videosQuery.fetchNextPage]);

  // ─── Mutations ────────────────────────────────────────
  const scrapeMutation = useMutation({
    mutationFn: () => {
      if (!token || !p) throw new Error('No token');
      return scraperService.tiktokProfileScrape(token, p.url);
    },
    onSuccess: (data) => {
      if (data.is_scraping) {
        toast(data.message, { icon: '⏳' });
      } else {
        toast.success(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['tiktok-profile-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-profile-videos', id] });
      beforeVideoCountRef.current = videosQuery.data?.pages[0]?.count ?? 0;
      const nId = addNotification({
        platform: 'tiktok',
        kind: 'profile',
        label: p?.nickname || p?.username || '',
        status: 'scraping',
        startedAt: new Date(),
      });
      scrapeNotifIdRef.current = nId;
    },
    onError: (e: Error) => {
      toast.error(e.message);
      if (scrapeNotifIdRef.current) {
        updateNotification(scrapeNotifIdRef.current, { status: 'error' });
        scrapeNotifIdRef.current = null;
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (field: 'is_bookmarked' | 'is_tracked') =>
      token ? scraperService.toggleTiktokProfile(token, id, field) : Promise.reject(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tiktok-profile-detail', id] }),
  });

  const p = detailQuery.data;
  const allVideos = videosQuery.data?.pages.flatMap(pg => pg.videos) || [];
  const totalVideos = videosQuery.data?.pages[0]?.count || 0;
  const isProcessing = isProcessingNow;

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CircleNotch size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <p className="text-sm text-foreground">Không tìm thấy profile.</p>
        <button onClick={() => router.back()} className="text-sm text-blue-500 hover:underline">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Profile Header (TikTok Desktop style) ────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 pb-6 pt-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 ring-4 ring-slate-200 dark:ring-slate-600">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-pink-50 dark:bg-pink-900/30 text-pink-400">
                  <Users size={40} />
                </div>
              )}
            </div>

            {/* Info block */}
            <div className="flex-1 min-w-0">
              {/* Nickname (tên hiển thị TikTok) */}
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-foreground">
                  {p.nickname || `@${p.username}`}
                </h1>
                {p.is_verified && <SealCheck size={20} weight="fill" className="text-blue-500" />}
              </div>
              <p className="text-sm text-slate-500">@{p.username}</p>

              {/* Stats row — TikTok desktop style */}
              <div className="flex items-center gap-5 mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-foreground">{formatNum(p.following_count)}</span>
                  <span className="text-sm text-slate-500">Đang follow</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-foreground">{formatNum(p.followers_count)}</span>
                  <span className="text-sm text-slate-500">Follower</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-foreground">{formatNum(p.likes_count)}</span>
                  <span className="text-sm text-slate-500">Thích</span>
                </div>
              </div>

              {/* Bio */}
              {p.biography && (
                <p className="text-sm text-foreground mt-3 whitespace-pre-wrap max-w-lg">{p.biography}</p>
              )}

              {/* Aggregated stats */}
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <VideoCamera size={14} className="text-purple-500" />
                  {p.videos_in_db} video trong DB
                </span>
                {(p.total_plays ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye size={14} className="text-blue-500" />
                    {formatNum(p.total_plays || 0)} tổng views
                  </span>
                )}
                {(p.total_diggs ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart size={14} className="text-pink-500" />
                    {formatNum(p.total_diggs || 0)} tổng likes
                  </span>
                )}
                {(p.total_comments ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <ChatCircle size={14} className="text-emerald-500" />
                    {formatNum(p.total_comments || 0)}
                  </span>
                )}
                {(p.total_shares ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <ShareNetwork size={14} className="text-orange-500" />
                    {formatNum(p.total_shares || 0)}
                  </span>
                )}
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={() => router.push('/dashboard/externalChannels/tiktok')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => scrapeMutation.mutate()}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              <ArrowsClockwise size={15} className={isProcessing ? 'animate-spin' : ''} />
              {isProcessing ? 'Đang cào...' : p.is_initial_scraped ? 'Cập nhật' : 'Cào lượt đầu'}
            </button>
            <button
              onClick={() => toggleMutation.mutate('is_bookmarked')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md transition-colors ${p.is_bookmarked ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <BookmarkSimple size={15} weight={p.is_bookmarked ? 'fill' : 'regular'} />
              {p.is_bookmarked ? 'Đã lưu' : 'Lưu'}
            </button>
            <button
              onClick={() => toggleMutation.mutate('is_tracked')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md transition-colors ${p.is_tracked ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Timer size={15} weight={p.is_tracked ? 'fill' : 'regular'} />
              {p.is_tracked ? 'Đang theo dõi' : 'Theo dõi'}
            </button>
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <VideoCamera size={15} /> TikTok
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ─── Videos Grid ─────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Video {totalVideos > 0 && <span className="font-normal text-slate-500">({totalVideos})</span>}
        </h2>

        {/* Filter bar */}
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
            value={minPlays}
            onChange={e => setMinPlays(e.target.value)}
            placeholder="Min plays"
            className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'date' | 'plays' | 'likes')}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="date">Mới nhất</option>
            <option value="plays">Nhiều plays nhất</option>
            <option value="likes">Nhiều likes nhất</option>
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {videosQuery.isLoading && (
          <div className="flex justify-center py-12">
            <CircleNotch size={28} className="animate-spin text-primary" />
          </div>
        )}

        {!videosQuery.isLoading && allVideos.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
            <FilmReel size={32} className="text-slate-300" />
            <p className="text-sm text-foreground font-medium">Chưa có video nào</p>
            <p className="text-xs text-slate-400">Bấm &quot;Cào lượt đầu&quot; để bắt đầu.</p>
          </div>
        )}

        {allVideos.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {allVideos.map(v => (
                <ProfileVideoCard key={v.video_id} video={v} />
              ))}
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
