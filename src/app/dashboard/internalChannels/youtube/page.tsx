'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleNotch, MagnifyingGlassPlus, UserCircle, FilmReel, Warning, Eye } from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import YoutubeProfileCard from '../../externalChannels/components/YoutubeProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { scraperService, ExternalVideo } from '@/services/scraperService';
import { channelsService, ChannelInfo } from '@/services/channelsService';
import { useProfileScrapeNotification } from '@/hooks/useProfileScrapeNotification';

const PAGE_SIZE = 12;

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

function VideoCard({ video: v }: { video: ExternalVideo }) {
  return (
    <a
      href={v.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden max-h-[280px]">
        {v.thumbnail_url && (
          <img
            src={v.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1"><Eye size={12} weight="fill" />{formatNum(v.play_count)}</span>
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{v.description || 'Không có mô tả'}</p>
        {v.author_name && (
          <div className="flex items-center gap-1.5 mt-auto pt-1.5">
            {v.author_avatar && (
              <img src={v.author_avatar} alt="" className="w-4 h-4 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span className="text-xs text-slate-500 truncate">{v.author_name}</span>
          </div>
        )}
        <p className="text-xs text-slate-400">{relativeTime(v.date_posted)}</p>
      </div>
    </a>
  );
}

export default function YoutubeChannelsPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { start: startProfileScrapeNotif } = useProfileScrapeNotification('youtube');

  // ── Profiles ─────────────────────────────────────────
  const [channelId, setChannelId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'subscribers' | 'recent'>('subscribers');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const hasProfileFilters = !!search || sortBy !== 'subscribers';
  const clearProfileFilters = () => { setSearch(''); setSortBy('subscribers'); };

  const profilesQuery = useQuery({
    queryKey: ['owned-youtube-profiles', page, debouncedSearch, sortBy],
    queryFn: () => token
      ? scraperService.getYoutubeProfiles(token, { page, page_size: PAGE_SIZE, search: debouncedSearch || undefined, sort_by: sortBy, is_owned: true })
      : Promise.reject('No token'),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const profiles = profilesQuery.data?.profiles || [];
  const totalPages = profilesQuery.data?.total_pages || 1;
  const total = profilesQuery.data?.count || 0;

  const [channelInfoMap, setChannelInfoMap] = useState<Record<string, ChannelInfo>>({});
  const profileKey = profiles.map(p => p.id).join(',');
  useEffect(() => {
    if (!profiles.length) return;
    const identifiers = profiles.flatMap(p => [
      p.channel_id,
      p.url,
      `https://www.youtube.com/channel/${p.channel_id}`,
    ].filter(Boolean));
    channelsService.scraperLookup(identifiers).then(setChannelInfoMap);
  }, [profileKey]);

  const getYoutubeChannelInfo = (p: { channel_id: string; url: string }): ChannelInfo => {
    const keys = [p.channel_id, p.url, `https://www.youtube.com/channel/${p.channel_id}`];
    for (const k of keys) if (channelInfoMap[k]) return channelInfoMap[k];
    return { team_name: null, owner_name: null };
  };

  const handleScrapeSuccess = (data: { message: string; is_scraping?: boolean; already_exists?: boolean; newly_scraped?: boolean; profile_id: number }, label?: string, before = 0) => {
    if (data.already_exists) {
      toast(data.message, { icon: '📋' });
      router.push(`/dashboard/internalChannels/youtube/${data.profile_id}`);
    } else if (data.newly_scraped) {
      toast.success(data.message);
      router.push(`/dashboard/internalChannels/youtube/${data.profile_id}`);
    } else {
      toast(data.message, { icon: '⏳' });
      startProfileScrapeNotif({
        label: label || channelId.trim(),
        before,
        fetchStatus: async () => {
          const d = await scraperService.getYoutubeProfileDetail(token!, data.profile_id);
          return { scraping_status: d.scraping_status, count: d.shorts_in_db };
        },
      });
    }
    setChannelId('');
    queryClient.invalidateQueries({ queryKey: ['owned-youtube-profiles'] });
  };

  const scrapeMutation = useMutation({
    mutationFn: (raw: string) => {
      if (!token) throw new Error('No token');
      return scraperService.youtubeChannelScrape(token, raw, true);
    },
    onSuccess: (data) => handleScrapeSuccess(data, channelId.trim()),
    onError: (e: Error) => toast.error(e.message),
  });

  const rescrape = useMutation({
    mutationFn: (p: { id: number; channel_id: string; label?: string }) => {
      if (!token) throw new Error('No token');
      return scraperService.youtubeChannelScrape(token, p.channel_id, true);
    },
    onSuccess: (data, vars) => {
      const before = profiles.find(pr => pr.id === vars.id)?.shorts_in_db ?? 0;
      handleScrapeSuccess(data, vars.label, before);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: 'is_bookmarked' | 'is_tracked' }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleYoutubeProfile(token, id, field);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owned-youtube-profiles'] }),
  });

  // ── Videos ───────────────────────────────────────────
  const [videoSearch, setVideoSearch] = useState('');
  const [debouncedVideoSearch, setDebouncedVideoSearch] = useState('');
  const [sortVideos, setSortVideos] = useState('date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const videoSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    videoSearchTimer.current = setTimeout(() => setDebouncedVideoSearch(videoSearch), 300);
    return () => clearTimeout(videoSearchTimer.current);
  }, [videoSearch]);

  const videosQuery = useInfiniteQuery({
    queryKey: ['owned-youtube-videos', debouncedVideoSearch, sortVideos, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.getOwnedChannelVideos(token, {
        page: pageParam, page_size: 24, platform: 'youtube',
        q: debouncedVideoSearch || undefined,
        sort: sortVideos,
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

  const hasVideoFilters = !!debouncedVideoSearch || !!dateFrom || !!dateTo || sortVideos !== 'date';

  return (
    <div className="flex flex-col gap-5">
      {/* ── Add channel ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <input
              type="text"
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && channelId.trim()) scrapeMutation.mutate(channelId.trim()); }}
              placeholder="Channel ID (UCxxxx...) hoặc link youtube.com/channel/UCxxxx"
              className="w-full pl-3 pr-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <button
            onClick={() => scrapeMutation.mutate(channelId.trim())}
            disabled={scrapeMutation.isPending || !channelId.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-sm hover:shadow-md transition-all"
          >
            {scrapeMutation.isPending ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <MagnifyingGlassPlus size={16} weight="bold" />}
            {scrapeMutation.isPending ? 'Đang gửi...' : 'Thêm kênh'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Chưa hỗ trợ resolve từ @handle — cần channel ID dạng UCxxxx...</p>
      </div>

      {/* ── Filter bar ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border border-border rounded-xl p-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên kênh..."
          className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'subscribers' | 'recent')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="subscribers">Nhiều subscriber nhất</option>
          <option value="recent">Mới thêm gần đây</option>
        </select>
        {hasProfileFilters && (
          <button onClick={clearProfileFilters} className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50">
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* ── Profiles ─────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-foreground">
        Kênh YouTube {total > 0 && <span className="font-normal text-slate-500">({total})</span>}
      </h2>

      {profilesQuery.isLoading && (
        <div className="flex justify-center py-12">
          <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
        </div>
      )}

      {!profilesQuery.isLoading && profiles.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
          <UserCircle size={40} className="text-slate-300" />
          <p className="text-sm text-foreground font-medium">Chưa có kênh YouTube nội bộ</p>
          <p className="text-xs text-slate-400 text-center max-w-sm">Nhập channel ID ở trên để thêm kênh.</p>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map(p => (
            <YoutubeProfileCard
              key={p.id}
              profile={p}
              channelInfo={getYoutubeChannelInfo(p)}
              onScrape={() => rescrape.mutate({ id: p.id, channel_id: p.channel_id, label: p.title || p.channel_id })}
              onToggleBookmark={() => toggleMutation.mutate({ id: p.id, field: 'is_bookmarked' })}
              onToggleTracked={() => toggleMutation.mutate({ id: p.id, field: 'is_tracked' })}
              onViewDetail={() => router.push(`/dashboard/internalChannels/youtube/${p.id}`)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft size={12} /> Trước
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
              Sau <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Videos ───────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-4 mb-4">
          <input
            type="text"
            value={videoSearch}
            onChange={e => setVideoSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, hashtag..."
            className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            value={sortVideos}
            onChange={e => setSortVideos(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="date">Mới nhất</option>
            <option value="plays">Nhiều views nhất</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Từ ngày" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Đến ngày" />
          {hasVideoFilters && (
            <button onClick={() => { setVideoSearch(''); setSortVideos('date'); setDateFrom(''); setDateTo(''); }} className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
              Xóa bộ lọc
            </button>
          )}
        </div>

        <h2 className="text-sm font-semibold text-foreground mb-3">
          Shorts {totalVideos > 0 && <span className="font-normal text-slate-500">({totalVideos})</span>}
        </h2>

        {videosQuery.isLoading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
            <p className="text-sm text-slate-500">Đang tải Shorts...</p>
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
            <p className="text-sm text-foreground font-medium">Chưa có Shorts nào</p>
            <p className="text-xs text-slate-400 text-center max-w-sm">Thêm kênh và bấm cào để lấy Shorts về.</p>
          </div>
        )}

        {allVideos.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allVideos.map(v => <VideoCard key={v.post_id} video={v} />)}
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
            {!videosQuery.hasNextPage && <p className="text-xs text-slate-400 text-center py-4">Đã hiển thị toàn bộ {totalVideos} Shorts.</p>}
          </>
        )}
      </div>
    </div>
  );
}
