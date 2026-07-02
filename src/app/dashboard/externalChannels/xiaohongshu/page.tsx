'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CircleNotch, FilmReel, MagnifyingGlassPlus, Heart,
  Bookmarks, ChatCircle, User, Plus,
  ArrowClockwise, CheckCircle, Warning,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/auth-store';
import { scraperService, XiaohongshuVideo, XiaohongshuProfile } from '@/services/scraperService';
import { useScrapingStore } from '@/store/scraping-store';

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatDuration(s: number): string {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function relativeTime(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return `${Math.floor(diff / 604800)} tuần trước`;
}

function XhsVideoCard({ video }: { video: XiaohongshuVideo }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden max-h-[300px]">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <FilmReel size={32} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2.5 pb-2.5 pt-8">
          <div className="flex items-center gap-2.5 text-white text-xs">
            <span className="flex items-center gap-1"><Heart size={12} weight="fill" />{formatNum(video.liked_count)}</span>
            <span className="flex items-center gap-1"><Bookmarks size={12} weight="fill" />{formatNum(video.collected_count)}</span>
            <span className="flex items-center gap-1"><ChatCircle size={12} weight="fill" />{formatNum(video.comments_count)}</span>
          </div>
        </div>
        {video.duration_seconds > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-white text-xs font-medium">
            {formatDuration(video.duration_seconds)}
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {video.title && <p className="text-xs font-medium text-foreground line-clamp-1">{video.title}</p>}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{video.description || '(không có caption)'}</p>
        <div className="flex items-center gap-2 mt-auto pt-1">
          {video.author_avatar && (
            <img src={video.author_avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          )}
          <p className="text-xs text-slate-400 truncate">{video.author_name}</p>
          <p className="text-xs text-slate-400 ml-auto flex-shrink-0">{relativeTime(video.date_posted)}</p>
        </div>
      </div>
    </a>
  );
}

// ─── PROFILE CARD ───────────────────────────────────────────
function XhsProfileCard({ profile, onScrape }: { profile: XiaohongshuProfile; onScrape: (p: XiaohongshuProfile) => void }) {
  const router = useRouter();
  const isProcessing = profile.scraping_status === 'processing';

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-all cursor-pointer"
      onClick={() => router.push(`/dashboard/externalChannels/xiaohongshu/${profile.id}`)}
    >
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{profile.nickname || profile.user_id}</p>
          <p className="text-xs text-slate-400 font-mono truncate">{profile.user_id}</p>
          {profile.is_verified && (
            <span className="inline-flex items-center gap-0.5 text-xs text-blue-500 font-medium">
              <CheckCircle size={10} weight="fill" /> Verified
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onScrape(profile); }}
          disabled={isProcessing}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          title="Cào lại"
        >
          <ArrowClockwise size={16} className={isProcessing ? 'animate-spin text-primary' : 'text-slate-400'} />
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <FilmReel size={12} />
          {profile.videos_count ?? 0} videos
        </span>
        {profile.last_scraped_at && (
          <span className="ml-auto">{relativeTime(profile.last_scraped_at)}</span>
        )}
      </div>

      {profile.scrape_error && (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <Warning size={12} />
          <span className="truncate">{profile.scrape_error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isProcessing ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
          profile.is_initial_scraped ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}>
          {isProcessing ? 'Đang cào...' : profile.is_initial_scraped ? 'Đã cào' : 'Chưa cào'}
        </span>
        {profile.is_bookmarked && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Đã lưu</span>
        )}
      </div>
    </div>
  );
}

// ─── SEARCH TAB ──────────────────────────────────────────────
function VideoSearchTab() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [numPosts, setNumPosts] = useState('20');
  const [suggestions, setSuggestions] = useState<{ keyword: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topKeywords, setTopKeywords] = useState<{ keyword: string; count: number }[]>([]);
  const suggestTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    scraperService.xiaohongshuKeywordSuggest(token, '').then(setTopKeywords);
  }, [token]);

  useEffect(() => {
    clearTimeout(suggestTimer.current);
    if (!keyword.trim() || !token) { setSuggestions([]); return; }
    suggestTimer.current = setTimeout(async () => {
      const results = await scraperService.xiaohongshuKeywordSuggest(token, keyword);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 250);
    return () => clearTimeout(suggestTimer.current);
  }, [keyword, token]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [filterQ, setFilterQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sortBy, setSortBy] = useState<'likes' | 'date' | 'collects'>('likes');
  const [minLikes, setMinLikes] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const filterTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => setDebouncedQ(filterQ), 300);
    return () => clearTimeout(filterTimer.current);
  }, [filterQ]);

  const videosQuery = useInfiniteQuery({
    queryKey: ['xhs-videos', debouncedQ, sortBy, minLikes, keywordFilter],
    queryFn: ({ pageParam = 1 }) => {
      if (!token) return Promise.reject();
      return scraperService.getXiaohongshuVideos(token, {
        page: pageParam, page_size: 24,
        q: debouncedQ || undefined,
        sort: sortBy,
        min_likes: minLikes ? Number(minLikes) : undefined,
        keyword: keywordFilter || undefined,
      });
    },
    getNextPageParam: (last) => last.page < last.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!token,
  });

  const allVideos = videosQuery.data?.pages.flatMap(p => p.videos) || [];
  const total = videosQuery.data?.pages[0]?.count || 0;

  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (videosQuery.isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && videosQuery.hasNextPage) videosQuery.fetchNextPage();
    }, { rootMargin: '200px' });
    if (node) observerRef.current.observe(node);
  }, [videosQuery.isFetchingNextPage, videosQuery.hasNextPage, videosQuery.fetchNextPage]);

  const searchMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('No token');
      const kw = keyword.trim();
      if (!kw) throw new Error('Nhập keyword');
      return scraperService.xiaohongshuSearch(token, kw, Number(numPosts) || 20);
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Tìm kiếm xong');
      queryClient.invalidateQueries({ queryKey: ['xhs-videos'] });
      queryClient.invalidateQueries({ queryKey: ['xhs-suggest'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSearch = () => {
    if (!keyword.trim()) return;
    setShowSuggestions(false);
    searchMutation.mutate();
  };

  const pickSuggestion = (kw: string) => {
    setKeyword(kw);
    setShowSuggestions(false);
    setKeywordFilter(kw);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Search bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-xl" ref={dropdownRef}>
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onFocus={() => {
                if (keyword.trim()) {
                  if (suggestions.length) setShowSuggestions(true);
                } else {
                  setSuggestions(topKeywords);
                  setShowSuggestions(topKeywords.length > 0);
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Nhập keyword tiếng Trung (vd: 美食推荐)"
              className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.keyword}
                    onMouseDown={() => pickSuggestion(s.keyword)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                  >
                    <span className="text-foreground">{s.keyword}</span>
                    <span className="text-xs text-slate-400">{s.count} videos</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="number" value={numPosts}
            onChange={e => setNumPosts(e.target.value)}
            min={1} max={100}
            className="w-24 px-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Số lượng"
          />
          <button
            onClick={handleSearch}
            disabled={searchMutation.isPending || !keyword.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-sm"
          >
            {searchMutation.isPending
              ? <CircleNotch size={16} weight="bold" className="animate-spin" />
              : <MagnifyingGlassPlus size={16} weight="bold" />}
            {searchMutation.isPending ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border border-border rounded-xl p-4">
        <input type="text" value={filterQ} onChange={e => setFilterQ(e.target.value)}
          placeholder="Lọc theo tiêu đề, caption..."
          className="flex-1 min-w-[160px] max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <input type="text" value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)}
          placeholder="Keyword"
          className="w-36 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <input type="number" value={minLikes} onChange={e => setMinLikes(e.target.value)}
          placeholder="Min likes"
          className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'likes' | 'date' | 'collects')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <option value="likes">Nhiều likes nhất</option>
          <option value="collects">Nhiều saves nhất</option>
          <option value="date">Mới nhất</option>
        </select>
      </div>

      <h2 className="text-sm font-semibold text-foreground">
        Videos {total > 0 && <span className="font-normal text-slate-500">({total})</span>}
      </h2>

      {videosQuery.isLoading && (
        <div className="flex justify-center py-12">
          <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
        </div>
      )}

      {!videosQuery.isLoading && allVideos.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
          <span className="text-5xl">📕</span>
          <p className="text-sm text-foreground font-medium">Chưa có video nào</p>
          <p className="text-xs text-slate-400 text-center max-w-sm">
            Nhập keyword tiếng Trung ở trên và bấm Tìm kiếm để bắt đầu.
          </p>
        </div>
      )}

      {allVideos.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {allVideos.map(v => <XhsVideoCard key={v.note_id} video={v} />)}
            {videosQuery.isFetchingNextPage && Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-[9/16] max-h-[280px] bg-slate-200 dark:bg-slate-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
          <div ref={loadMoreRef} className="h-4" />
          {!videosQuery.hasNextPage && (
            <p className="text-xs text-slate-400 text-center py-4">Đã hiển thị toàn bộ {total} videos.</p>
          )}
        </>
      )}
    </div>
  );
}

// ─── PROFILES TAB ────────────────────────────────────────────
function ProfilesTab() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useScrapingStore();
  const [userId, setUserId] = useState('');
  const [numPosts, setNumPosts] = useState('600');
  const [q, setQ] = useState('');

  // Track notification IDs per user_id so we can update them when scraping finishes
  const scrapeNotifIds = useRef<Map<string, string>>(new Map());
  // Track previous scraping statuses to detect transitions
  const prevStatusMap = useRef<Record<number, string>>({});

  const profilesQuery = useQuery({
    queryKey: ['xhs-profiles', q],
    queryFn: () => scraperService.getXhsProfiles(token!, { q: q || undefined }),
    enabled: !!token,
    // Poll every 3s while any profile is processing
    refetchInterval: (query) => {
      const profiles = query.state.data?.profiles || [];
      return profiles.some(p => p.scraping_status === 'processing') ? 3000 : false;
    },
  });

  // Watch for processing → done/error transitions to update notifications
  useEffect(() => {
    const profiles = profilesQuery.data?.profiles || [];
    profiles.forEach(p => {
      const prev = prevStatusMap.current[p.id];
      if (prev === 'processing' && p.scraping_status !== 'processing') {
        const notifId = scrapeNotifIds.current.get(p.user_id);
        if (notifId) {
          updateNotification(notifId, {
            status: p.scraping_status === 'completed' ? 'done' : 'error',
            completedAt: new Date(),
            newCount: undefined,
          });
          scrapeNotifIds.current.delete(p.user_id);
        }
      }
      prevStatusMap.current[p.id] = p.scraping_status;
    });
  }, [profilesQuery.data?.profiles, updateNotification]);

  const scrapeMutation = useMutation({
    mutationFn: (uid: string) => scraperService.xhsProfileScrape(token!, uid, Number(numPosts) || 600),
    onSuccess: (data, uid) => {
      toast.success(data.message || 'Đã thêm profile và bắt đầu cào');
      setUserId('');

      const label = data.profile?.nickname || uid;
      const notifId = addNotification({
        platform: 'xiaohongshu',
        label,
        status: 'scraping',
        startedAt: new Date(),
      });
      scrapeNotifIds.current.set(uid, notifId);

      queryClient.invalidateQueries({ queryKey: ['xhs-profiles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleRescrape = (profile: XiaohongshuProfile) => {
    if (profile.scraping_status === 'processing') return;
    scrapeMutation.mutate(profile.user_id);
  };

  const profiles = profilesQuery.data?.profiles || [];
  const total = profilesQuery.data?.count || 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Add profile */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-slate-500 mb-3">Thêm Xiaohongshu user bằng User ID (chuỗi hex, vd: 61b46d790000000010008153)</p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && userId.trim()) scrapeMutation.mutate(userId.trim()); }}
            placeholder="User ID (vd: 61b46d790000000010008153)"
            className="flex-1 min-w-[280px] px-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono"
          />
          <input
            type="number" value={numPosts}
            onChange={e => setNumPosts(e.target.value)}
            min={1} max={600}
            className="w-24 px-3 py-2.5 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Số video"
          />
          <button
            onClick={() => { if (userId.trim()) scrapeMutation.mutate(userId.trim()); }}
            disabled={scrapeMutation.isPending || !userId.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          >
            {scrapeMutation.isPending
              ? <CircleNotch size={16} weight="bold" className="animate-spin" />
              : <Plus size={16} weight="bold" />}
            {scrapeMutation.isPending ? 'Đang thêm...' : 'Thêm & Cào'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Tìm theo nickname hoặc user_id..."
          className="flex-1 max-w-sm px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <p className="text-sm text-slate-500">{total > 0 && `${total} profiles`}</p>
      </div>

      {profilesQuery.isLoading && (
        <div className="flex justify-center py-12">
          <CircleNotch size={28} weight="bold" className="animate-spin text-primary" />
        </div>
      )}

      {!profilesQuery.isLoading && profiles.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4 bg-card border border-border rounded-xl">
          <span className="text-5xl">📕</span>
          <p className="text-sm text-foreground font-medium">Chưa có profile nào</p>
          <p className="text-xs text-slate-400">Nhập User ID ở trên để thêm và bắt đầu theo dõi.</p>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map(p => (
            <XhsProfileCard key={p.id} profile={p} onScrape={handleRescrape} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PAGE ROOT ───────────────────────────────────────────────
type Tab = 'videos' | 'profiles';

export default function XiaohongshuExternalPage() {
  const [tab, setTab] = useState<Tab>('videos');

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {([['videos', 'Videos'], ['profiles', 'Profiles']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'videos' ? <VideoSearchTab /> : <ProfilesTab />}
    </div>
  );
}
