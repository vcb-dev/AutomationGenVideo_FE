'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CircleNotch, FilmReel, Warning, MagnifyingGlassPlus,
  VideoCamera, UserCircle, Sparkle, Heart,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TikTokVideoCard from '../components/TikTokVideoCard';
import DouyinProfileCard from '../components/DouyinProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { scraperService, DouyinVideo } from '@/services/scraperService';
import { useScrapingStore } from '@/store/scraping-store';
import { useProfileScrapeNotification } from '@/hooks/useProfileScrapeNotification';
import { UserRole } from '@/types/auth';

type Tab = 'videos' | 'profiles';

export default function DouyinExternalPage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.roles?.includes(UserRole.ADMIN) ?? false;
  const { addNotification, updateNotification } = useScrapingStore();
  const { start: startProfileScrapeNotif } = useProfileScrapeNotification('douyin');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('videos');

  // ─── Search state ─────────────────────────────────────
  const [keyword, setKeyword] = useState('');
  const [numPosts, setNumPosts] = useState('30');

  // ─── Autocomplete ─────────────────────────────────────
  const [suggestions, setSuggestions] = useState<{ keyword: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topKeywords, setTopKeywords] = useState<{ keyword: string; count: number }[]>([]);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const suggestTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    scraperService.douyinKeywordSuggest(token, '').then(list => {
      setTopKeywords(list);
      setAllKeywords(list.map(s => s.keyword));
    });
  }, [token]);

  useEffect(() => {
    clearTimeout(suggestTimer.current);
    if (!keyword.trim() || !token) { setSuggestions([]); return; }
    suggestTimer.current = setTimeout(async () => {
      const results = await scraperService.douyinKeywordSuggest(token, keyword);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 250);
    return () => clearTimeout(suggestTimer.current);
  }, [keyword, token]);

  const handleInputFocus = () => {
    if (keyword.trim()) {
      if (suggestions.length > 0) setShowSuggestions(true);
    } else {
      setSuggestions(topKeywords);
      setShowSuggestions(topKeywords.length > 0);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Filter state ────────────────────────────────────
  const [filterSearch, setFilterSearch] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [minDigg, setMinDigg] = useState('1000');
  const [sortBy, setSortBy] = useState('scraped');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filterTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    filterTimer.current = setTimeout(() => setDebouncedFilter(filterSearch), 300);
    return () => clearTimeout(filterTimer.current);
  }, [filterSearch]);

  const hasFilters = !!debouncedFilter || !!filterKeyword || minDigg !== '1000' || !!dateFrom || !!dateTo || sortBy !== 'scraped';
  const clearFilters = () => { setFilterSearch(''); setFilterKeyword(''); setMinDigg('1000'); setDateFrom(''); setDateTo(''); setSortBy('scraped'); };

  // ─── Notification refs ────────────────────────────────
  const notifIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // ─── Search mutation ──────────────────────────────────
  const searchMutation = useMutation({
    mutationFn: () => {
      if (!token || !keyword.trim()) throw new Error('Keyword required');
      const num = Math.min(200, Math.max(1, parseInt(numPosts) || 30));
      return scraperService.douyinSearch(token, keyword.trim(), num);
    },
    onMutate: () => {
      const nId = addNotification({
        platform: 'douyin',
        kind: 'keyword',
        label: keyword.trim(),
        status: 'scraping',
        startedAt: new Date(),
      });
      notifIdRef.current = nId;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setSortBy('scraped');
      queryClient.invalidateQueries({ queryKey: ['douyin-videos'] });
      if (notifIdRef.current) {
        updateNotification(notifIdRef.current, {
          status: 'done',
          completedAt: new Date(),
          newCount: data.created ?? 0,
        });
        notifIdRef.current = null;
      }
    },
    onError: (e: Error) => {
      toast.error(e.message);
      if (notifIdRef.current) {
        updateNotification(notifIdRef.current, { status: 'error' });
        notifIdRef.current = null;
      }
    },
  });

  // ─── Videos infinite scroll ───────────────────────────
  const videosQuery = useInfiniteQuery({
    queryKey: ['douyin-videos', debouncedFilter, filterKeyword, minDigg, sortBy, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject('No token');
      return scraperService.getDouyinVideos(token, {
        q: debouncedFilter || undefined,
        search_keyword: filterKeyword || undefined,
        page: pageParam,
        page_size: 24,
        min_digg: minDigg ? Number(minDigg) : undefined,
        sort: sortBy,
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

  // ─── Profile tab state ────────────────────────────────
  const [profileSecId, setProfileSecId] = useState('');
  const [profileSearch, setProfileSearch] = useState('');
  const [debouncedProfileSearch, setDebouncedProfileSearch] = useState('');
  const [profilePage, setProfilePage] = useState(1);
  const [profileSortBy, setProfileSortBy] = useState<'followers' | 'recent'>('followers');
  const profileSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    profileSearchTimer.current = setTimeout(() => { setDebouncedProfileSearch(profileSearch); setProfilePage(1); }, 300);
    return () => clearTimeout(profileSearchTimer.current);
  }, [profileSearch]);

  const hasProfileFilters = !!profileSearch || profileSortBy !== 'followers';
  const clearProfileFilters = () => { setProfileSearch(''); setProfileSortBy('followers'); };

  const profilesQuery = useQuery({
    queryKey: ['douyin-profiles', profilePage, debouncedProfileSearch, profileSortBy],
    queryFn: () => scraperService.getDouyinProfiles(token!, {
      page: profilePage, page_size: 12, search: debouncedProfileSearch || undefined,
      sort_by: profileSortBy,
    }),
    enabled: !!token && activeTab === 'profiles',
  });

  const profiles = profilesQuery.data?.profiles || [];
  const profileTotalPages = profilesQuery.data?.total_pages || 1;
  const profileTotal = profilesQuery.data?.count || 0;

  const profileScrapeMutation = useMutation({
    mutationFn: (secUserId: string) => scraperService.douyinProfileScrape(token!, secUserId),
    onSuccess: (data) => {
      if (data.already_exists) {
        toast(data.message, { icon: '📋' });
        router.push(`/dashboard/externalChannels/douyin/${data.profile_id}`);
      } else if (data.newly_scraped) {
        toast.success(data.message);
        router.push(`/dashboard/externalChannels/douyin/${data.profile_id}`);
      } else {
        toast(data.message, { icon: '⏳' });
        startProfileScrapeNotif({
          label: profileSecId.trim(),
          before: 0,
          fetchStatus: async () => {
            const d = await scraperService.getDouyinProfileDetail(token!, data.profile_id);
            return { scraping_status: d.scraping_status, count: d.videos_in_db };
          },
        });
      }
      setProfileSecId('');
      queryClient.invalidateQueries({ queryKey: ['douyin-profiles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profileRescrape = useMutation({
    mutationFn: ({ secUserId }: { secUserId: string; label: string }) =>
      scraperService.douyinProfileScrape(token!, secUserId),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['douyin-profiles'] });
      if (!data.already_exists && !data.newly_scraped) {
        const before = profiles.find(pr => pr.sec_user_id === vars.secUserId)?.videos_in_db ?? 0;
        startProfileScrapeNotif({
          label: vars.label,
          before,
          fetchStatus: async () => {
            const d = await scraperService.getDouyinProfileDetail(token!, data.profile_id);
            return { scraping_status: d.scraping_status, count: d.videos_in_db };
          },
        });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profileToggleMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: 'is_bookmarked' | 'is_tracked' }) =>
      scraperService.toggleDouyinProfile(token!, id, field),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['douyin-profiles'] }),
  });

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (videosQuery.isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && videosQuery.hasNextPage) videosQuery.fetchNextPage();
    }, { rootMargin: '200px' });
    if (node) observerRef.current.observe(node);
  }, [videosQuery.isFetchingNextPage, videosQuery.hasNextPage, videosQuery.fetchNextPage]);

  // Map DouyinVideo → TikTokVideoCard compatible shape
  const mapVideo = (v: DouyinVideo) => ({
    post_id: v.post_id,
    shortcode: v.post_id,
    url: v.url,
    description: v.description,
    hashtags: v.hashtags,
    video_url: '',
    cdn_url: '',
    preview_image: v.preview_image,
    video_duration: v.video_duration,
    region: v.region,
    digg_count: v.digg_count,
    comment_count: v.comment_count,
    share_count: v.share_count,
    collect_count: v.collect_count,
    music_title: v.music_title,
    search_keyword: v.search_keyword,
    date_posted: v.date_posted,
    author: { ...v.author, url: `https://www.douyin.com/user/${v.author.id}` },
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === 'videos' ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm' : 'text-slate-500 hover:text-foreground'
          }`}
        >
          <VideoCamera size={15} weight={activeTab === 'videos' ? 'fill' : 'regular'} />
          Khám phá Video
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === 'profiles' ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm' : 'text-slate-500 hover:text-foreground'
          }`}
        >
          <UserCircle size={15} weight={activeTab === 'profiles' ? 'fill' : 'regular'} />
          Khám phá Profile
        </button>
      </div>

      {/* ─── Videos Tab ──────────────────────────────────── */}
      {activeTab === 'videos' && (
        <>
          {/* Search bar */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-lg">
                <Sparkle size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onFocus={handleInputFocus}
                  onKeyDown={e => { if (e.key === 'Enter') { setShowSuggestions(false); searchMutation.mutate(); } }}
                  placeholder="Nhập keyword để tìm video Douyin..."
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                {showSuggestions && (
                  <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl z-[60] overflow-hidden">
                    {suggestions.map(s => (
                      <button
                        key={s.keyword}
                        onClick={() => { setKeyword(s.keyword); setShowSuggestions(false); inputRef.current?.focus(); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                      >
                        <span>{s.keyword}</span>
                        <span className="text-xs text-slate-400">{s.count} video</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                value={numPosts}
                onChange={e => setNumPosts(e.target.value)}
                placeholder="Số lượng"
                min={1}
                max={200}
                className="w-24 px-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Số video tối đa (1-200)"
              />
              <button
                onClick={() => searchMutation.mutate()}
                disabled={searchMutation.isPending || !keyword.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-sm hover:shadow-md transition-all"
              >
                {searchMutation.isPending
                  ? <CircleNotch size={16} weight="bold" className="animate-spin" />
                  : <MagnifyingGlassPlus size={16} weight="bold" />}
                {searchMutation.isPending ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </div>

          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 border border-border rounded-xl p-4">
            <input
              type="text"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Lọc theo caption, hashtag..."
              className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <select
              value={filterKeyword}
              onChange={e => setFilterKeyword(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">Tất cả keyword</option>
              {suggestions.length > 0
                ? suggestions.map(s => <option key={s.keyword} value={s.keyword}>{s.keyword} ({s.count})</option>)
                : allKeywords.map(k => <option key={k} value={k}>{k}</option>)
              }
            </select>
            <div className="flex items-center gap-1.5">
              <Heart size={14} className="text-rose-400 flex-shrink-0" />
              <input
                type="number"
                value={minDigg}
                onChange={e => setMinDigg(e.target.value)}
                placeholder="Min tim"
                min={0}
                className="w-24 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Lọc video có ít nhất X lượt tim"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="scraped">Mới cào về</option>
              <option value="date">Ngày đăng mới nhất</option>
              <option value="likes">Nhiều tim nhất</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Từ ngày" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none" title="Đến ngày" />
            {hasFilters && (
              <button onClick={clearFilters} className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50">
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Count */}
          <h2 className="text-sm font-semibold text-foreground">
            Videos {totalVideos > 0 && <span className="font-normal text-slate-500">({totalVideos})</span>}
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
              <button onClick={() => videosQuery.refetch()} className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-slate-50">
                Thử lại
              </button>
            </div>
          )}

          {/* Empty */}
          {!videosQuery.isLoading && !videosQuery.isError && allVideos.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
              <FilmReel size={32} className="text-slate-300" />
              <p className="text-sm text-foreground font-medium">Chưa có video Douyin nào</p>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                Nhập keyword rồi bấm &quot;Tìm kiếm&quot; để cào video từ Douyin.
              </p>
            </div>
          )}

          {/* Grid */}
          {allVideos.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allVideos.map(v => <TikTokVideoCard key={v.post_id} video={mapVideo(v)} />)}
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
                <p className="text-xs text-slate-400 text-center py-4">
                  Đã hiển thị toàn bộ {totalVideos} videos.
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ─── Profiles Tab ────────────────────────────────── */}
      {activeTab === 'profiles' && (
        <>
          {/* Input sec_user_id — admin only */}
          {isAdmin && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xl">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono select-none">ID</span>
                  <input
                    type="text"
                    value={profileSecId}
                    onChange={e => setProfileSecId(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && profileSecId.trim()) profileScrapeMutation.mutate(profileSecId.trim()); }}
                    placeholder="sec_user_id (MS4wLjAB...)"
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <button
                  onClick={() => profileScrapeMutation.mutate(profileSecId.trim())}
                  disabled={profileScrapeMutation.isPending || !profileSecId.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-sm transition-all"
                >
                  {profileScrapeMutation.isPending ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <MagnifyingGlassPlus size={16} weight="bold" />}
                  {profileScrapeMutation.isPending ? 'Đang gửi...' : 'Cào Profile'}
                </button>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 border border-border rounded-xl p-4">
            <input
              type="text"
              value={profileSearch}
              onChange={e => setProfileSearch(e.target.value)}
              placeholder="Tìm theo username, tên..."
              className="flex-1 min-w-[180px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <select
              value={profileSortBy}
              onChange={e => setProfileSortBy(e.target.value as 'followers' | 'recent')}
              className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="followers">Nhiều followers nhất</option>
              <option value="recent">Mới thêm gần đây</option>
            </select>
            {hasProfileFilters && (
              <button onClick={clearProfileFilters} className="px-3 py-2 text-xs font-medium text-slate-600 border border-border rounded-md hover:bg-slate-50">
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Count */}
          <h2 className="text-sm font-semibold text-foreground">
            Profiles {profileTotal > 0 && <span className="font-normal text-slate-500">({profileTotal})</span>}
          </h2>

          {/* Loading */}
          {profilesQuery.isLoading && (
            <div className="flex justify-center py-12">
              <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
            </div>
          )}

          {/* Empty */}
          {!profilesQuery.isLoading && profiles.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
              <UserCircle size={40} className="text-slate-300" />
              <p className="text-sm text-foreground font-medium">Chưa có profile nào</p>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                Nhập sec_user_id của tài khoản Douyin ở trên để bắt đầu cào.
              </p>
            </div>
          )}

          {/* Grid */}
          {profiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {profiles.map(p => (
                <DouyinProfileCard
                  key={p.id}
                  profile={p}
                  onScrape={isAdmin ? () => profileRescrape.mutate({ secUserId: p.sec_user_id, label: p.nickname || p.username }) : undefined}
                  onToggleBookmark={() => profileToggleMutation.mutate({ id: p.id, field: 'is_bookmarked' })}
                  onToggleTracked={() => profileToggleMutation.mutate({ id: p.id, field: 'is_tracked' })}
                  onViewDetail={() => router.push(`/dashboard/externalChannels/douyin/${p.id}`)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {profileTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Trang {profilePage}/{profileTotalPages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setProfilePage(p => Math.max(1, p - 1))} disabled={profilePage <= 1} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft size={12} /> Trước
                </button>
                <button onClick={() => setProfilePage(p => Math.min(profileTotalPages, p + 1))} disabled={profilePage >= profileTotalPages} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-slate-50 disabled:opacity-40">
                  Sau <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
