'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleNotch, MagnifyingGlassPlus, UserCircle, FilmReel, CaretDown, CaretUp, Eye } from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import YoutubeProfileCard from '../components/YoutubeProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { scraperService, YoutubeShortWithProfile } from '@/services/scraperService';
import { useProfileScrapeNotification } from '@/hooks/useProfileScrapeNotification';
import { UserRole } from '@/types/auth';

const PAGE_SIZE_PROFILES = 12;
const PAGE_SIZE_SHORTS = 24;

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function YoutubeShortCard({ short }: { short: YoutubeShortWithProfile }) {
  return (
    <a
      href={short.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="relative aspect-[9/16] bg-slate-100 overflow-hidden max-h-[280px]">
        {short.thumbnail_url ? (
          <img
            src={short.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 -z-10">
          <Eye size={32} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <div className="flex items-center gap-2 text-white text-xs">
            <span className="flex items-center gap-1"><Eye size={12} weight="fill" />{short.view_count_text || formatNum(short.view_count)}</span>
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed font-medium">{short.title || <span className="text-slate-400 italic">Không có tiêu đề</span>}</p>
        {short.profile && (
          <div className="flex items-center gap-1.5 mt-auto pt-1.5">
            {short.profile.avatar_url && (
              <img src={short.profile.avatar_url} alt="" className="w-4 h-4 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span className="text-xs text-slate-500 truncate">{short.profile.title}</span>
          </div>
        )}
        <p className="text-xs text-slate-400">{new Date(short.created_at).toLocaleDateString('vi-VN')}</p>
      </div>
    </a>
  );
}

export default function YoutubeExternalPage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.roles?.includes(UserRole.ADMIN) ?? false;
  const queryClient = useQueryClient();
  const router = useRouter();
  const { start: startProfileScrapeNotif } = useProfileScrapeNotification('youtube');

  // ─── Profiles section ─────────────────────────────────
  const [profilesCollapsed, setProfilesCollapsed] = useState(false);
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
    queryKey: ['youtube-profiles', page, debouncedSearch, sortBy],
    queryFn: () => token ? scraperService.getYoutubeProfiles(token, {
      page, page_size: PAGE_SIZE_PROFILES, search: debouncedSearch || undefined, sort_by: sortBy,
    }) : Promise.reject('No token'),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const profiles = profilesQuery.data?.profiles || [];
  const totalPages = profilesQuery.data?.total_pages || 1;
  const totalProfiles = profilesQuery.data?.count || 0;

  // ─── Shorts section ───────────────────────────────────
  const [shortSearch, setShortSearch] = useState('');
  const [debouncedShortSearch, setDebouncedShortSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [sortShorts, setSortShorts] = useState('views');
  const [minViews, setMinViews] = useState('');
  const shortSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    shortSearchTimer.current = setTimeout(() => setDebouncedShortSearch(shortSearch), 300);
    return () => clearTimeout(shortSearchTimer.current);
  }, [shortSearch]);

  const hasShortFilters = !!shortSearch || !!selectedProfile || sortShorts !== 'views' || !!minViews;
  const clearShortFilters = () => { setShortSearch(''); setSelectedProfile(''); setSortShorts('views'); setMinViews(''); };

  const shortsQuery = useInfiniteQuery({
    queryKey: ['youtube-shorts', debouncedShortSearch, selectedProfile, sortShorts, minViews],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.getYoutubeShorts(token, {
        q: debouncedShortSearch || undefined,
        page: pageParam,
        page_size: PAGE_SIZE_SHORTS,
        profile_id: selectedProfile ? Number(selectedProfile) : undefined,
        min_views: minViews ? Number(minViews) : undefined,
        sort: sortShorts,
      });
    },
    getNextPageParam: (lastPage) => lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!token,
  });

  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (shortsQuery.isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && shortsQuery.hasNextPage) shortsQuery.fetchNextPage();
    }, { rootMargin: '200px' });
    if (node) observerRef.current.observe(node);
  }, [shortsQuery.isFetchingNextPage, shortsQuery.hasNextPage, shortsQuery.fetchNextPage]);

  const allShorts = shortsQuery.data?.pages.flatMap(p => p.shorts) || [];
  const totalShorts = shortsQuery.data?.pages[0]?.count || 0;

  // ─── Mutations ────────────────────────────────────────
  const handleScrapeSuccess = (data: { message: string; is_scraping?: boolean; already_exists?: boolean; newly_scraped?: boolean; profile_id: number }, label?: string, before = 0) => {
    if (data.already_exists) {
      toast(data.message, { icon: '📋' });
      router.push(`/dashboard/externalChannels/youtube/${data.profile_id}`);
    } else if (data.newly_scraped) {
      toast.success(data.message);
      router.push(`/dashboard/externalChannels/youtube/${data.profile_id}`);
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
    queryClient.invalidateQueries({ queryKey: ['youtube-profiles'] });
  };

  const scrapeMutation = useMutation({
    mutationFn: (raw: string) => {
      if (!token) throw new Error('No token');
      return scraperService.youtubeChannelScrape(token, raw);
    },
    onSuccess: (data) => handleScrapeSuccess(data, channelId.trim()),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: 'is_bookmarked' | 'is_tracked' }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleYoutubeProfile(token, id, field);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-profiles'] }),
  });

  const rescrapeMutation = useMutation({
    mutationFn: (p: { id: number; channel_id: string }) => {
      if (!token) throw new Error('No token');
      return scraperService.youtubeChannelScrape(token, p.channel_id);
    },
    onSuccess: (data, vars) => {
      const before = profiles.find(pr => pr.id === vars.id)?.shorts_in_db ?? 0;
      handleScrapeSuccess(data, vars.channel_id, before);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Input channel_id — admin only */}
      {isAdmin && (
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
              {scrapeMutation.isPending ? 'Đang gửi...' : 'Cào Channel'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Chưa hỗ trợ resolve từ @handle — cần channel ID dạng UCxxxx...</p>
        </div>
      )}

      {/* ─── Profiles section (collapsible) ─────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setProfilesCollapsed(!profilesCollapsed)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <h2 className="text-sm font-semibold text-foreground">Kênh YouTube ({totalProfiles})</h2>
          {profilesCollapsed ? <CaretDown size={16} /> : <CaretUp size={16} />}
        </button>

        {!profilesCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên kênh..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'subscribers' | 'recent')}
                className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="subscribers">Nhiều subscriber nhất</option>
                <option value="recent">Mới thêm gần đây</option>
              </select>
              {hasProfileFilters && (
                <button onClick={clearProfileFilters} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
                  <X size={12} /> Xóa lọc
                </button>
              )}
            </div>

            {profilesQuery.isLoading ? (
              <div className="flex justify-center py-8"><CircleNotch size={24} className="animate-spin text-primary" /></div>
            ) : profiles.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <UserCircle size={36} className="text-slate-300" />
                <p className="text-sm text-slate-400">Chưa có kênh nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {profiles.map(p => (
                  <YoutubeProfileCard
                    key={p.id}
                    profile={p}
                    onScrape={isAdmin ? () => rescrapeMutation.mutate({ id: p.id, channel_id: p.channel_id }) : undefined}
                    onToggleBookmark={() => toggleMutation.mutate({ id: p.id, field: 'is_bookmarked' })}
                    onToggleTracked={() => toggleMutation.mutate({ id: p.id, field: 'is_tracked' })}
                    onViewDetail={() => router.push(`/dashboard/externalChannels/youtube/${p.id}`)}
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
          </div>
        )}
      </div>

      {/* ─── Shorts section ──────────────────────────────── */}
      <div>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={shortSearch}
              onChange={e => setShortSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary outline-none"
            />
          </div>
          <select
            value={selectedProfile}
            onChange={e => setSelectedProfile(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Tất cả kênh</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <input
            type="number"
            value={minViews}
            onChange={e => setMinViews(e.target.value)}
            placeholder="Min views"
            className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            value={sortShorts}
            onChange={e => setSortShorts(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="views">Nhiều views nhất</option>
            <option value="recent">Mới cào nhất</option>
          </select>
          {hasShortFilters && (
            <button onClick={clearShortFilters} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
              <X size={12} /> Xóa lọc
            </button>
          )}
        </div>

        <h2 className="text-sm font-semibold text-foreground mb-3">
          Shorts {totalShorts > 0 && <span className="font-normal text-slate-500">({totalShorts})</span>}
        </h2>

        {shortsQuery.isLoading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
            <p className="text-sm text-slate-500">Đang tải Shorts...</p>
          </div>
        )}

        {!shortsQuery.isLoading && allShorts.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
            <FilmReel size={32} className="text-slate-300" />
            <p className="text-sm text-foreground font-medium">Không tìm thấy Shorts nào</p>
            <p className="text-xs text-slate-400 text-center max-w-sm">Thêm kênh và cào dữ liệu để xem Shorts tại đây.</p>
          </div>
        )}

        {allShorts.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allShorts.map(s => <YoutubeShortCard key={s.video_id} short={s} />)}
              {shortsQuery.isFetchingNextPage && Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-[9/16] max-h-[280px] bg-slate-200 dark:bg-slate-700" />
                  <div className="p-3 space-y-2"><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" /><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" /></div>
                </div>
              ))}
            </div>
            <div ref={loadMoreRef} className="h-4" />
            {!shortsQuery.hasNextPage && <p className="text-xs text-slate-400 text-center py-4">Đã hiển thị toàn bộ {totalShorts} Shorts.</p>}
          </>
        )}
      </div>
    </div>
  );
}
