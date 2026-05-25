'use client';

import Image from "next/image";
import { useState, useEffect, useRef } from 'react';
import { Search, Plus, TrendingUp, Eye, Heart, Users, ArrowRight, X, Loader2, Video, RotateCcw, Instagram as InstagramIcon, MessageCircle, Share2, Link as LinkIcon, BarChart3, Camera, DownloadCloud } from 'lucide-react';
import { ChannelCardSkeletonGrid } from '@/components/channels/ChannelCardSkeleton';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { syncFromLarkAssignmentIfStale } from '@/lib/sync-lark-tracked-channels';
import {
  subscribeGlobalHrSync,
  runGlobalHrSync,
  isGlobalHrSyncBusy,
  waitUntilGlobalHrIdle,
} from '@/lib/global-hr-sync';
import { enrichTrackedChannelApify, enrichStaleChannelsIfNeeded } from '@/lib/enrich-tracked-channel-apify';
import ChannelsPlatformSwitcher from '@/components/channels/ChannelsPlatformSwitcher';

interface ChannelProfile {
  username: string;
  display_name: string;
  avatar_url: string;
  platform: string;
  total_followers?: number;
  following_count?: number;
  posts_count?: number;
  total_likes: number;
  total_views: number;
  total_videos: number;
  engagement: number;
  engagement_rate: number;
  video_count: number;
  description?: string;
  biography?: string;
  is_verified?: boolean;
  is_private?: boolean;
  external_url?: string;
  category?: string;
  id?: string;
}

