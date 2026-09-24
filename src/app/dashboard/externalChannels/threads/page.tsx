'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CircleNotch,
  MagnifyingGlassPlus,
  Timer,
  BookmarkSimple,
  MagnifyingGlass,
  X,
  Users,
  Flame,
  VideoCamera,
  CalendarCheck,
  Television,
  Funnel,
  TrendUp,
  DownloadSimple,
  Check,
  BookOpen,
  Plus,
  Database,
} from '@phosphor-icons/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { SiThreads } from 'react-icons/si';

import ThreadsProfileCard from '../components/ThreadsProfileCard';
import ThreadsHotPostCard from '../components/ThreadsHotPostCard';
import SyncAllChannelsButton from '../components/SyncAllChannelsButton';
import ConfirmModal from '../components/ConfirmModal';
import BulkAddThreadsModal from '../components/BulkAddThreadsModal';
import { useAuthStore } from '@/store/auth-store';
import {
  scraperService,
  ThreadsProfile,
  ThreadsToggleField,
  ThreadsPost,
} from '@/services/scraperService';
import { buildDeleteChannelConfirm } from '@/lib/scrape/delete-channel';
import {
  isVietnamese,
  countWords,
  isStoryPost,
  parseMultipleUsernames,
} from '@/lib/scrape/threads-helpers';

const PAGE_SIZE_PROFILES = 12;

const QUICK_TOPICS = [
  'Chuyện mua vàng',
  'Tâm sự nhẫn cưới',
  'Trang sức bạc',
  'Quà tặng bạn gái',
  'Chuyện công sở',
  'Review đồ gia dụng',
  'Tài chính cá nhân',
  'Kể chuyện đời sống',
];

