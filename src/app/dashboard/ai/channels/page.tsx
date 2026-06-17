'use client';

import Image from "next/image";
import { useState, useEffect, useRef } from 'react';
import { Search, Plus, TrendingUp, Eye, Heart, Users, ArrowRight, X, Loader, Loader2, Video, RotateCcw, DownloadCloud } from 'lucide-react';
import { ChannelCardSkeletonGrid } from '@/components/channels/ChannelCardSkeleton';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/api-client';
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
  total_likes: number;
  total_views: number;
  total_videos: number;
  engagement: number;
  engagement_rate: number;
  video_count: number;
  description?: string;
  id?: string;
}

export default function TrackedChannelsPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState('tiktok');
  const [channels, setChannels] = useState<ChannelProfile[]>([]);

  // Add Channel Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [searchChannelQuery, setSearchChannelQuery] = useState('');
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [hrSyncing, setHrSyncing] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [longSyncHint, setLongSyncHint] = useState(false);
  const [globalHrBusy, setGlobalHrBusy] = useState(false);
  // Track only channels that were NEWLY imported in this session — only these show Apify loading spinner
  const [newlyImportedUsernames, setNewlyImportedUsernames] = useState<Set<string>>(new Set());
  const bgRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadPlatformChannels = async (): Promise<ChannelProfile[]> => {
    try {
      const response = await apiClient.get(`/tracked-channels?platform=${platform.toUpperCase()}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    return subscribeGlobalHrSync((busy) => {
      setGlobalHrBusy(busy);
      if (!busy) {
        loadPlatformChannels().then(setChannels);
      }
    });
  }, [platform]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        if (isGlobalHrSyncBusy()) {
          setLongSyncHint(true);
          await waitUntilGlobalHrIdle();
          if (cancelled) return;
          setChannels(await loadPlatformChannels());
          setLongSyncHint(false);
          return;
        }

        // BƯỚC 1: Hiện data cũ ngay lập tức
        const existingList = await loadPlatformChannels();
        if (cancelled) return;
        setChannels(existingList);
        setListLoading(false); // Xong — bỏ spinner toàn trang

        // BƯỚC 2: Sync Lark nền (chỉ khi cooldown cho phép)
        const r = await syncFromLarkAssignmentIfStale();
        if (cancelled) return;

        if (r && r.imported > 0) {
          const updatedList = await loadPlatformChannels();
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
              const latest = await loadPlatformChannels();
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
          // Auto-enrich các kênh cũ chưa có data (cooldown 30 phút)
          const staleResult = await enrichStaleChannelsIfNeeded();
          if (!cancelled && staleResult && staleResult.enriched > 0) {
            const fresh = await loadPlatformChannels();
            if (!cancelled) {
              setChannels(fresh);
              toast.success(`Đã cập nhật số liệu ${staleResult.enriched} kênh`, { duration: 3000 });
            }
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (bgRefreshRef.current) clearTimeout(bgRefreshRef.current);
    };
  }, [platform]);

  const fetchTrackedChannels = async () => {
    try {
      const list = await loadPlatformChannels();
      setChannels(list);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error('Error fetching tracked channels:', error);
      }
    }
  };

  const fetchChannelProfile = async (username: string) => {
    setLoading(true);
    try {
      // Optimize fetch strategy per platform:
      // - Instagram: 0 posts (profile only, very fast ~2s)
      // - TikTok: 1 post (minimum to get authorMeta with all stats, very fast ~3-5s)
      // - Facebook: 30 posts (enough for stats, fast ~5-10s)
      let maxResults = 1; // Default: Minimal fetch

      if (platform.toLowerCase() === 'instagram') {
        maxResults = 0; // Profile only
      } else if (platform.toLowerCase() === 'facebook') {
        maxResults = 30; // Quick sample for stats
      } else if (platform.toLowerCase() === 'tiktok') {
        maxResults = 1; // Minimal fetch (authorMeta has all stats)
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${baseUrl}/ai/user-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platform.toLowerCase(),
          username: username.replace('@', ''),
          max_results: maxResults
        })
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('API quota exceeded. Please try again later.');
          return;
        }
        toast.error(data.error || 'API Error. Please try again.');
        return;
      }

      let payload: any = {};

      // 1. DATA FROM BACKEND PROFILE (Preferred)
      if (data.profile) {
        console.log('✅ Using Backend Profile Data:', data.profile);
        payload = {
          platform: platform.toUpperCase(),
          username: data.profile.username,
          display_name: data.profile.display_name,
          avatar_url: data.profile.avatar_url,
          total_followers: data.profile.follower_count,
          total_likes: data.profile.total_likes,
          // FIX: If we fetched 0 videos, force total_videos to 0 regardless of metadata
          total_videos: (data.results && data.results.length === 0) ? 0 : (data.profile.total_videos || 0),
          // Calculate specific stats if missing
          total_views: data.profile.total_views || data.results?.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0) || 0,
          engagement_rate: data.profile.engagement_rate || 0
        };
        console.log('✅ Payload prepared with forced check:', payload);
      }
      // 2. FALLBACK: RAW EXTRACTION (If profile missing but results exist)
      else if (data.success && data.results && data.results.length > 0) {
        console.log('⚠️ Profile missing, extracting from first video...');
        const firstVideo = data.results[0];
        const authorMeta = firstVideo.raw_data?.authorMeta || {};

        // Use author-level stats from authorMeta
        const totalFollowers = authorMeta.fans || 0;
        const totalLikes = authorMeta.heart || 0;
        const totalVideos = data.results.length === 0 ? 0 : (authorMeta.video || data.results.length);

        // Sum views from fetched videos (no total_views in authorMeta)
        const totalViews = data.results.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0);

        // Calculate engagement rate
        const engagementRate = totalFollowers > 0
          ? (totalLikes / totalFollowers) * 100
          : 0;

        payload = {
          platform: platform.toUpperCase(),
          username: username.replace('@', ''),
          display_name: authorMeta.nickName || firstVideo.author_name || username,
          avatar_url: authorMeta.avatar || firstVideo.thumbnail_url,
          total_followers: totalFollowers,
          total_likes: totalLikes,
          total_views: totalViews,
          total_videos: totalVideos,
          engagement_rate: parseFloat(engagementRate.toFixed(2))
        };
      } else {
        toast.error(data.error || 'Channel not found or no data available. Please check the username.');
        setLoading(false);
        return;
      }

      // Save to Backend using apiClient (automatically adds Authorization header)
      console.log('💾 Saving Channel Payload:', payload);
      try {
        const saveResponse = await apiClient.post('/tracked-channels', payload);

        if (saveResponse.data) {
          await fetchTrackedChannels();
          setShowAddModal(false);
          setUsernameInput('');
        }
      } catch (saveError: any) {
        // apiClient interceptor handles 401 automatically (redirects to login)
        if (saveError.response?.status === 401) {
          console.error('Unauthorized: Failed to save channel. Token might be invalid.');
          toast.error('Session expired or unauthorized. Please log in again.');
        } else {
          const errorMessage = saveError.response?.data?.message || 'Failed to save channel';
          toast.error(errorMessage);
        }
        return;
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again later.';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = () => {
    if (!usernameInput.trim()) return;

    let input = usernameInput.trim();
    let username = input;

    // Basic URL extraction for better UX
    if (input.includes('tiktok.com/') || input.includes('instagram.com/')) {
      try {
        const urlObj = new URL(input.startsWith('http') ? input : `https://${input}`);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart) {
          username = lastPart.startsWith('@') ? lastPart.substring(1) : lastPart;
        }
      } catch (e) {
        console.error('URL parse error:', e);
      }
    }

    // Ensure we send with @ for the profile fetcher (which then strips it)
    if (!username.startsWith('@')) {
      username = '@' + username;
    }

    fetchChannelProfile(username);
  };

  const handleRefreshChannel = async (channel: ChannelProfile) => {
    setRefreshingIds((prev) => new Set(prev).add(channel.username));
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
      setRefreshingIds((prev) => {
        const n = new Set(prev);
        n.delete(channel.username);
        return n;
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(3) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(3) + 'K';
    return num.toString();
  };

  // Helper to get proxied avatar URL for Instagram & TikTok (bypass CORS/expiry)
  const getAvatarUrl = (channel: ChannelProfile) => {
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name)}&background=random&color=fff`;

    if (!channel.avatar_url) {
      console.log(`⚠️ No avatar_url for ${channel.username}, using fallback`);
      return fallbackUrl;
    }

    const proxyBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

    // Proxy Instagram CDN URLs
    if (channel.platform?.toUpperCase() === 'INSTAGRAM' &&
      (channel.avatar_url.includes('cdninstagram.com') || channel.avatar_url.includes('instagram.com'))) {
      const proxiedUrl = `${proxyBaseUrl}/ai/proxy/avatar?url=${encodeURIComponent(channel.avatar_url)}`;
      console.log(`🔄 Proxying Instagram avatar for ${channel.username}:`, proxiedUrl);
      return proxiedUrl;
    }

    // Proxy TikTok CDN URLs (they have CORS restrictions and signed URLs with expiry)
    if (channel.platform?.toUpperCase() === 'TIKTOK' &&
      (channel.avatar_url.includes('tiktokcdn.com') || channel.avatar_url.includes('tiktok.com'))) {
      const proxiedUrl = `${proxyBaseUrl}/ai/proxy/avatar?url=${encodeURIComponent(channel.avatar_url)}`;
      console.log(`🔄 Proxying TikTok avatar for ${channel.username}:`, proxiedUrl);
      return proxiedUrl;
    }

    console.log(`✅ Using direct avatar URL for ${channel.username}:`, channel.avatar_url);
    return channel.avatar_url;
  };

  const platformName = platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : platform;

  const filteredChannels = channels.filter(c =>
    c.username.toLowerCase().includes(searchChannelQuery.toLowerCase()) ||
    (c.display_name && c.display_name.toLowerCase().includes(searchChannelQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 max-w-7xl py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-2xl">
                🎵
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{platformName} Analytics</h1>
                <p className="text-slate-500">Monitor and track your {platformName} channel performance</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={hrSyncing || listLoading || globalHrBusy}
                onClick={async () => {
                  setHrSyncing(true);
                  setLongSyncHint(true);
                  try {
                    const prio = platform.toUpperCase();
                    const r = await runGlobalHrSync(prio, loadPlatformChannels);
                    setChannels(await loadPlatformChannels());
                    if (r.imported > 0) {
                      toast.success(
                        `Đồng bộ ${r.imported} kênh (ưu tiên ${platformName}) — Apify đã cập nhật`,
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
                className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all shadow-md disabled:opacity-60"
                title="Kênh được phân công trên Lark"
              >
                {hrSyncing ? <Loader className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />}
                Đồng bộ HR
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-black hover:bg-slate-800 text-white rounded-lg font-semibold transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Channel
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
        {/* Skeleton cards khi chưa có kênh nào */}
        {listLoading && channels.length === 0 && (
          <ChannelCardSkeletonGrid count={8} />
        )}
        {(!listLoading || channels.length > 0) && (
          <>
        {/* Stats Bar */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-indigo-600" />
                <span className="text-2xl font-bold text-slate-900">{channels.length}</span>
                <span className="text-slate-500">Channel{channels.length !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-sm text-slate-400">Total tracking accounts</p>
            </div>

            {/* Search Channels */}
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search your channels..."
                value={searchChannelQuery}
                onChange={(e) => setSearchChannelQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Channels Grid */}
        {filteredChannels.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No channels yet</h3>
            <p className="text-slate-500 mb-6">Click "+ Add Channel" to start tracking your first channel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredChannels.map((channel, idx) => (
              <motion.div
                key={`${channel.username}-${channel.platform}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
              >
                {/* Header: Avatar & Name */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative">
                    <Image
                      src={getAvatarUrl(channel)}
                      alt={channel.display_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                      onError={(e) => {
                        // Fallback if the proxied avatar also fails
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name)}&background=random&color=fff`;
                      }}
                     width={0} height={0} sizes="100vw" unoptimized/>
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-black rounded-full flex items-center justify-center text-[10px] border-2 border-white">
                      🎵
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 truncate text-sm">{channel.display_name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 truncate">@{channel.username}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRefreshChannel(channel);
                    }}
                    disabled={refreshingIds.has(channel.username) || loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${refreshingIds.has(channel.username) ? 'animate-spin' : ''}`} />
                    {refreshingIds.has(channel.username) ? 'Updating...' : 'Update'}
                  </button>
                </div>

                {/* Stats Wrapper — hiển thị spinner khi mới import, đang refresh, hoặc chưa có số liệu */}
                <div className="relative mt-auto flex-1 flex flex-col justify-end min-h-[100px] mb-5">
                  {(newlyImportedUsernames.has(channel.username) || refreshingIds.has(channel.username) || (!channel.total_followers && !channel.total_likes && !channel.total_videos)) && (
                    <div className="absolute inset-[-8px] bg-white/60 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center border border-slate-100/50">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-1.5" />
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest bg-white/90 px-3 py-1 rounded-full shadow-sm border border-indigo-200">Đang lấy số liệu...</span>
                    </div>
                  )}
                  {/* Followers Section with Chart */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                          <Users className="w-3.5 h-3.5" />
                          <span className="uppercase font-semibold">FOLLOWERS</span>
                        </div>
                        <p
                          className="text-2xl font-bold text-slate-900 cursor-help"
                          title="Followers count"
                        >
                          {formatNumber(channel.total_followers || 0)}
                        </p>
                      </div>
                      <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-semibold">
                        Live
                      </div>
                    </div>

                    {/* Simple Line Chart (Visual placeholder since we only have one data point for history currently) */}
                    <div className="h-16 relative">
                      <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`gradient-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0,35 L 40,32 L 80,28 L 120,25 L 160,20 L 200,15"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                        />
                        <path
                          d="M 0,35 L 40,32 L 80,28 L 120,25 L 160,20 L 200,15 L 200,40 L 0,40 Z"
                          fill={`url(#gradient-${idx})`}
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Video className="w-3.5 h-3.5 text-purple-500" />
                        <span className="uppercase font-medium text-slate-400">VIDEOS</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{channel.total_videos?.toLocaleString() || 0}</p>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Heart className="w-3.5 h-3.5 text-red-500" />
                        <span className="uppercase font-medium text-slate-400">LIKES</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">
                        {formatNumber(typeof channel.total_likes === 'string' ? parseInt(channel.total_likes) : channel.total_likes || 0)}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Eye className="w-3.5 h-3.5 text-teal-500" />
                        <span className="uppercase font-medium text-slate-400">TOTAL VIEWS</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{formatNumber(channel.total_views || 0)}</p>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                        <span className="uppercase font-medium text-slate-400">ENG. RATE</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">
                        {channel.engagement_rate?.toFixed(2) || '0.00'}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* View Dashboard Button */}
                <button
                  onClick={() => {
                    setNavigatingTo(channel.username);
                    sessionStorage.setItem('analytics_from_channels', '1');
                    router.push(`/dashboard/ai/analytics/${channel.username}?platform=${channel.platform}`);
                  }}
                  onMouseEnter={() => router.prefetch(`/dashboard/ai/analytics/${channel.username}?platform=${channel.platform}`)}
                  disabled={!!navigatingTo}
                  className="w-full py-3 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-wait"
                >
                  {navigatingTo === channel.username ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      View Dashboard
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !loading && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Add New Channel</h2>
                <button
                  onClick={() => !loading && setShowAddModal(false)}
                  disabled={loading}
                  className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  {platformName} Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddChannel()}
                    placeholder="username or profile URL"
                    disabled={loading}
                    className="w-full pl-8 pr-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Enter the username or paste the full profile URL
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-900 font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddChannel}
                  disabled={loading || !usernameInput.trim()}
                  className="flex-1 py-3 bg-black hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Channel
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
