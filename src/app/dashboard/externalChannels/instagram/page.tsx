'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleNotch, MagnifyingGlassPlus, UserCircle, FilmReel, CaretDown, CaretUp, Eye, Heart, ChatCircle, Warning } from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import InstagramProfileCard from '../components/InstagramProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { scraperService, InstagramReel } from '@/services/scraperService';
import { useProfileScrapeNotification } from '@/hooks/useProfileScrapeNotification';
import { UserRole } from '@/types/auth';

const PAGE_SIZE_PROFILES = 12;
const PAGE_SIZE_REELS = 24;

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function InstagramReelCard({ reel }: { reel: InstagramReel }) {
  return (
    <a
      href={reel.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden max-h-[280px]">
        {reel.thumbnail_url ? (
          <img
            src={reel.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Eye size={32} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1"><Eye size={12} weight="fill" />{formatNum(reel.play_count)}</span>
            <span className="flex items-center gap-1"><Heart size={12} weight="fill" />{formatNum(reel.likes_count)}</span>
            <span className="flex items-center gap-1"><ChatCircle size={12} weight="fill" />{formatNum(reel.comments_count)}</span>
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{reel.description || <span className="text-slate-400 italic">Không có caption</span>}</p>
        {reel.profile && (
          <div className="flex items-center gap-1.5 mt-auto pt-1.5">
            {reel.profile.avatar_url && (
              <img src={reel.profile.avatar_url} alt="" className="w-4 h-4 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span className="text-xs text-slate-500 truncate">@{reel.profile.username}</span>
          </div>
        )}
        <p className="text-xs text-slate-400">{new Date(reel.date_posted).toLocaleDateString('vi-VN')}</p>
      </div>
    </a>
  );
}

export default function InstagramExternalPage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.roles?.includes(UserRole.ADMIN) ?? false;
  const queryClient = useQueryClient();
  const router = useRouter();
  const { start: startProfileScrapeNotif } = useProfileScrapeNotification('instagram');

  // ─── Profiles section ─────────────────────────────────
  const [profilesCollapsed, setProfilesCollapsed] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'followers' | 'recent'>('followers');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const hasProfileFilters = !!search || sortBy !== 'followers';
  const clearProfileFilters = () => { setSearch(''); setSortBy('followers'); };

  const profilesQuery = useQuery({
    queryKey: ['instagram-profiles', page, debouncedSearch, sortBy],
    queryFn: () => token ? scraperService.getInstagramProfiles(token, {
      page, page_size: PAGE_SIZE_PROFILES, search: debouncedSearch || undefined,
    }) : Promise.reject('No token'),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const profiles = profilesQuery.data?.profiles || [];
  const totalPages = profilesQuery.data?.total_pages || 1;
  const totalProfiles = profilesQuery.data?.count || 0;

  // ─── Reels section ────────────────────────────────────
  const [reelSearch, setReelSearch] = useState('');
  const [debouncedReelSearch, setDebouncedReelSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [sortReels, setSortReels] = useState('date');
  const [minPlays, setMinPlays] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const reelSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    reelSearchTimer.current = setTimeout(() => setDebouncedReelSearch(reelSearch), 300);
    return () => clearTimeout(reelSearchTimer.current);
  }, [reelSearch]);

  const hasReelFilters = !!reelSearch || !!selectedProfile || sortReels !== 'date' || !!minPlays || !!dateFrom || !!dateTo;
  const clearReelFilters = () => {
    setReelSearch(''); setSelectedProfile(''); setSortReels('date');
    setMinPlays(''); setDateFrom(''); setDateTo('');
  };

  const reelsQuery = useInfiniteQuery({
    queryKey: ['instagram-reels', debouncedReelSearch, selectedProfile, sortReels, minPlays, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.getInstagramReels(token, {
        q: debouncedReelSearch || undefined,
        page: pageParam,
        page_size: PAGE_SIZE_REELS,
        profile_id: selectedProfile ? Number(selectedProfile) : undefined,
        min_plays: minPlays ? Number(minPlays) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort: sortReels,
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

  const allReels = reelsQuery.data?.pages.flatMap(p => p.reels) || [];
  const totalReels = reelsQuery.data?.pages[0]?.count || 0;

  // ─── Mutations ────────────────────────────────────────
  const handleScrapeSuccess = (data: { message: string; is_scraping?: boolean; already_exists?: boolean; profile_id: number }, label?: string, before = 0) => {
    if (data.already_exists) {
      toast(data.message, { icon: '📋' });
      router.push(`/dashboard/externalChannels/instagram/${data.profile_id}`);
    } else {
      toast(data.message, { icon: '⏳' });
      startProfileScrapeNotif({
        label: label || profileUsername.trim(),
        before,
        fetchStatus: async () => {
          const d = await scraperService.getInstagramProfileDetail(token!, data.profile_id);
          return { scraping_status: d.scraping_status, count: d.reels_in_db };
        },
      });
    }
    setProfileUsername('');
    queryClient.invalidateQueries({ queryKey: ['instagram-profiles'] });
  };

  const scrapeMutation = useMutation({
    mutationFn: (username: string) => {
      if (!token) throw new Error('No token');
      return scraperService.instagramProfileScrape(token, username);
    },
    onSuccess: (data) => handleScrapeSuccess(data, profileUsername.trim()),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: 'is_bookmarked' | 'is_tracked' }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleInstagramProfile(token, id, field);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instagram-profiles'] }),
  });

  const rescrapeMutation = useMutation({
    mutationFn: (p: { id: number; username: string }) => {
      if (!token) throw new Error('No token');
      return scraperService.instagramProfileScrape(token, p.username);
    },
    onSuccess: (data, vars) => {
      const before = profiles.find(pr => pr.id === vars.id)?.reels_in_db ?? 0;
      handleScrapeSuccess(data, vars.username, before);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Input username — admin only */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500 text-sm font-semibold select-none">@</span>
              <input
                type="text"
                value={profileUsername}
                onChange={e => setProfileUsername(e.target.value.replace('@', ''))}
                onKeyDown={e => { if (e.key === 'Enter' && profileUsername.trim()) scrapeMutation.mutate(profileUsername.trim()); }}
                placeholder="Nhập Instagram username (vd: lanh_1403_)"
                className="w-full pl-8 pr-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <button
              onClick={() => scrapeMutation.mutate(profileUsername.trim())}
              disabled={scrapeMutation.isPending || !profileUsername.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-sm hover:shadow-md transition-all"
            >
              {scrapeMutation.isPending ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <MagnifyingGlassPlus size={16} weight="bold" />}
              {scrapeMutation.isPending ? 'Đang gửi...' : 'Cào Profile'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Profiles section (collapsible) ─────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setProfilesCollapsed(!profilesCollapsed)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <h2 className="text-sm font-semibold text-foreground">Profiles ({totalProfiles})</h2>
          {profilesCollapsed ? <CaretDown size={16} /> : <CaretUp size={16} />}
        </button>

        {!profilesCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo username..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'followers' | 'recent')}
                className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="followers">Nhiều followers nhất</option>
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
                <p className="text-sm text-slate-400">Chưa có profile nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {profiles.map(p => (
                  <InstagramProfileCard
                    key={p.id}
                    profile={p}
                    onScrape={isAdmin ? () => rescrapeMutation.mutate({ id: p.id, username: p.username }) : undefined}
                    onToggleBookmark={() => toggleMutation.mutate({ id: p.id, field: 'is_bookmarked' })}
                    onToggleTracked={() => toggleMutation.mutate({ id: p.id, field: 'is_tracked' })}
                    onViewDetail={() => router.push(`/dashboard/externalChannels/instagram/${p.id}`)}
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

      {/* ─── Reels section ───────────────────────────────── */}
      <div>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={reelSearch}
              onChange={e => setReelSearch(e.target.value)}
              placeholder="Tìm theo caption..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary outline-none"
            />
          </div>
          <select
            value={selectedProfile}
            onChange={e => setSelectedProfile(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Tất cả profile</option>
            {profiles.map(p => <option key={p.id} value={p.id}>@{p.username}</option>)}
          </select>
          <input
            type="number"
            value={minPlays}
            onChange={e => setMinPlays(e.target.value)}
            placeholder="Min plays"
            className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            value={sortReels}
            onChange={e => setSortReels(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="date">Mới nhất</option>
            <option value="plays">Nhiều plays nhất</option>
            <option value="likes">Nhiều likes nhất</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Từ ngày" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Đến ngày" />
          {hasReelFilters && (
            <button onClick={clearReelFilters} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
              <X size={12} /> Xóa lọc
            </button>
          )}
        </div>

        <h2 className="text-sm font-semibold text-foreground mb-3">
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
            <p className="text-sm text-foreground">Có lỗi xảy ra.</p>
            <button onClick={() => reelsQuery.refetch()} className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-slate-50">Thử lại</button>
          </div>
        )}

        {!reelsQuery.isLoading && !reelsQuery.isError && allReels.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
            <FilmReel size={32} className="text-slate-300" />
            <p className="text-sm text-foreground font-medium">Không tìm thấy Reels nào</p>
            <p className="text-xs text-slate-400 text-center max-w-sm">Thêm profile và cào dữ liệu để xem Reels tại đây.</p>
          </div>
        )}

        {allReels.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allReels.map(reel => <InstagramReelCard key={reel.post_id} reel={reel} />)}
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