export default function ThreadsExternalPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Active top-level Tab: 'radar' (Khám phá bài HOT) hoặc 'channels' (Kênh theo dõi)
  const [activeMainTab, setActiveMainTab] = useState<'radar' | 'channels'>('radar');

  // ─── TAB 1: RADAR BÀI HOT & KHO VIDEO TỔNG HỢP ────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [hotMode, setHotMode] = useState<'days' | 'count'>('days');
  const [hotDays, setHotDays] = useState('7');
  const [hotCount, setHotCount] = useState('50');
  const [langFilter, setLangFilter] = useState<'VI' | 'ALL'>('VI');
  const [mediaFilter, setMediaFilter] = useState<'ALL' | 'VIDEO' | 'IMAGE' | 'TEXT'>('ALL');
  const [storyFilter, setStoryFilter] = useState<'ALL' | 'STORY_ONLY'>('ALL');
  const [likeRange, setLikeRange] = useState<'ALL' | 'HIDDEN_GEM' | 'MEDIUM' | 'VIRAL'>('ALL');
  const [sortBy, setSortBy] = useState<'likes' | 'views' | 'replies' | 'date' | 'length'>('likes');

  // Chế độ xem trong Tab 1: 'saved_repo' (Kho video & bài viết tổng hợp đã lưu) hoặc 'search_results' (Kết quả quét mới)
  const [radarViewMode, setRadarViewMode] = useState<'saved_repo' | 'search_results'>('saved_repo');
  const [savedPostsPage, setSavedPostsPage] = useState(1);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [debouncedSavedSearch, setDebouncedSavedSearch] = useState('');
  const savedSearchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    savedSearchTimer.current = setTimeout(() => {
      setDebouncedSavedSearch(savedSearchQuery);
      setSavedPostsPage(1);
    }, 300);
    return () => clearTimeout(savedSearchTimer.current);
  }, [savedSearchQuery]);

  // Query toàn bộ kho bài viết & video đã lưu từ trước đến nay (cả từ cào kênh và tìm kiếm từ khoá)
  const {
    data: savedPostsData,
    isLoading: isLoadingSavedPosts,
  } = useQuery({
    queryKey: ['threads-saved-posts', debouncedSavedSearch, mediaFilter, sortBy, savedPostsPage],
    queryFn: () => {
      if (!token) throw new Error('No token');
      return scraperService.getThreadsPosts(token, {
        search: debouncedSavedSearch || undefined,
        media_type: mediaFilter !== 'ALL' ? mediaFilter : undefined,
        sort_by: sortBy === 'length' ? 'likes' : (sortBy as any),
        page: savedPostsPage,
        limit: 24,
      });
    },
    enabled: !!token,
  });

  const savedTotalPosts = savedPostsData?.total || 0;
  const savedTotalPages = savedPostsData?.total_pages || 1;
  const rawSavedPosts = savedPostsData?.items || [];

  // Search Hot Posts Mutation
  const searchHotMutation = useMutation({
    mutationFn: (q: string) => {
      if (!token) throw new Error('No token');
      const count = hotMode === 'count' ? (parseInt(hotCount, 10) || 50) : 50;
      const days = hotMode === 'days' ? (parseInt(hotDays, 10) || 7) : undefined;
      return scraperService.searchThreadsHotPosts(token, q, count, {
        mode: hotMode,
        days,
      });
    },
    onSuccess: (data) => {
      setRadarViewMode('search_results');
      queryClient.invalidateQueries({ queryKey: ['threads-saved-posts'] });
      const count = data?.posts?.length || 0;
      if (count > 0) {
        const vnCount = data.posts.filter((p: any) => isVietnamese(p)).length;
        const vCount = data.posts.filter((p: any) => p.media_type === 'VIDEO' || p.video_url).length;
        const timeframeLabel = hotMode === 'days' ? `trong ${hotDays || 7} ngày qua` : '';
        const msg = `Đã quét ${count} bài viết (${vnCount} bài Tiếng Việt, ${vCount} video) ${timeframeLabel} và tự động lưu vào kho!`.replace('  ', ' ');
        toast.success(msg);
      } else {
        toast.error(
          hotMode === 'days'
            ? `Không tìm thấy bài viết nào trong ${hotDays || 7} ngày qua`
            : 'Không tìm thấy bài viết nào',
        );
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Quét bài viết hot Threads thất bại');
    },
  });

  // Ingest/Save Single Hot Post Mutation
  const savePostMutation = useMutation({
    mutationFn: (p: ThreadsPost) => {
      if (!token) throw new Error('No token');
      return scraperService.ingestThreadsHotPosts(token, [p]);
    },
    onSuccess: (data) => {
      toast.success('Đã lưu bài viết vào hệ thống!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Lưu bài viết thất bại');
    },
  });

  // Batch Save all filtered posts
  const saveAllMutation = useMutation({
    mutationFn: (posts: ThreadsPost[]) => {
      if (!token) throw new Error('No token');
      return scraperService.ingestThreadsHotPosts(token, posts);
    },
    onSuccess: (data) => {
      toast.success(`Đã lưu thành công ${data.saved_count || 0} bài viết vào kho!`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Lưu hàng loạt bài viết thất bại');
    },
  });

  const handleSearchHotSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) {
      toast.error('Vui lòng nhập từ khoá hoặc chọn chủ đề cần tìm');
      return;
    }
    searchHotMutation.mutate(clean);
  };

  const handleSelectTopic = (topic: string) => {
    setSearchQuery(topic);
    searchHotMutation.mutate(topic);
  };

  const rawDiscoveredPosts = searchHotMutation.data?.posts || [];

  // Filter & Sort discovered posts
  const displayedHotPosts = useMemo(() => {
    let list = [...rawDiscoveredPosts];

    // Lọc theo ngôn ngữ (Mặc định: Chỉ hiển thị bài Tiếng Việt)
    if (langFilter === 'VI') {
      list = list.filter((p) => isVietnamese(p));
    }

    if (mediaFilter === 'VIDEO') {
      list = list.filter((p) => p.media_type === 'VIDEO' || Boolean(p.video_url));
    } else if (mediaFilter === 'IMAGE') {
      list = list.filter((p) => p.media_type === 'IMAGE' || p.media_type === 'CAROUSEL');
    } else if (mediaFilter === 'TEXT') {
      list = list.filter((p) => p.media_type === 'TEXT' && !p.video_url && !p.thumbnail_url);
    }

    // Lọc theo dạng bài kể chuyện / văn bản dài
    if (storyFilter === 'STORY_ONLY') {
      list = list.filter((p) => isStoryPost(p));
    }

    // Lọc theo khoảng Like / Hidden Gem
    if (likeRange === 'HIDDEN_GEM') {
      list = list.filter((p) => Number(p.likes_count || 0) < 50);
    } else if (likeRange === 'MEDIUM') {
      list = list.filter((p) => {
        const l = Number(p.likes_count || 0);
        return l >= 50 && l <= 500;
      });
    } else if (likeRange === 'VIRAL') {
      list = list.filter((p) => Number(p.likes_count || 0) > 500);
    }

    list.sort((a, b) => {
      // Khi chọn xem "Toàn cầu", luôn ưu tiên đưa các bài Tiếng Việt lên trước bài nước ngoài
      if (langFilter === 'ALL') {
        const aVn = isVietnamese(a) ? 1 : 0;
        const bVn = isVietnamese(b) ? 1 : 0;
        if (aVn !== bVn) return bVn - aVn;
      }

      if (sortBy === 'likes') {
        return Number(b.likes_count || 0) - Number(a.likes_count || 0);
      }
      if (sortBy === 'views') {
        return Number(b.views_count || 0) - Number(a.views_count || 0);
      }
      if (sortBy === 'replies') {
        return Number(b.replies_count || 0) - Number(a.replies_count || 0);
      }
      if (sortBy === 'date') {
        return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime();
      }
      if (sortBy === 'length') {
        return (b.text || '').length - (a.text || '').length;
      }
      return 0;
    });

    return list;
  }, [rawDiscoveredPosts, langFilter, mediaFilter, storyFilter, likeRange, sortBy]);

  // Filter & Sort saved posts from database
  const displayedSavedPosts = useMemo(() => {
    let list = [...rawSavedPosts];

    // Lọc theo ngôn ngữ (Mặc định: Chỉ hiển thị bài Tiếng Việt)
    if (langFilter === 'VI') {
      list = list.filter((p) => isVietnamese(p));
    }

    // Lọc theo dạng bài kể chuyện / văn bản dài
    if (storyFilter === 'STORY_ONLY') {
      list = list.filter((p) => isStoryPost(p));
    }

    // Lọc theo khoảng Like / Hidden Gem
    if (likeRange === 'HIDDEN_GEM') {
      list = list.filter((p) => Number(p.likes_count || 0) < 50);
    } else if (likeRange === 'MEDIUM') {
      list = list.filter((p) => {
        const l = Number(p.likes_count || 0);
        return l >= 50 && l <= 500;
      });
    } else if (likeRange === 'VIRAL') {
      list = list.filter((p) => Number(p.likes_count || 0) > 500);
    }

    // Client sort bổ sung nếu cần
    if (sortBy === 'length') {
      list.sort((a, b) => (b.text || '').length - (a.text || '').length);
    }

    return list;
  }, [rawSavedPosts, langFilter, storyFilter, likeRange, sortBy]);

  const isShowingSearchResults = radarViewMode === 'search_results' && rawDiscoveredPosts.length > 0;
  const activeSourcePosts = isShowingSearchResults ? rawDiscoveredPosts : rawSavedPosts;
  const currentPostsToDisplay = isShowingSearchResults ? displayedHotPosts : displayedSavedPosts;

  // Thống kê chi tiết theo loại nội dung nguồn đang xem
  const vnPostsCount = useMemo(
    () => activeSourcePosts.filter((p) => isVietnamese(p)).length,
    [activeSourcePosts],
  );
  const activeBasePosts = useMemo(
    () => (langFilter === 'VI' ? activeSourcePosts.filter((p) => isVietnamese(p)) : activeSourcePosts),
    [activeSourcePosts, langFilter],
  );
  const videoPostsCount = useMemo(
    () => activeBasePosts.filter((p) => p.media_type === 'VIDEO' || Boolean(p.video_url)).length,
    [activeBasePosts],
  );
  const imagePostsCount = useMemo(
    () => activeBasePosts.filter((p) => (p.media_type === 'IMAGE' || p.media_type === 'CAROUSEL' || Boolean(p.thumbnail_url)) && p.media_type !== 'VIDEO' && !p.video_url).length,
    [activeBasePosts],
  );
  const textPostsCount = useMemo(
    () => activeBasePosts.filter((p) => (p.media_type === 'TEXT' || (!p.video_url && !p.thumbnail_url))).length,
    [activeBasePosts],
  );
  const storyPostsCount = useMemo(
    () => activeBasePosts.filter((p) => isStoryPost(p)).length,
    [activeBasePosts],
  );
  const hiddenGemsCount = useMemo(
    () => activeBasePosts.filter((p) => isStoryPost(p) && Number(p.likes_count || 0) < 50).length,
    [activeBasePosts],
  );


  // ─── TAB 2: QUẢN LÝ KÊNH THEO DÕI ──────────────────────────────────────────
  const [usernameInput, setUsernameInput] = useState('');
  const [targetMode, setTargetMode] = useState<'days' | 'count'>('days');
  const [targetDays, setTargetDays] = useState('7');
  const [targetCount, setTargetCount] = useState('50');
  const [channelSearch, setChannelSearch] = useState('');
  const [debouncedChannelSearch, setDebouncedChannelSearch] = useState('');
  const [channelPage, setChannelPage] = useState(1);
  const [filterTab, setFilterTab] = useState<'all' | 'tracked' | 'bookmarked'>('all');
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    searchTimer.current = setTimeout(() => {
      setDebouncedChannelSearch(channelSearch);
      setChannelPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [channelSearch]);

  const {
    data: profilesData,
    isLoading: isLoadingProfiles,
  } = useQuery({
    queryKey: ['threads-profiles', debouncedChannelSearch, filterTab, channelPage],
    queryFn: () => {
      if (!token) throw new Error('No token');
      return scraperService.getThreadsProfiles(token, {
        search: debouncedChannelSearch || undefined,
        is_tracked: filterTab === 'tracked' ? true : undefined,
        is_bookmarked: filterTab === 'bookmarked' ? true : undefined,
        page: channelPage,
        limit: PAGE_SIZE_PROFILES,
      });
    },
    enabled: !!token,
  });

  const scrapeMutation = useMutation({
    mutationFn: (uname: string) => {
      if (!token) throw new Error('No token');
      const count = targetMode === 'count' ? (parseInt(targetCount, 10) || 50) : 50;
      const days = targetMode === 'days' ? (parseInt(targetDays, 10) || 7) : undefined;
      return scraperService.scrapeThreadsProfile(token, uname, count, {
        mode: targetMode,
        days,
      });
    },
    onSuccess: (data) => {
      const timeframeLabel = targetMode === 'days' ? `trong ${targetDays || 7} ngày qua` : '';
      toast.success(
        `Đã cào kênh @${data.profile?.username || usernameInput} thành công! (${data.items_returned || 0} bài viết ${timeframeLabel})`.replace('  ', ' '),
      );
      setUsernameInput('');
      queryClient.invalidateQueries({ queryKey: ['threads-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['threads-saved-posts'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Cào kênh Threads thất bại');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: string | number; field: ThreadsToggleField; value: boolean }) => {
      if (!token) throw new Error('No token');
      return scraperService.toggleThreadsProfile(token, id, field, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads-profiles'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Cập nhật trạng thái thất bại');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error('No token');
      return scraperService.deleteExternalChannel(token, 'threads', id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['threads-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['threads-saved-posts'] });
      toast.success(
        data.videos_deleted > 0
          ? `Đã xoá ${data.name} và ${data.videos_deleted.toLocaleString('vi-VN')} bài viết`
          : `Đã xoá ${data.name}`,
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Xoá kênh thất bại');
    },
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; videoCount: number } | null>(null);

  const batchScrapeMutation = useMutation({
    mutationFn: (usernames: string[]) => {
      if (!token) throw new Error('No token');
      const count = targetMode === 'count' ? (parseInt(targetCount, 10) || 50) : 50;
      const days = targetMode === 'days' ? (parseInt(targetDays, 10) || 7) : undefined;
      return scraperService.batchScrapeThreadsProfiles(token, usernames, count, {
        mode: targetMode,
        days,
      });
    },
    onSuccess: (data) => {
      setUsernameInput('');
      toast.success(`Đã cào thành công ${data.succeeded || 0}/${data.total || 0} kênh Threads!`);
      queryClient.invalidateQueries({ queryKey: ['threads-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['threads-saved-posts'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Cào hàng loạt kênh thất bại');
    },
  });

  const handleScrapeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const usernames = parseMultipleUsernames(usernameInput);
    if (usernames.length === 0) {
      toast.error('Vui lòng nhập ít nhất một username hoặc link kênh Threads');
      return;
    }
    if (usernames.length === 1) {
      scrapeMutation.mutate(usernames[0]);
    } else {
      batchScrapeMutation.mutate(usernames);
    }
  };

  const handleDelete = (id: string | number, name: string, videoCount: number) => {
    setDeleteConfirm({ id: Number(id), name, videoCount });
  };

  const handleExploreAuthor = (authorUsername: string) => {
    setActiveMainTab('channels');
    setUsernameInput(authorUsername);
    scrapeMutation.mutate(authorUsername);
  };


  const profiles = profilesData?.items || [];
  const totalProfiles = profilesData?.total || 0;
  const totalPages = profilesData?.total_pages || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-white/10 text-white backdrop-blur">
                <SiThreads className="text-2xl" />
              </span>
              <h1 className="text-xl font-bold tracking-tight">Threads Content Radar</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                TikHub Live
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Tự động quét và kéo các bài viết, video đang <strong>HOT / xu hướng</strong> trên mạng xã hội Threads theo chủ đề, ngách hoặc từ khoá. Hỗ trợ 1-click sao chép kịch bản, tải video và lưu về kho tư liệu để đội sản xuất remake video.
            </p>
          </div>

          {/* Main Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl shrink-0 border border-white/10 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveMainTab('radar')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeMainTab === 'radar'
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Flame size={16} weight={activeMainTab === 'radar' ? 'fill' : 'regular'} />
              <span>Kho Video & Radar ({savedTotalPosts})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('channels')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeMainTab === 'channels'
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Television size={16} weight={activeMainTab === 'channels' ? 'fill' : 'regular'} />
              <span>Kênh theo dõi ({totalProfiles})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: RADAR BÀI HOT & VIDEO ────────────────────────────────────── */}
      {activeMainTab === 'radar' && (
        <div className="flex flex-col gap-6">
          {/* Search Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendUp size={20} className="text-primary font-bold" />
              <h2 className="text-sm font-semibold text-foreground">
                Khám phá nội dung viral trên Threads theo từ khoá
              </h2>
            </div>

            <form onSubmit={handleSearchHotSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo từ khoá (vd: chuyện mua vàng, tâm sự nhẫn cưới, review...) hoặc link Threads..."
                  className="w-full pl-3 pr-8 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Mode Toggle & Value Input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setHotMode('days')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      hotMode === 'days'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CalendarCheck size={14} weight={hotMode === 'days' ? 'bold' : 'regular'} />
                    <span>Theo ngày</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHotMode('count')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      hotMode === 'count'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <VideoCamera size={14} weight={hotMode === 'count' ? 'bold' : 'regular'} />
                    <span>Số bài</span>
                  </button>
                </div>

                <div className="relative w-28 sm:w-32 flex items-center">
                  {hotMode === 'days' ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={hotDays}
                        onChange={(e) => setHotDays(e.target.value)}
                        placeholder="Số ngày"
                        className="w-full py-2 pl-3 pr-16 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                        title="Tự nhập số ngày gần nhất muốn quét"
                      />
                      <span className="absolute right-2.5 text-xs text-slate-400 pointer-events-none select-none">
                        ngày qua
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={hotCount}
                        onChange={(e) => setHotCount(e.target.value)}
                        placeholder="Số bài"
                        className="w-full py-2 pl-3 pr-14 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                        title="Tự nhập số bài muốn quét"
                      />
                      <span className="absolute right-2.5 text-xs text-slate-400 pointer-events-none select-none">
                        bài viết
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={searchHotMutation.isPending || !searchQuery.trim()}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
              >
                {searchHotMutation.isPending ? (
                  <>
                    <CircleNotch size={16} className="animate-spin" />
                    <span>Đang quét...</span>
                  </>
                ) : (
                  <>
                    <Flame size={16} weight="fill" />
                    <span>Quét bài HOT</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Topic Suggestions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
                  <Funnel size={12} />
                  Chủ đề kể chuyện & kịch bản gợi ý:
                </span>
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleSelectTopic(topic)}
                    className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                  >
                    #{topic}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1">
                <span>💡 Mẹo tìm kịch bản: Chọn bộ lọc</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">"Kể chuyện"</span>
                <span>hoặc lọc</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">"Hidden Gem"</span>
                <span>để tìm các bài tâm sự đời sống, câu chuyện vàng bạc ít like làm kịch bản video độc quyền!</span>
              </div>
            </div>
          </div>

          {/* View Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRadarViewMode('saved_repo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  radarViewMode === 'saved_repo'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-foreground'
                }`}
              >
                <Database size={14} weight={radarViewMode === 'saved_repo' ? 'fill' : 'regular'} />
                <span>Kho dữ liệu tổng hợp ({savedTotalPosts})</span>
              </button>

              {rawDiscoveredPosts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRadarViewMode('search_results')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    radarViewMode === 'search_results'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-foreground'
                  }`}
                >
                  <Flame size={14} weight={radarViewMode === 'search_results' ? 'fill' : 'regular'} />
                  <span>Kết quả quét mới ({rawDiscoveredPosts.length})</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>
                {radarViewMode === 'saved_repo'
                  ? 'Kho tổng hợp: Bao gồm toàn bộ video & bài viết cào từ các kênh và tìm kiếm từ khoá'
                  : `Kết quả quét mới theo từ khoá "${searchQuery}" (đã tự động lưu vào kho)`}
              </span>
            </div>
          </div>

          {/* Results Toolbar */}
          {(rawDiscoveredPosts.length > 0 || savedTotalPosts > 0) && (
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3.5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search in saved repo if in saved mode */}
                {radarViewMode === 'saved_repo' && (
                  <div className="relative w-48 sm:w-56">
                    <input
                      type="text"
                      value={savedSearchQuery}
                      onChange={(e) => setSavedSearchQuery(e.target.value)}
                      placeholder="Tìm trong kho đã lưu..."
                      className="w-full pl-7 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <MagnifyingGlass size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    {savedSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSavedSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Language Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setLangFilter('VI')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      langFilter === 'VI'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                    title="Chỉ hiển thị các bài viết tiếng Việt"
                  >
                    <span>🇻🇳 Tiếng Việt ({vnPostsCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLangFilter('ALL')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      langFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                    title="Hiển thị tất cả bài viết khớp từ khoá (bao gồm quốc tế)"
                  >
                    <span>🌐 Toàn cầu ({activeSourcePosts.length})</span>
                  </button>
                </div>

                {/* Media Filter buttons */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    onClick={() => setMediaFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      mediaFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm font-semibold'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    Tất cả ({activeBasePosts.length})
                  </button>
                  <button
                    onClick={() => setMediaFilter('VIDEO')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      mediaFilter === 'VIDEO'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                    }`}
                  >
                    <VideoCamera size={13} weight="fill" />
                    <span>Chỉ Video ({videoPostsCount})</span>
                  </button>
                  <button
                    onClick={() => setMediaFilter('IMAGE')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      mediaFilter === 'IMAGE'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm font-semibold'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    Ảnh ({imagePostsCount})
                  </button>
                  <button
                    onClick={() => setMediaFilter('TEXT')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      mediaFilter === 'TEXT'
                        ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm font-semibold'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    Chỉ chữ ({textPostsCount})
                  </button>
                </div>

                {/* Storytelling Filter Button */}
                <button
                  type="button"
                  onClick={() => setStoryFilter(storyFilter === 'ALL' ? 'STORY_ONLY' : 'ALL')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    storyFilter === 'STORY_ONLY'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-card text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title="Chỉ hiển thị các bài viết kể chuyện / văn bản dài (>50 từ) để lấy kịch bản video"
                >
                  <BookOpen size={13} weight={storyFilter === 'STORY_ONLY' ? 'fill' : 'bold'} />
                  <span>Kể chuyện ({storyPostsCount})</span>
                </button>

                {/* Like Range Filter */}
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <select
                    value={likeRange}
                    onChange={(e) => setLikeRange(e.target.value as any)}
                    className="py-1 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none font-medium"
                    title="Lọc theo mức độ tương tác (Hidden Gem cho bài ít like)"
                  >
                    <option value="ALL">Tất cả like</option>
                    <option value="HIDDEN_GEM">💎 Hidden Gem (&lt; 50 like)</option>
                    <option value="MEDIUM">✨ Tầm trung (50 - 500 like)</option>
                    <option value="VIRAL">🔥 Viral (&gt; 500 like)</option>
                  </select>
                </div>
              </div>

              {/* Sort & Status Badge */}
              <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Sắp xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="py-1 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none"
                  >
                    <option value="likes">Lượt thích cao nhất</option>
                    <option value="views">Lượt xem nhiều nhất</option>
                    <option value="replies">Nhiều bình luận nhất</option>
                    <option value="date">Mới nhất (theo ngày)</option>
                    <option value="length">Dài nhất (nhiều chữ nhất)</option>
                  </select>
                </div>

                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-lg shadow-sm"
                  title="Toàn bộ bài viết và video đều được lưu vĩnh viễn trong database"
                >
                  <Check size={14} weight="bold" />
                  <span>
                    {radarViewMode === 'saved_repo' ? `Kho ${savedTotalPosts} bài` : `Đã lưu ${rawDiscoveredPosts.length} bài`}
                    <span className="opacity-90 ml-1 font-semibold">
                      ({videoPostsCount} video, {storyPostsCount} kể chuyện)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          {searchHotMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-card border border-border rounded-xl">
              <CircleNotch size={40} className="animate-spin mb-3 text-primary" />
              <span className="text-sm font-medium text-foreground">Đang kết nối TikHub Threads API...</span>
              <span className="text-xs text-slate-500 mt-1">Đang quét các bài viết viral và trích xuất chỉ số tương tác</span>
            </div>
          ) : radarViewMode === 'saved_repo' && isLoadingSavedPosts ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-card border border-border rounded-xl">
              <CircleNotch size={36} className="animate-spin mb-3 text-primary" />
              <span className="text-sm font-medium text-foreground">Đang tải kho bài viết và video Threads...</span>
            </div>
          ) : currentPostsToDisplay.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card border border-border rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3">
                <Flame size={28} weight="fill" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {radarViewMode === 'saved_repo'
                  ? 'Kho bài viết & Video Threads chưa có dữ liệu phù hợp'
                  : `Không tìm thấy bài viết nào với từ khoá "${searchQuery}"`}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                {radarViewMode === 'saved_repo'
                  ? 'Hãy nhập từ khoá ở trên để quét bài viết viral đầu tiên, hoặc thêm kênh tác giả ở Tab "Kênh theo dõi" để cào dữ liệu.'
                  : 'Hãy thử tìm kiếm với các từ khoá chung hơn hoặc chọn các chủ đề gợi ý phía trên.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentPostsToDisplay.map((post) => (
                  <ThreadsHotPostCard
                    key={post.post_id || post.id}
                    post={post}
                    onSavePost={(p) => savePostMutation.mutate(p)}
                    isSaving={savePostMutation.isPending}
                    onExploreAuthor={handleExploreAuthor}
                  />
                ))}
              </div>

              {/* Pagination for Saved Repository */}
              {radarViewMode === 'saved_repo' && savedTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-slate-500">
                  <span>
                    Trang {savedPostsPage} / {savedTotalPages} (Tổng {savedTotalPosts} bài viết & video trong kho)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSavedPostsPage((p) => Math.max(1, p - 1))}
                      disabled={savedPostsPage <= 1}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setSavedPostsPage((p) => Math.min(savedTotalPages, p + 1))}
                      disabled={savedPostsPage >= savedTotalPages}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: QUẢN LÝ KÊNH THEO DÕI ────────────────────────────────────── */}
      {activeMainTab === 'channels' && (
        <div className="flex flex-col gap-6">
          {/* Add / Scrape Channel Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <SiThreads className="text-foreground text-xl" />
                <h2 className="text-base font-semibold text-foreground">Thêm & Cào toàn bộ kênh tác giả Threads</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground transition-all cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus size={14} weight="bold" />
                <span>Thêm nhiều kênh</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Nhập username tác giả Threads (ví dụ: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">lilbieber</code> hoặc đường dẫn <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">threads.net/@lilbieber</code>) để cào thông tin kênh và các bài viết mới nhất. Hỗ trợ nhập nhiều kênh cùng lúc (cách nhau bởi dấu phẩy hoặc xuống dòng).
            </p>

            <form onSubmit={handleScrapeSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Nhập 1 hoặc nhiều username/link Threads (cách nhau bởi dấu phẩy hoặc xuống dòng)..."
                  className="w-full pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {usernameInput && (
                  <button
                    type="button"
                    onClick={() => setUsernameInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Mode Toggle & Value Input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setTargetMode('days')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      targetMode === 'days'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CalendarCheck size={14} weight={targetMode === 'days' ? 'bold' : 'regular'} />
                    <span>Theo ngày</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('count')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      targetMode === 'count'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <VideoCamera size={14} weight={targetMode === 'count' ? 'bold' : 'regular'} />
                    <span>Số bài</span>
                  </button>
                </div>

                <div className="relative w-28 sm:w-32 flex items-center">
                  {targetMode === 'days' ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={targetDays}
                        onChange={(e) => setTargetDays(e.target.value)}
                        placeholder="Số ngày"
                        className="w-full py-2 pl-3 pr-16 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                        title="Tự nhập số ngày gần nhất muốn cào"
                      />
                      <span className="absolute right-2.5 text-xs text-slate-400 pointer-events-none select-none">
                        ngày qua
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={targetCount}
                        onChange={(e) => setTargetCount(e.target.value)}
                        placeholder="Số bài"
                        className="w-full py-2 pl-3 pr-14 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                        title="Tự nhập số bài muốn cào"
                      />
                      <span className="absolute right-2.5 text-xs text-slate-400 pointer-events-none select-none">
                        bài viết
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={scrapeMutation.isPending || !usernameInput.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {scrapeMutation.isPending ? (
                  <>
                    <CircleNotch size={16} className="animate-spin" />
                    <span>Đang cào...</span>
                  </>
                ) : (
                  <>
                    <MagnifyingGlassPlus size={16} weight="bold" />
                    <span>Cào kênh</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Filter Tabs & Channels List */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  onClick={() => { setFilterTab('all'); setChannelPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterTab === 'all'
                      ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  Tất cả kênh ({totalProfiles})
                </button>
                <button
                  onClick={() => { setFilterTab('tracked'); setChannelPage(1); }}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterTab === 'tracked'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  <Timer size={12} weight={filterTab === 'tracked' ? 'fill' : 'regular'} />
                  <span>Kênh chú ý</span>
                </button>
                <button
                  onClick={() => { setFilterTab('bookmarked'); setChannelPage(1); }}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterTab === 'bookmarked'
                      ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
                      : 'text-slate-500 hover:text-foreground'
                  }`}
                >
                  <BookmarkSimple size={12} weight={filterTab === 'bookmarked' ? 'fill' : 'regular'} />
                  <span>Đã lưu</span>
                </button>
              </div>

              {/* Search channel in DB + SyncAllChannelsButton */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-60">
                  <input
                    type="text"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    placeholder="Tìm kiếm kênh trong danh sách..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  {channelSearch && (
                    <button
                      onClick={() => setChannelSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <SyncAllChannelsButton
                  platform="threads"
                  channelCount={totalProfiles}
                  onStarted={() => queryClient.invalidateQueries({ queryKey: ['threads-profiles'] })}
                />
              </div>
            </div>

            {/* Content */}
            {isLoadingProfiles ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <CircleNotch size={32} className="animate-spin mb-2" />
                <span className="text-xs">Đang tải danh sách kênh Threads...</span>
              </div>
            ) : profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card border border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Users size={24} />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Chưa có kênh Threads nào</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {debouncedChannelSearch
                    ? `Không tìm thấy kênh phù hợp với từ khoá "${debouncedChannelSearch}".`
                    : 'Nhập username Threads ở trên hoặc bấm "Kênh" từ tab Radar để thêm kênh đầu tiên.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {profiles.map((p) => (
                    <ThreadsProfileCard
                      key={p.id}
                      profile={p}
                      onViewDetail={() => router.push(`/dashboard/externalChannels/threads/${p.id}`)}
                      onScrape={() => scrapeMutation.mutate(p.username)}
                      onToggleTracked={() => toggleMutation.mutate({ id: p.id, field: 'is_tracked', value: !p.is_tracked })}
                      onToggleBookmark={() => toggleMutation.mutate({ id: p.id, field: 'is_bookmarked', value: !p.is_bookmarked })}
                      onDelete={() => handleDelete(p.id, p.name || p.username, p.posts_count || 0)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-slate-500">
                    <span>
                      Trang {channelPage} / {totalPages} (Tổng {totalProfiles} kênh)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setChannelPage((p) => Math.max(1, p - 1))}
                        disabled={channelPage <= 1}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setChannelPage((p) => Math.min(totalPages, p + 1))}
                        disabled={channelPage >= totalPages}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {/* Modal Thêm hàng loạt kênh Threads */}
      <BulkAddThreadsModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['threads-profiles'] })}
      />

      {/* Modal xác nhận xoá kênh Threads (thay thế hoàn toàn native window.confirm) */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title="Xác nhận xoá kênh Threads"
        description={
          deleteConfirm
            ? buildDeleteChannelConfirm({ name: deleteConfirm.name, videoCount: deleteConfirm.videoCount })
            : ''
        }
        confirmText="Xoá vĩnh viễn"
        cancelText="Huỷ"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteMutation.mutate(deleteConfirm.id, {
              onSettled: () => setDeleteConfirm(null),
            });
          }
        }}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
