"use client";

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
          alert('API quota exceeded. Please try again later.');
          return;
        }
        alert(data.error || 'API Error. Please try again.');
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
        alert(data.error || 'Channel not found or no data available. Please check the username.');
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
          alert('Session expired or unauthorized. Please log in again.');
        } else {
          const errorMessage = saveError.response?.data?.message || 'Failed to save channel';
          alert(errorMessage);
        }
        return;
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again later.';
      alert(`Error: ${errorMessage}`);
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
        <div className="min-h-screen bg-gray-50 p-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kênh Viễn Chí Bảo</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Thống kê tháng <span className="font-semibold text-violet-600">{month}/{year}</span>
                    </p>
                </div>
                <button onClick={() => { loadChannels(); loadStats(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium shadow-sm transition-all hover:shadow">
                    <RefreshCw size={14} className={isLoading ? "animate-spin text-violet-500" : ""}/>
                    Làm mới
                </button>
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
        </div >
      </div >

    {/* Content */ }
    < div className = "container mx-auto px-4 max-w-7xl pt-8" >
      {/* Skeleton cards khi chưa có kênh nào */ }
  {
    listLoading && channels.length === 0 && (
      <ChannelCardSkeletonGrid count={8} />
    )
  }
  {
    (!listLoading || channels.length > 0) && (
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

            {/* ── Traffic KPIs ── */}
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
                    <div className="h-8 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>

                {/* Stats Wrapper — hiển thị spinner khi mới import, đang refresh, hoặc chưa có số liệu */}
            <div className="relative mt-auto flex-1 flex flex-col justify-end min-h-[100px] mb-5">
              {(newlyImportedUsernames.has(channel.username) || refreshingIds.has(channel.username) || (!channel.total_followers && !channel.total_likes && !channel.total_videos)) && (
                <div className="absolute inset-[-8px] bg-white/60 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center border border-slate-100/50">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-1.5" />
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest bg-white/90 px-3 py-1 rounded-full shadow-sm border border-indigo-200">Đang lấy số liệu...</span>
                </div>

                    {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <SectionTitle>Views theo nền tảng</SectionTitle>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byPlatform} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="views" radius={[6, 6, 0, 0]}>
                        {byPlatform.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <SectionTitle>Views theo team (top 8)</SectionTitle>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byTeam} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                      <YAxis type="category" dataKey="team" tick={{ fill: "#374151", fontSize: 10 }} width={70} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="views" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top 10 videos */}
              {(stats?.top_views || []).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
                  <SectionTitle>Top 10 video Views cao nhất — tháng {month}/{year}</SectionTitle>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {["#", "Tên video", "Kênh", "Team", "Views", "Likes", "Cmt", "Ngày đăng"].map(h =>
                            <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(stats?.top_views || []).map((v: any, i: number) => (
                          <tr key={i} className={`border-b border-gray-100 hover:bg-violet-50/30 transition-colors ${i % 2 === 0 ? "bg-gray-50/50" : ""}`}>
                            <td className="py-2.5 px-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                            <td className="py-2.5 px-3 max-w-[200px]">
                              {v.video_url
                                ? <a href={v.video_url} target="_blank" className="text-gray-800 hover:text-violet-600 flex items-center gap-1 font-medium truncate">
                                  <span className="truncate">{v.title || "(no title)"}</span>
                                  <ExternalLink size={10} className="shrink-0 opacity-50" />
                                </a>
                                : <span className="text-gray-700 font-medium truncate block">{v.title || "(no title)"}</span>
                              }
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap text-xs">{v.channel_name}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-md font-medium">{v.team || "—"}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-violet-700 font-bold text-sm">{fmt(v.views)}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-pink-600 font-semibold">{fmt(v.likes)}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-blue-600 font-semibold">{fmt(v.comments)}</span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">{(v.published_at || "").slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
            ) : (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 mb-6 text-center">
              <Video size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Chưa có dữ liệu traffic tháng {month}/{year}</p>
              <p className="text-gray-400 text-xs mt-1">Chạy script crawl để có dữ liệu</p>
            </div>
            )}

            {/* ── Channel summary KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Tổng kênh", value: fmt(filtered.length), color: "#7c3aed", icon: <Globe size={16} /> },
                { label: "Facebook", value: fmt(channels.filter(c => (c.platform || "").toLowerCase().includes("facebook")).length), color: "#1877f2", icon: <Facebook size={16} /> },
                { label: "TikTok", value: fmt(channels.filter(c => (c.platform || "").toLowerCase().includes("tiktok")).length), color: "#111827", icon: <TikTokIcon /> },
                { label: "YouTube", value: fmt(channels.filter(c => (c.platform || "").toLowerCase().includes("youtube")).length), color: "#dc2626", icon: <Youtube size={16} /> },
              ].map((k, i) => <KpiCard key={i} icon={k.icon} label={k.label} value={k.value} color={k.color} />)}
            </div>

            {/* ── Channel charts ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <SectionTitle>Số kênh theo nền tảng</SectionTitle>
                {loading ? (
                  <div className="h-44 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-violet-400" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={platformStats} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {platformStats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <SectionTitle>Phân bổ kênh theo nền tảng</SectionTitle>
                {loading ? (
                  <div className="h-44 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-violet-400" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={platformStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={25}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={true}>
                        {platformStats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Channel list ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Danh sách kênh ({filtered.length})</SectionTitle>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm kênh..."
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-48 transition-all" />
              </div>

              {loading ? (
                <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Không tìm thấy kênh nào</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {["Tên kênh", "Nền tảng", "Owner", "Team"].map(h =>
                          <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 100).map((ch, i) => {
                        const p = (ch.platform || "").toLowerCase();
                        const cfg = Object.entries(PLATFORM_CONFIG).find(([k]) => k !== 'all' && p.includes(k))?.[1] ?? PLATFORM_CONFIG.all;
                        return (
                          <tr key={i} className={`border-b border-gray-100 hover:bg-violet-50/30 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                            <td className="py-3 px-3 font-medium text-gray-800">{(ch.display_name || "").trim() || "—"}</td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${cfg.light} ${cfg.text}`}>
                                {cfg.icon}<span>{ch.platform}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-600">{ch.owner_name || "—"}</td>
                            <td className="py-3 px-3">
                              {ch.team
                                ? <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-1 rounded-md font-medium">{ch.team}</span>
                                : <span className="text-xs text-gray-400">—</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length > 100 && (
                    <p className="text-center text-xs text-gray-400 mt-4 py-2 border-t border-gray-100">
                      Hiển thị 100 / {filtered.length} kênh
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          );
}