export default function InstagramChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelProfile[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Add Channel Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [searchChannelQuery, setSearchChannelQuery] = useState('');
  const [loadingChannelId, setLoadingChannelId] = useState<string | null>(null);
  const [hrSyncing, setHrSyncing] = useState(false);
  const [longSyncHint, setLongSyncHint] = useState(false);
  const [globalHrBusy, setGlobalHrBusy] = useState(false);
  // Track only channels NEWLY imported in this session — only these show spinner
  const [newlyImportedUsernames, setNewlyImportedUsernames] = useState<Set<string>>(new Set());
  const bgRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgRefreshZeroRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadInstagramChannels = async (): Promise<ChannelProfile[]> => {
    const token = localStorage.getItem('auth_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${apiUrl}/tracked-channels/my-channels?platform=INSTAGRAM`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401 || !response.ok) return [];
    const data = await response.json();
    let storedPostsCounts: Record<string, number> = {};
    try {
      storedPostsCounts = JSON.parse(localStorage.getItem('instagram_posts_counts') || '{}');
    } catch (e) {
      console.error('Error parsing instagram_posts_counts:', e);
    }
    return (data.channels || []).map((ch: ChannelProfile) => ({
      ...ch,
      posts_count: ch.posts_count || storedPostsCounts[ch.username] || 0,
    }));
  };

  useEffect(() => {
    return subscribeGlobalHrSync((busy) => {
      setGlobalHrBusy(busy);
      if (!busy) {
        loadInstagramChannels().then(setChannels);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingInitial(true);
      try {
        if (isGlobalHrSyncBusy()) {
          setLongSyncHint(true);
          await waitUntilGlobalHrIdle();
          if (cancelled) return;
          setChannels(await loadInstagramChannels());
          setLongSyncHint(false);
          return;
        }

        // BƯỚC 1: Hiện data cũ ngay để user thấy kết quả ngay lập tức
        const existingList = await loadInstagramChannels();
        if (cancelled) return;
        setChannels(existingList);
        setLoadingInitial(false);

        // BƯỚC 2: Sync Lark nền
        const r = await syncFromLarkAssignmentIfStale();
        if (cancelled) return;

        if (r && r.imported > 0) {
          const updatedList = await loadInstagramChannels();
          if (cancelled) return;

          const existingUsernames = new Set(existingList.map((c) => c.username));
          const newUsernames = new Set(
            updatedList
              .filter((c) => !existingUsernames.has(c.username))
              .map((c) => c.username)
          );

          setChannels(updatedList);
          if (newUsernames.size > 0) {
            setNewlyImportedUsernames(newUsernames);
            toast.success(`Đã thêm ${r.imported} kênh từ HR (Lark) — đang lấy số liệu...`, { duration: 5000 });

            let tries = 0;
            const pollNewChannels = async () => {
              if (cancelled || tries >= 20) {
                setNewlyImportedUsernames(new Set());
                return;
              }
              tries++;
              await new Promise((res) => setTimeout(res, 15000));
              if (cancelled) return;
              const latest = await loadInstagramChannels();
              if (!cancelled) setChannels(latest);
              const stillPending = latest.filter(
                (c) => newUsernames.has(c.username) && !c.total_followers && !c.total_likes && !c.total_videos
              );
              if (!cancelled && stillPending.length > 0) {
                bgRefreshRef.current = setTimeout(pollNewChannels, 0);
              } else {
                setNewlyImportedUsernames(new Set());
              }
            };
            pollNewChannels();
          }
        } else {
          // BƯỚC 3: Auto-enrich các kênh cũ nhưng có data bị 0
          // Sử dụng Polling để duy trì spinner nếu chưa lấy xong
          const zeroStatsCh = existingList.filter((c: any) => !c.total_followers && !c.total_likes && !c.total_videos);
          if (zeroStatsCh.length > 0) {
            const historyMapStr = sessionStorage.getItem('auto_0stats_run_map') || '{}';
            let historyMap: Record<string, number> = {};
            try {
              historyMap = JSON.parse(historyMapStr);
            } catch (e) {
              console.error('Error parsing auto_0stats_run_map:', e);
            }
            const now = Date.now();
            
            const toRun: any[] = [];
            const idsToSpin: string[] = [];
            
            zeroStatsCh.forEach((c: any) => {
              const lastRun = historyMap[c.username];
              if (!lastRun || now - lastRun > 5 * 60 * 1000) { 
                toRun.push(c);
                idsToSpin.push(c.username);
                historyMap[c.username] = now;
              } else {
                idsToSpin.push(c.username);
              }
            });

            if (idsToSpin.length > 0) {
              setNewlyImportedUsernames(prev => new Set([...Array.from(prev), ...idsToSpin]));
              sessionStorage.setItem('auto_0stats_run_map', JSON.stringify(historyMap));

              let pollTries = 0;
              let currentSpinIds = [...idsToSpin];
              const pollZeroChannels = async () => {
                if (cancelled || pollTries >= 40) { 
                  setNewlyImportedUsernames(prev => {
                    const ns = new Set(prev);
                    currentSpinIds.forEach(u => ns.delete(u));
                    return ns;
                  });
                  return;
                }
                pollTries++;
                await new Promise((res) => setTimeout(res, 10000));
                if (cancelled) return;
                
                const latest = await loadInstagramChannels();
                if (cancelled) return;
                setChannels(latest);
                
                const stillPending = latest.filter((c: any) => currentSpinIds.includes(c.username) && !c.total_followers && !c.total_likes && !c.total_videos);
                if (stillPending.length < currentSpinIds.length) {
                  const pendingIds = stillPending.map((c: any) => c.username);
                  const finishedIds = currentSpinIds.filter(u => !pendingIds.includes(u));
                  currentSpinIds = pendingIds;
                  
                  setNewlyImportedUsernames(prev => {
                    const ns = new Set(prev);
                    finishedIds.forEach(u => ns.delete(u));
                    return ns;
                  });
                }
                
                if (currentSpinIds.length > 0 && !cancelled) {
                  bgRefreshZeroRef.current = setTimeout(pollZeroChannels, 0) as any;
                }
              };
              pollZeroChannels();
            }

            if (toRun.length > 0 && !cancelled) {
              toast.success(`Hệ thống đang phục hồi lấy số liệu cho ${toRun.length} kênh bị trắng...`, { duration: 5000 });
              toRun.forEach((c: any, idx: number) => {
                setTimeout(() => {
                  if (!cancelled && c.id) enrichTrackedChannelApify(c.id).catch(() => {});
                }, idx * 10000);
              });
            }
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
      if (bgRefreshRef.current) clearTimeout(bgRefreshRef.current);
      if (bgRefreshZeroRef.current) clearTimeout(bgRefreshZeroRef.current);
    };
  }, []);


  const fetchTrackedChannels = async () => {
    try {
      setLoadingInitial(true);
      const list = await loadInstagramChannels();
      setChannels(list);
    } catch (error) {
      console.error('Error fetching tracked channels:', error);
    } finally {
      setLoadingInitial(false);
    }
  };

  const extractInstagramUsername = (input: string): string => {
    let clean = input.trim();
    // Remove @ if present
    clean = clean.replace(/^@+/, '');

    // Remove trailing slash
    if (clean.endsWith('/')) clean = clean.slice(0, -1);

    try {
      if (clean.includes('instagram.com')) {
        const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);

        // Handle /username or /p/postid
        const pathParts = url.pathname.split('/').filter(p => p && p !== 'p' && p !== 'reel');
        if (pathParts.length > 0) {
          return pathParts[0];
        }
      }
    } catch (e) {
      // ignore
    }
    return clean;
  };

  const fetchChannelProfile = async (input: string) => {
    setProcessing(true);
    const username = extractInstagramUsername(input);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

    try {
      // Call Backend to Analyze/Scan Channel
      const response = await fetch(`${apiUrl}/ai/user-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          username: username,
          max_results: 20 // Fetch sample posts for profile info
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Không thể tìm thấy tài khoản Instagram này. Vui lòng kiểm tra lại username.');
        return;
      }

      let payload: any = {};

      // Extract Data for Saving
      const parseNumber = (val: any) => {
        if (!val && val !== 0) return 0;
        if (typeof val === 'number') return val;
        return parseInt(String(val).replace(/[,\.]/g, '')) || 0;
      };
      const pickNumber = (source: any, keys: string[]) => {
        if (!source) return 0;
        for (const key of keys) {
          const value = parseNumber(source[key]);
          if (value > 0) return value;
        }
        return 0;
      };
      const sumMetric = (items: any[] | undefined, keys: string[]) => {
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => {
          const raw = item?.raw_data || {};
          return sum + Math.max(pickNumber(item, keys), pickNumber(raw, keys));
        }, 0);
      };

      if (data.profile) {
        const postsCount = parseNumber(data.profile.posts_count || data.profile.postsCount || data.profile.media_count || 0);
        const resultLikesSum = sumMetric(data.results, ['likes_count', 'like_count', 'likes']);
        const resultViewsSum = sumMetric(data.results, [
          'views_count',
          'video_view_count',
          'view_count',
          'views',
          'play_count',
          'plays',
        ]);

        // Map Instagram profile fields from AI service response
        payload = {
          platform: 'INSTAGRAM',
          username: data.profile.username || username,
          display_name: data.profile.display_name || data.profile.fullName || username,
          avatar_url: data.profile.avatar_url || data.profile.profilePicUrl || '',
          // Stats (now including posts_count!)
          total_followers: pickNumber(data.profile, ['follower_count', 'followersCount', 'followers', 'total_followers']),
          total_likes: pickNumber(data.profile, ['total_likes', 'likes_count', 'like_count', 'likes']) || resultLikesSum,
          total_views: pickNumber(data.profile, [
            'total_views',
            'views_count',
            'video_view_count',
            'view_count',
            'views',
            'play_count',
            'plays',
          ]) || resultViewsSum,
          total_videos: parseNumber(data.profile.total_videos || data.profile.video_count || 0),
          posts_count: postsCount,
          engagement_rate: data.profile.engagement_rate || 0
        };

        // Also keep in localStorage for backward compatibility
        if (postsCount > 0) {
          let storedCounts: Record<string, number> = {};
          try {
            storedCounts = JSON.parse(localStorage.getItem('instagram_posts_counts') || '{}');
          } catch (e) {
            console.error('Error parsing instagram_posts_counts:', e);
          }
          storedCounts[payload.username] = postsCount;
          localStorage.setItem('instagram_posts_counts', JSON.stringify(storedCounts));
          console.log(`💾 Saved posts_count for ${payload.username}: ${postsCount}`);
        }
      } else if (data.results && data.results.length > 0) {
        // Fallback extraction from posts
        const firstPost = data.results[0];
        const postsCount = data.results.length;  // Fallback: count fetched posts

        payload = {
          platform: 'INSTAGRAM',
          username: username,
          display_name: firstPost.author_name || username,
          avatar_url: firstPost.author_avatar || firstPost.thumbnail_url || '',
          total_followers: 0, // Will be updated on refresh
          total_likes: sumMetric(data.results, ['likes_count', 'like_count', 'likes']),
          total_views: sumMetric(data.results, [
            'views_count',
            'video_view_count',
            'view_count',
            'views',
            'play_count',
            'plays',
          ]),
          total_videos: data.results.filter((p: any) => p.content_type === 'reel').length,
          posts_count: postsCount,
          engagement_rate: 0
        };

        // Also keep in localStorage for backward compatibility
        if (postsCount > 0) {
          let storedCounts: Record<string, number> = {};
          try {
            storedCounts = JSON.parse(localStorage.getItem('instagram_posts_counts') || '{}');
          } catch (e) {
            console.error('Error parsing instagram_posts_counts:', e);
          }
          storedCounts[username] = postsCount;
          localStorage.setItem('instagram_posts_counts', JSON.stringify(storedCounts));
          console.log(`💾 Fallback saved posts_count for ${username}: ${postsCount}`);
        }
      } else {
        toast.error('Tìm thấy tài khoản nhưng không có bài viết công khai nào để phân tích.');
        return;
      }

      console.log('[DEBUG] AI Response Profile:', data.profile);
      console.log('[DEBUG] Saving Payload:', payload);

      // Save to Database
      const token = localStorage.getItem('auth_token');
      const saveResponse = await fetch(`${apiUrl}/tracked-channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (saveResponse.ok) {
        // Fetch updated channels (posts_count already saved above)
        await fetchTrackedChannels();

        setShowAddModal(false);
        setUsernameInput('');
      } else {
        const errorData = await saveResponse.json();
        toast.error(errorData.message || 'Lỗi khi lưu kênh vào hệ thống.');
      }
    } catch (error) {
      console.error('Error processing channel:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddChannel = () => {
    if (!usernameInput.trim()) return;
    fetchChannelProfile(usernameInput);
  };

  const handleRefreshChannel = async (channel: ChannelProfile) => {
    setRefreshingIds(prev => new Set(prev).add(channel.username));
    try {
      if (channel.id) {
        const r = await enrichTrackedChannelApify(channel.id);
        await fetchTrackedChannels();
        if (!r.success) toast.error(r.message || 'Không làm mới số liệu (Apify)');
      } else {
        await fetchChannelProfile(channel.username);
      }
    } catch {
      toast.error('Làm mới thất bại');
    } finally {
      setRefreshingIds(prev => {
        const n = new Set(prev);
        n.delete(channel.username);
        return n;
      });
    }
  };

  const formatNumber = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const filteredChannels = channels.filter(c =>
    c.username.toLowerCase().includes(searchChannelQuery.toLowerCase()) ||
    (c.display_name && c.display_name.toLowerCase().includes(searchChannelQuery.toLowerCase()))
  );

  // Proxy avatar để tránh CORS/CORP khi load trực tiếp từ Instagram CDN
  const getAvatarUrl = (channel: ChannelProfile) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name)}&background=E1306C&color=fff`;
    if (!channel.avatar_url) return fallback;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    if (channel.avatar_url.includes('cdninstagram.com') || channel.avatar_url.includes('instagram.com') || channel.avatar_url.includes('fbcdn.net')) {
      return `${apiUrl}/ai/proxy/avatar?url=${encodeURIComponent(channel.avatar_url)}`;
    }
    return channel.avatar_url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 pb-20 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-200">
                <InstagramIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Instagram Analytics</h1>
                <p className="text-sm text-slate-500">Quản lý tài khoản Instagram</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={hrSyncing || loadingInitial || globalHrBusy}
                onClick={async () => {
                  setHrSyncing(true);
                  setLongSyncHint(true);
                  try {
                    const r = await runGlobalHrSync('INSTAGRAM', loadInstagramChannels);
                    setChannels(await loadInstagramChannels());
                    if (r.imported > 0) {
                      toast.success(
                        `Đồng bộ ${r.imported} kênh (ưu tiên Instagram) — Apify đã cập nhật`,
                        { duration: 5000 },
                      );
                    } else toast.success('Đã kiểm tra — không có kênh mới từ HR');
                  } catch (e: any) {
                    toast.error(e?.message || 'Đồng bộ HR thất bại');
                  } finally {
                    setLongSyncHint(false);
                    setHrSyncing(false);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-md disabled:opacity-60"
                title="Kênh được phân công trên Lark"
              >
                {hrSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />}
                <span className="hidden sm:inline">Đồng bộ HR</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-pink-600/30 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Thêm Kênh Mới</span>
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <ChannelsPlatformSwitcher />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-7xl pt-8">

        {/* Long sync hint banner */}
        {longSyncHint && (
          <div className="flex items-center gap-3 mb-6 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-amber-600" />
            <span>Đang đồng bộ dữ liệu từ HR (Lark) — có thể mất vài phút, vui lòng chờ...</span>
          </div>
        )}

        {/* Skeleton cards khi chưa có kênh nào */}
        {loadingInitial && channels.length === 0 && (
          <ChannelCardSkeletonGrid count={8} />
        )}

        {/* Empty State */}
        {!loadingInitial && channels.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-pink-200 m-4"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6 ring-8 ring-pink-50/50">
              <InstagramIcon className="w-12 h-12 text-pink-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Chưa có kênh nào</h3>
            <p className="text-slate-500 mb-8 max-w-md text-center">
              Hãy thêm tài khoản Instagram đầu tiên của bạn để bắt đầu theo dõi và phân tích posts & reels.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl shadow-xl shadow-pink-600/30 hover:from-purple-700 hover:to-pink-700 transition-all hover:-translate-y-1"
            >
              <Plus className="w-6 h-6" />
              <span>Thêm Kênh Ngay</span>
            </button>
          </motion.div>
        )}

        {/* Channels Grid */}
        {channels.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="bg-white rounded-2xl p-5 mb-8 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-pink-600" />
                <span className="text-lg font-bold text-slate-800">{channels.length}</span>
                <span className="text-slate-500 font-medium">Kênh đang theo dõi</span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm kênh..."
                  value={searchChannelQuery}
                  onChange={(e) => setSearchChannelQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 w-64 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id || channel.username}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col h-full"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshChannel(channel);
                      }}
                      disabled={refreshingIds.has(channel.username) || processing}
                      className="bg-white/90 p-2 rounded-lg text-pink-600 shadow-sm border border-pink-100 hover:bg-pink-50 transition-colors"
                      title="Làm mới dữ liệu"
                    >
                      <RotateCcw className={`w-4 h-4 ${refreshingIds.has(channel.username) ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="relative flex-shrink-0">
                      <Image
                        src={getAvatarUrl(channel)}
                        alt={channel.display_name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full object-cover border-2 border-pink-100 shadow-md ring-2 ring-pink-50"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name)}&background=E1306C&color=fff`;
                        }}
                       width={0} height={0} sizes="100vw" unoptimized/>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border-2 border-white text-white shadow-sm">
                        <InstagramIcon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold text-slate-900 truncate text-lg flex items-center gap-2" title={channel.display_name}>
                        {channel.display_name}
                        {channel.is_verified && (
                          <span className="text-blue-500 flex-shrink-0" title="Verified">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-500 truncate font-medium flex items-center gap-1">
                        @{channel.username}
                      </p>

                    </div>
                  </div>

                  {/* Stats Wrapper — hiển thị spinner khi mới import, đang refresh, hoặc chưa có số liệu */}
                  <div className="relative mt-auto flex-1 flex flex-col justify-end min-h-[100px] mb-4">
                    {(newlyImportedUsernames.has(channel.username) || refreshingIds.has(channel.username)) && (
                      <div className="absolute inset-[-8px] bg-white/60 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center border border-slate-100/50">
                        <Loader2 className="w-6 h-6 text-pink-500 animate-spin mb-1.5" />
                        <span className="text-[10px] font-bold text-pink-700 uppercase tracking-widest bg-white/90 px-3 py-1 rounded-full shadow-sm border border-pink-100">Đang lấy số liệu...</span>
                      </div>
                    )}
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-3 border border-purple-100">
                        <span className="text-xs text-purple-600 font-bold uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Followers</span>
                        <span className="text-purple-900 font-black text-lg block">
                          {formatNumber(channel.total_followers || 0)}
                        </span>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-3 border border-blue-100">
                        <span className="text-xs text-blue-600 font-bold uppercase mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Posts</span>
                        <span className="text-blue-900 font-black text-lg block">
                          {formatNumber(channel.posts_count || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Engagement Badge */}
                    {channel.engagement_rate > 0 && (
                      <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-700 font-bold uppercase">Engagement</span>
                          <span className="text-green-900 font-black text-base">{channel.engagement_rate.toFixed(2)}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => {
                      setLoadingChannelId(channel.username);
                      router.push(`/dashboard/instagram/analytics/${channel.username}?days=3`);
                    }}
                    disabled={loadingChannelId === channel.username}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-pink-600/20 disabled:opacity-80"
                  >
                    {loadingChannelId === channel.username ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tải...</span>
                      </>
                    ) : (
                      <>
                        <span>Xem Chi Tiết</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Channel Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !processing && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-pink-600">
                      <Plus className="w-5 h-5" />
                    </div>
                    Thêm Kênh Instagram
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Theo dõi tài khoản Instagram mới</p>
                </div>
                <button
                  onClick={() => !processing && setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8">
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Username Instagram
                </label>
                <div className="relative mb-6">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <InstagramIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
                    placeholder="Ví dụ: cristiano hoặc @cristiano"
                    disabled={processing}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-500 focus:bg-white transition-all font-medium text-lg placeholder:text-slate-400"
                  />
                  {usernameInput && (
                    <button
                      onClick={() => setUsernameInput('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 mb-6">
                  <h4 className="text-sm font-extrabold text-black mb-2 flex items-center gap-2">
                    <InstagramIcon className="w-4 h-4 text-purple-600" /> Hỗ trợ các định dạng:
                  </h4>
                  <ul className="text-sm font-semibold text-black space-y-1.5 pl-1">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-600" /> Username (vd: cristiano)</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-600" /> Với @ (vd: @cristiano)</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-600" /> Link profile (instagram.com/cristiano)</li>
                  </ul>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-4">
                  <h4 className="text-sm font-extrabold text-black mb-2 flex items-center gap-2">
                    ✅ Dữ liệu hỗ trợ đầy đủ
                  </h4>
                  <ul className="text-sm font-semibold text-black space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2" />
                      <span><strong className="font-extrabold text-black">Profile Info</strong> (Followers, Posts count, Bio)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2" />
                      <span><strong className="font-extrabold text-black">Posts & Reels</strong> (Likes, Comments, Views)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2" />
                      <span><strong className="font-extrabold text-black">Engagement Metrics</strong> (Tỷ lệ tương tác)</span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    disabled={processing}
                    className="flex-1 py-4 border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleAddChannel}
                    disabled={processing || !usernameInput.trim()}
                    className="flex-[2] py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all shadow-xl shadow-pink-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Đang Quét & Thêm...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Thêm Kênh Này</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
