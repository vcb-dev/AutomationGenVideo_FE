'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CircleNotch,
  UserCircle,
  Warning,
  Eye,
  Heart,
  ChatCircle,
  ArrowsClockwise,
  ArrowSquareOut,
  CheckCircle,
} from '@phosphor-icons/react';
import { SiThreads } from 'react-icons/si';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, ExternalVideo } from '@/services/scraperService';
import ContentFilters from '../components/ContentFilters';
import { FilterDateRange, FilterNumber, FilterReset, FilterSearch, FilterSelect } from '../components/FilterFields';

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

function proxyImg(url: string): string {
  if (!url) return '';
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function PostCard({ post: v }: { post: ExternalVideo }) {
  const thumb = proxyImg(v.thumbnail_url || '');
  const avatar = proxyImg(v.author_avatar || '');

  return (
    <a
      href={v.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col hover:border-slate-400 dark:hover:border-slate-600"
    >
      <div className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden max-h-[260px] flex items-center justify-center">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="p-4 text-center text-slate-400">
            <SiThreads size={36} className="mx-auto mb-2 opacity-50 text-foreground" />
            <p className="text-xs line-clamp-3 text-slate-500">{v.description || 'Bài viết Threads'}</p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2 pt-6">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1 font-medium">
              <Eye size={13} weight="fill" />
              {formatNum(v.play_count)}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Heart size={13} weight="fill" />
              {formatNum(v.likes_count)}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <ChatCircle size={13} weight="fill" />
              {formatNum(v.comments_count)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed font-normal">
          {v.description || 'Không có nội dung'}
        </p>
        {v.author_name && (
          <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-border/50">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="w-4 h-4 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <SiThreads size={10} className="text-foreground" />
              </div>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
              {v.author_name}
            </span>
          </div>
        )}
        <p className="text-[11px] text-slate-400">{relativeTime(v.date_posted)}</p>
      </div>
    </a>
  );
}

export default function ThreadsChannelsPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  // ── Profiles ─────────────────────────────────────────
  const profilesQuery = useQuery({
    queryKey: ['owned-threads-profiles'],
    queryFn: () => (token ? scraperService.getOwnedThreadsProfiles(token) : Promise.reject('No token')),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const profiles = profilesQuery.data || [];

  const syncMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('No token');
      return scraperService.syncOwnedThreads(token);
    },
    onSuccess: (data) => {
      toast.success(
        `Đã đồng bộ ${data.accounts} tài khoản Threads, ${data.syncedPosts} bài viết!`,
        { icon: '🧵' },
      );
      queryClient.invalidateQueries({ queryKey: ['owned-threads-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['owned-threads-posts'] });
      queryClient.invalidateQueries({ queryKey: ['owned-stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Videos / Posts ───────────────────────────────────
  const [videoSearch, setVideoSearch] = useState('');
  const [debouncedVideoSearch, setDebouncedVideoSearch] = useState('');
  const [sortVideos, setSortVideos] = useState('plays');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minPlays, setMinPlays] = useState('');
  const [market, setMarket] = useState('');
  const [contentLine, setContentLine] = useState('');
  const [channel, setChannel] = useState('');
  const [hashtag, setHashtag] = useState('');
  const videoSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    videoSearchTimer.current = setTimeout(() => setDebouncedVideoSearch(videoSearch), 300);
    return () => clearTimeout(videoSearchTimer.current);
  }, [videoSearch]);

  const postsQuery = useInfiniteQuery({
    queryKey: [
      'owned-threads-posts',
      debouncedVideoSearch,
      sortVideos,
      dateFrom,
      dateTo,
      minPlays,
      market,
      contentLine,
      channel,
      hashtag,
    ],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.getOwnedChannelVideos(token, {
        page: pageParam,
        page_size: 24,
        platform: 'threads',
        q: debouncedVideoSearch || undefined,
        sort: sortVideos,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        min_plays: minPlays ? Number(minPlays) : undefined,
        market: market || undefined,
        content_line: contentLine || undefined,
        channel: channel || undefined,
        hashtag: hashtag || undefined,
      });
    },
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!token,
  });

  const allPosts = postsQuery.data?.pages.flatMap((p) => p.videos) || [];
  const totalPosts = postsQuery.data?.pages[0]?.count || 0;

  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (postsQuery.isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && postsQuery.hasNextPage) postsQuery.fetchNextPage();
        },
        { rootMargin: '200px' },
      );
      if (node) observerRef.current.observe(node);
    },
    [postsQuery.isFetchingNextPage, postsQuery.hasNextPage, postsQuery.fetchNextPage],
  );

  const hasVideoFilters =
    !!debouncedVideoSearch ||
    !!dateFrom ||
    !!dateTo ||
    !!minPlays ||
    !!market ||
    !!contentLine ||
    !!channel ||
    !!hashtag ||
    sortVideos !== 'plays';

  return (
    <div className="flex flex-col gap-6">
      {/* Profiles section */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground">
              <SiThreads size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Kênh Threads nội bộ ({profiles.length})
              </h2>
              <p className="text-xs text-slate-500">
                Tự động đồng bộ từ tài khoản Threads đã kết nối OAuth trong phân hệ Đăng bài
              </p>
            </div>
          </div>

          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {syncMutation.isPending ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <ArrowsClockwise size={14} />
            )}
            {syncMutation.isPending ? 'Đang đồng bộ...' : 'Đồng bộ bài viết & Views'}
          </button>
        </div>

        {profilesQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <CircleNotch size={24} className="animate-spin text-slate-400" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <SiThreads size={32} className="mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="text-sm text-foreground font-medium">Chưa có tài khoản Threads nào</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Vào mục <strong>Đăng bài &gt; Tài khoản</strong> để kết nối tài khoản Threads, sau đó bấm &quot;Đồng bộ bài viết &amp; Views&quot; ở đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {profiles.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-border rounded-xl"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.avatar_url ? (
                    <img
                      src={proxyImg(p.avatar_url)}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <UserCircle size={24} className="text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {p.name || p.username}
                      </span>
                      {p.is_verified && <CheckCircle size={14} className="text-blue-500 flex-shrink-0" weight="fill" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">@{p.username}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>{p.posts_count ?? 0} bài viết</span>
                      {p.last_scraped_at && (
                        <span>• Đồng bộ {relativeTime(p.last_scraped_at)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <a
                  href={p.url || `https://www.threads.net/@${p.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                  title="Mở trên Threads"
                >
                  <ArrowSquareOut size={16} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Posts Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Bài viết &amp; Video {totalPosts > 0 && <span className="font-normal text-slate-500">({totalPosts})</span>}
          </h2>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl p-3">
          <FilterSearch value={videoSearch} onChange={setVideoSearch} placeholder="Tìm theo nội dung, hashtag..." />
          <FilterNumber value={minPlays} onChange={setMinPlays} placeholder="Lượt xem tối thiểu" />
          <ContentFilters
            platform="threads"
            value={{ channel, hashtag, market, contentLine }}
            onChange={(v) => {
              if (v.channel !== undefined) setChannel(v.channel);
              if (v.hashtag !== undefined) setHashtag(v.hashtag);
              if (v.market !== undefined) setMarket(v.market);
              if (v.contentLine !== undefined) setContentLine(v.contentLine);
            }}
          />
          <FilterSelect value={sortVideos} onChange={setSortVideos} className="w-[160px]" title="Sắp xếp">
            <option value="plays">Nhiều views nhất</option>
            <option value="likes">Nhiều likes nhất</option>
            <option value="date">Mới nhất</option>
          </FilterSelect>
          <FilterDateRange from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          {hasVideoFilters && (
            <FilterReset
              onClick={() => {
                setVideoSearch('');
                setSortVideos('plays');
                setDateFrom('');
                setDateTo('');
                setMinPlays('');
                setMarket('');
                setContentLine('');
                setChannel('');
                setHashtag('');
              }}
            />
          )}
        </div>

        {postsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch size={32} className="animate-spin text-slate-400" />
          </div>
        ) : postsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-16 bg-card border border-border rounded-2xl">
            <Warning size={32} className="text-amber-500" />
            <p className="text-sm text-foreground">Không tải được danh sách bài viết Threads.</p>
            <button
              onClick={() => postsQuery.refetch()}
              className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Thử lại
            </button>
          </div>
        ) : allPosts.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-2xl">
            <SiThreads size={36} className="mx-auto text-slate-400 mb-2 opacity-40" />
            <p className="text-sm font-medium text-foreground">Chưa có bài viết Threads nào</p>
            <p className="text-xs text-slate-500 mt-1">
              Bấm &quot;Đồng bộ bài viết &amp; Views&quot; ở trên để kéo dữ liệu mới nhất về hệ thống.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {allPosts.map((post, idx) => (
              <PostCard key={`${post.post_id}-${idx}`} post={post} />
            ))}
          </div>
        )}

        {postsQuery.hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-6">
            {postsQuery.isFetchingNextPage && (
              <CircleNotch size={24} className="animate-spin text-slate-400" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
