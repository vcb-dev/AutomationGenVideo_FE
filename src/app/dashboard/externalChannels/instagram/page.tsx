'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleNotch, MagnifyingGlassPlus, UserCircle, FilmReel, CaretDown, CaretUp, Eye, Heart, ChatCircle, Warning, PaperPlaneTilt, Timer, BookmarkSimple, InstagramLogo, ArrowsDownUp } from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import InstagramProfileCard from '../components/InstagramProfileCard';
import FilterSelect from '../components/FilterSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAuthStore } from '@/store/auth-store';
import { scraperService, InstagramReel, InstagramToggleField } from '@/services/scraperService';
import { videoLibraryService } from '@/services/videoLibraryService';
import { useSubmitVideoToLibrary } from '@/hooks/useProposeVideo';
import { useProfileScrapeNotification } from '@/hooks/useProfileScrapeNotification';
import { UserRole } from '@/types/auth';
import { dedupeById } from '@/lib/dedupe-pages';
import SyncAllChannelsButton from '../components/SyncAllChannelsButton';
import { buildDeleteChannelConfirm } from '@/lib/scrape/delete-channel';
import WatchFeedButton from '../components/WatchFeedButton';

const PAGE_SIZE_PROFILES = 12;
const PAGE_SIZE_REELS = 24;

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function InstagramReelCard({ reel }: { reel: InstagramReel }) {
  const { token } = useAuthStore();
  // Leader/Admin them thang vao Bo Suu Tap, con lai vao hang cho duyet — xem useProposeVideo.ts
  const { submit, successMessage, actionLabel, doneLabel } = useSubmitVideoToLibrary();
  const proposeMutation = useMutation({
    mutationFn: () => {
      return submit({
        video_id: reel.post_id,
        platform: 'instagram',
        title: reel.description?.slice(0, 200) || '',
        description: reel.description || '',
        video_url: reel.url,
        author_username: reel.profile?.username || '',
        thumbnail_url: reel.thumbnail_drive_url || reel.thumbnail_url || undefined,
        views_count: reel.play_count,
        likes_count: reel.likes_count,
        comments_count: reel.comments_count,
        hashtags: reel.hashtags,
        source: 'SCRAPED',
      });
    },
    onSuccess: () => toast.success(successMessage),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col">
      <a
        href={reel.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden"
      >
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
      </a>
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">{new Date(reel.date_posted).toLocaleDateString('vi-VN')}</p>
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

export default function InstagramExternalPage() {
  const { token, user } = useAuthStore();
  const canManageChannels = user?.roles?.some(r => [UserRole.ADMIN, UserRole.LEADER].includes(r)) ?? false;
  const queryClient = useQueryClient();
  const router = useRouter();
  const { start: startProfileScrapeNotif } = useProfileScrapeNotification('instagram');

  // Xoá cứng kênh: BE xoá kèm toàn bộ reels/lịch sử, không hoàn tác được. Hộp xác nhận
  // phải nói số video sắp mất — trên thẻ thì kênh 300 reels trông y hệt kênh rỗng.
  const deleteChannelMutation = useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error('No token');
      return scraperService.deleteExternalChannel(token, 'instagram', id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-profiles'] });
      toast.success(
        data.videos_deleted > 0
          ? `Đã xoá ${data.name} và ${data.videos_deleted.toLocaleString('vi-VN')} video`
          : `Đã xoá ${data.name}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDeleteChannel = (id: number, name: string, videoCount: number) => {
    if (!window.confirm(buildDeleteChannelConfirm({ name, videoCount }))) return;
    deleteChannelMutation.mutate(id);
  };

  // ─── Profiles section ─────────────────────────────────
  const [profilesCollapsed, setProfilesCollapsed] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'followers' | 'recent'>('followers');
  const [profileTab, setProfileTab] = useState<'all' | 'periodic' | 'bookmarked'>('all');
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const hasProfileFilters = !!search || sortBy !== 'followers' || profileTab !== 'all';
  const clearProfileFilters = () => { setSearch(''); setSortBy('followers'); setProfileTab('all'); };

  const profilesQuery = useQuery({
    queryKey: ['instagram-profiles', page, debouncedSearch, sortBy, profileTab],
    queryFn: () => token ? scraperService.getInstagramProfiles(token, {
      page, page_size: PAGE_SIZE_PROFILES, search: debouncedSearch || undefined, is_owned: false,
      tracked: profileTab === 'periodic' ? 'true' : undefined,
      bookmarked: profileTab === 'bookmarked' ? 'true' : undefined,
    }) : Promise.reject('No token'),
    enabled: !!token,
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.profiles?.some(
        (p) => p.scraping_status === 'processing'
      );
      return hasProcessing ? 3000 : 15000;
    },
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

  const allReels = dedupeById(reelsQuery.data?.pages.flatMap(p => p.reels) || []);
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
    mutationFn: ({ id, field }: { id: number; field: InstagramToggleField }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleInstagramProfile(token, id, field);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-profiles'] });
      if (vars.field === 'is_owned') {
        // Trang Tổng quan kênh nội bộ đọc theo đúng cờ này; không dọn cache thì người dùng
        // bật xong quay sang vẫn thấy trang cũ và tưởng là không ăn.
        queryClient.invalidateQueries({ queryKey: ['owned-stats'] });
        queryClient.invalidateQueries({ queryKey: ['owned-dup'] });
        toast.success('Đã cập nhật kênh nội bộ — số liệu sẽ hiện ở trang Tổng quan kênh nội bộ');
      }
    },
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
      <div>
        <WatchFeedButton platform="instagram" label="Xem ngay tại đây" />
      </div>
      {/* Input username — chỉ leader/admin */}
      {canManageChannels && (
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
            {/* Filter bar: Tabs + Search + Sort + Sync button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              {/* Filter Tabs: Tất cả | Kênh chú ý | Đã lưu */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => { setProfileTab('all'); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    profileTab === 'all'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => { setProfileTab('periodic'); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    profileTab === 'periodic'
                      ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-emerald-600'
                  }`}
                >
                  <Timer size={14} weight="fill" />
                  Kênh chú ý
                </button>
                <button
                  type="button"
                  onClick={() => { setProfileTab('bookmarked'); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    profileTab === 'bookmarked'
                      ? 'bg-card text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-slate-500 hover:text-amber-600'
                  }`}
                >
                  <BookmarkSimple size={14} weight="fill" />
                  Đã lưu
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                  <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm theo username..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <FilterSelect
                  value={sortBy}
                  onChange={val => setSortBy(val as 'followers' | 'recent')}
                  options={[
                    { value: 'followers', label: 'Nhiều followers nhất' },
                    { value: 'recent', label: 'Mới thêm gần đây' },
                  ]}
                  placeholder="Sắp xếp"
                  triggerClassName="h-8 py-1 text-xs"
                />
                {hasProfileFilters && (
                  <button onClick={clearProfileFilters} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
                    <X size={12} /> Xóa lọc
                  </button>
                )}
                {canManageChannels && (
                  <SyncAllChannelsButton platform="instagram" channelCount={totalProfiles} />
                )}
              </div>
            </div>

            {profilesQuery.isLoading ? (
              <div className="flex justify-center py-8"><CircleNotch size={24} className="animate-spin text-primary" /></div>
            ) : profiles.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-center">
                <UserCircle size={36} className="text-slate-300" />
                <p className="text-sm font-medium text-foreground">
                  {profileTab === 'periodic'
                    ? 'Chưa có kênh nào được đánh dấu chú ý.'
                    : profileTab === 'bookmarked'
                    ? 'Chưa có kênh nào được lưu.'
                    : 'Chưa có profile nào'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  {profileTab === 'periodic'
                    ? 'Bấm vào biểu tượng chiếc đồng hồ ở góc dưới mỗi thẻ kênh để thêm vào danh sách theo dõi.'
                    : profileTab === 'bookmarked'
                    ? 'Bấm vào biểu tượng bookmark để lưu kênh.'
                    : 'Nhập Instagram username ở trên để bắt đầu cào.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {profiles.map(p => (
                  <InstagramProfileCard
                    key={p.id}
                    profile={p}
                    onScrape={canManageChannels ? () => rescrapeMutation.mutate({ id: p.id, username: p.username }) : undefined}
                    onToggleBookmark={() => toggleMutation.mutate({ id: p.id, field: 'is_bookmarked' })}
                    onToggleTracked={canManageChannels ? () => toggleMutation.mutate({ id: p.id, field: 'is_tracked' }) : undefined}
                    onToggleOwned={canManageChannels ? () => toggleMutation.mutate({ id: p.id, field: 'is_owned' }) : undefined}
                    onViewDetail={() => router.push(`/dashboard/externalChannels/instagram/${p.id}`)}
                    onDelete={canManageChannels ? () => handleDeleteChannel(p.id, p.username, p.reels_in_db ?? 0) : undefined}
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
        <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border rounded-xl p-3 shadow-xs mb-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={reelSearch}
              onChange={e => setReelSearch(e.target.value)}
              placeholder="Tìm theo caption..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
            />
            {reelSearch && (
              <button
                type="button"
                onClick={() => setReelSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <FilterSelect
            value={selectedProfile}
            onChange={setSelectedProfile}
            options={[
              { value: '', label: 'Tất cả profile' },
              ...profiles.map(p => ({
                value: String(p.id),
                label: `@${p.username}`,
                count: p.reels_in_db ?? undefined,
              })),
            ]}
            placeholder="Tất cả profile"
            icon={<InstagramLogo size={15} weight="bold" className="text-pink-500" />}
            searchPlaceholder="Tìm profile..."
          />
          <div className="relative w-32">
            <Eye size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="number"
              value={minPlays}
              onChange={e => setMinPlays(e.target.value)}
              placeholder="Min View"
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
            value={sortReels}
            onChange={setSortReels}
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
          {hasReelFilters && (
            <button
              type="button"
              onClick={clearReelFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all cursor-pointer select-none ml-auto sm:ml-0"
            >
              <X size={13} weight="bold" /> Xóa lọc
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {allReels.map(reel => <InstagramReelCard key={reel.post_id} reel={reel} />)}
              {reelsQuery.isFetchingNextPage && Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-[9/16] bg-slate-200 dark:bg-slate-700" />
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
