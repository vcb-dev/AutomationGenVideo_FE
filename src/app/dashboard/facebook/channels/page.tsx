'use client';
// Force rebuild for UI update

import Image from "next/image";
import { useState, useEffect, useRef } from 'react';
import { Search, Plus, TrendingUp, Eye, Heart, Users, ArrowRight, X, Loader2, Video, RotateCcw, Facebook, ThumbsUp, MessageCircle, Share2, Link as LinkIcon, BarChart3, DownloadCloud } from 'lucide-react';
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
  total_likes: number;
  total_views: number;
  total_videos: number;
  total_posts?: number;
  engagement: number;
  engagement_rate: number;
  video_count: number;
  description?: string;
  id?: string;
}

export default function FacebookChannelsPage() {
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
  // Track only channels that were NEWLY imported in this session — only these show Apify loading spinner
  const [newlyImportedUsernames, setNewlyImportedUsernames] = useState<Set<string>>(new Set());
  const bgRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadFacebookChannels = async (): Promise<ChannelProfile[]> => {
    const token = localStorage.getItem('auth_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const apiUrl = baseUrl.replace(/\/$/, '');
    const response = await fetch(`${apiUrl}/tracked-channels/my-channels?platform=FACEBOOK`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401 || !response.ok) return [];
    const data = await response.json();
    return data.channels || [];
  };

  useEffect(() => {
    return subscribeGlobalHrSync((busy) => {
      setGlobalHrBusy(busy);
      if (!busy) {
        loadFacebookChannels().then(setChannels);
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
          setChannels(await loadFacebookChannels());
          setLongSyncHint(false);
          return;
        }

        // BƯỚC 1: Hiện data cũ ngay lập tức
        const existingList = await loadFacebookChannels();
        if (cancelled) return;
        setChannels(existingList);
        setLoadingInitial(false);

        // BƯỚC 2: Sync Lark nền
        const r = await syncFromLarkAssignmentIfStale();
        if (cancelled) return;

        if (r && r.imported > 0) {
          // Có kênh mới: load lại list và đánh dấu kênh mới để hiện spinner chờ Apify
          const updatedList = await loadFacebookChannels();
          if (cancelled) return;

          // Tìm các kênh mới xuất hiện sau sync
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

            // Chỉ poll cho các kênh mới — dừng khi tất cả đã có data
            let tries = 0;
            const pollNewChannels = async () => {
              if (cancelled || tries >= 20) {
                setNewlyImportedUsernames(new Set()); // Xoá spinner sau tối đa 5 phút
                return;
              }
              tries++;
              await new Promise((res) => setTimeout(res, 15000));
              if (cancelled) return;
              const latest = await loadFacebookChannels();
              if (!cancelled) setChannels(latest);
              // Dừng poll khi không còn kênh nào cần chờ
              const stillPending = latest.filter(
                (c) => newUsernames.has(c.username) && !c.total_followers && !c.total_likes && !c.total_videos
              );
              if (!cancelled && stillPending.length > 0) {
                bgRefreshRef.current = setTimeout(pollNewChannels, 0);
              } else {
                setNewlyImportedUsernames(new Set()); // Xong → bỏ spinner
              }
            };
            pollNewChannels();
          } else {
            setChannels(updatedList);
          }
        } else {
          // BƯỚC 3: Auto-enrich các kênh cũ nhưng có data bị 0
          // Sử dụng Polling để dù bạn có chuyển trang và chuyển lại thì vẫn duy trì spinner nếu nó chưa làm xong
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
              // Chạy lại nếu chưa từng chạy, hoặc chạy quá 5 phút chưa xong (bị lỗi / kẹt)
              if (!lastRun || now - lastRun > 5 * 60 * 1000) { 
                toRun.push(c);
                idsToSpin.push(c.username);
                historyMap[c.username] = now;
              } else {
                idsToSpin.push(c.username); // Chỉ hiển thị quay, không cào lại vì vẫn đang do tiến trình Apify xử lý
              }
            });

            if (idsToSpin.length > 0) {
              setNewlyImportedUsernames(prev => new Set([...Array.from(prev), ...idsToSpin]));
              sessionStorage.setItem('auto_0stats_run_map', JSON.stringify(historyMap));

              // Dùng cơ chế Polling định kỳ để update UI
              let pollTries = 0;
              let currentSpinIds = [...idsToSpin];
              const pollZeroChannels = async () => {
                if (cancelled || pollTries >= 40) { // Timeout sau 40 lần * 10s = ~6 phút
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
                
                const latest = await loadFacebookChannels();
                if (cancelled) return;
                setChannels(latest);
                
                // Kiểm tra xem kênh nào đã có số liệu rồi thì tháo spinner cho kênh đó
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
                  bgRefreshRef.current = setTimeout(pollZeroChannels, 0) as any;
                }
              };
              pollZeroChannels();
            }

            if (toRun.length > 0 && !cancelled) {
              toast.success(`Hệ thống đang phục hồi lấy số liệu cho ${toRun.length} kênh bị trắng...`, { duration: 5000 });
              toRun.forEach((c: any, idx: number) => {
                setTimeout(() => {
                  if (!cancelled && c.id) enrichTrackedChannelApify(c.id).catch(() => {});
                }, idx * 10000); // Lên lịch cào cách nhau 10s. Polling loop phía trên sẽ lo việc cập nhật UI.
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
    };
  }, []);

  const fetchTrackedChannels = async () => {
    try {
      setLoadingInitial(true);
      const list = await loadFacebookChannels();
      setChannels(list);
    } catch (error) {
      console.error('Error fetching tracked channels:', error);
    } finally {
      setLoadingInitial(false);
    }
  };

  const extractFacebookId = (input: string): string => {
    let clean = input.trim();
    // Basic URL cleanup
    if (clean.endsWith('/')) clean = clean.slice(0, -1);

    try {
      if (clean.includes('facebook.com') || clean.includes('fb.com')) {
        const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);

        // Handle /profile.php?id=123
        if (url.pathname.includes('profile.php')) {
          const id = url.searchParams.get('id');
          if (id) return id;
        }
        // Handle /groups/123
        if (url.pathname.includes('/groups/')) {
          const parts = url.pathname.split('/groups/');
          if (parts[1]) return parts[1].split('/')[0];
        }
        // Handle standard /username
        const pathParts = url.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
          if ((pathParts[0] === 'pages' || pathParts[0] === 'people') && pathParts.length >= 2) {
            return pathParts[pathParts.length - 1];
          }
          return pathParts[0];
        }
      }
    } catch (e) {
      // ignore
    }
    return clean.replace('@', '');
  };

  const fetchChannelProfile = async (input: string) => {
    setProcessing(true);
    const username = extractFacebookId(input);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

    try {
      // Call Backend to Analyze/Scan Channel
      const response = await fetch(`${apiUrl}/ai/user-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'facebook',
          username: username,
          max_results: 3, // Quick scan for profile info
          force_refresh: true // Bắt buộc lấy mới, không dùng cache (tránh lỗi 0 follower)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Không thể tìm thấy Fanpage/User này. Vui lòng kiểm tra lại Link hoặc ID.');
        setProcessing(false);
        return;
      }

      let payload: any = {};

      // Extract Data for Saving - Support multiple key variants from backend response
      const parseNumber = (val: any) => {
        if (!val && val !== 0) return 0;
        if (typeof val === 'number') return val;
        return parseInt(String(val).replace(/[,\.]/g, '')) || 0;
      };

      if (data.profile) {
        // Explicitly map fields to match Backend DTO
        // Support all possible key names for follower count
        const rawFollowers = data.profile.follower_count
          ?? data.profile.followers
          ?? data.profile.followersCount
          ?? data.profile.total_followers
          ?? data.profile.subscribers_count
          ?? 0;
        const followerCount = parseNumber(rawFollowers);

        // Determine Likes to save: Priority Page Likes -> Fallback Post Sum
        const pageLikes = parseNumber(data.profile.total_likes);
        const postLikesSum = parseNumber(data.profile.metadata?.fetched_likes_sum);
        const finalLikes = pageLikes > 0 ? pageLikes : postLikesSum;

        // Extract avatar – backend may use different key names
        const avatarUrl = data.profile.avatar_url
          || data.profile.profile_pic_url
          || data.profile.profilePicUrl
          || '';

        // Display name – multiple fallbacks
        const displayName = data.profile.display_name
          || data.profile.fullname
          || data.profile.name
          || data.profile.username
          || username;

        payload = {
          platform: 'FACEBOOK',
          username: data.profile.username || username,
          display_name: displayName,
          avatar_url: avatarUrl,
          total_followers: followerCount > 0 ? followerCount : null,
          total_likes: finalLikes,
          total_views: parseNumber(data.profile.total_views),
          total_videos: parseNumber(data.profile.total_videos || data.profile.media_count || data.results?.length || 0),
          engagement_rate: parseFloat(String(data.profile.engagement_rate || '0')) || 0
        };
      } else if (data.results && data.results.length > 0) {
        // Fallback extraction from posts
        const firstPost = data.results[0];
        payload = {
          platform: 'FACEBOOK',
          username: username,
          display_name: firstPost.author_name || username,
          avatar_url: firstPost.author_avatar || firstPost.thumbnail_url || '',
          total_followers: null, // Facebook doesn't provide this via Apify posts scraper
          total_likes: data.results.reduce((sum: number, p: any) => sum + parseNumber(p.likes_count), 0),
          total_views: data.results.reduce((sum: number, p: any) => sum + parseNumber(p.views_count), 0),
          total_videos: data.results.length,
          engagement: 0,
          engagement_rate: 0
        };
      } else {
        // Last resort: save with basic info even if no posts (private page or no public posts)
        // This prevents frustrating errors when user adds a valid channel that happens to have private posts
        payload = {
          platform: 'FACEBOOK',
          username: username,
          display_name: username,
          avatar_url: '',
          total_followers: null,
          total_likes: 0,
          total_views: 0,
          total_videos: 0,
          engagement_rate: 0
        };
      }

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
        await fetchTrackedChannels();
        setShowAddModal(false);
        setUsernameInput('');
        // After adding, go straight to analysis page (SocialLens-like flow)
        setLoadingChannelId(username);
        router.push(`/dashboard/facebook/analytics/${username}`);
      } else {
        const errorData = await saveResponse.json();
        alert(errorData.message || 'Lỗi khi lưu kênh vào hệ thống.');
      }
    } catch (error) {
      console.error('Error processing channel:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
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

  const getAvatarUrl = (channel: ChannelProfile) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name)}&background=1877F2&color=fff`;
    if (!channel.avatar_url) return fallback;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const cleanApiUrl = apiUrl.replace(/\/$/, '');
    if (
      channel.avatar_url.includes('fbcdn.net') ||
      channel.avatar_url.includes('facebook.com') ||
      channel.avatar_url.includes('cdninstagram.com') ||
      channel.avatar_url.includes('instagram.com')
    ) {
      return `${cleanApiUrl}/ai/proxy/avatar?url=${encodeURIComponent(channel.avatar_url)}`;
    }
    return channel.avatar_url;
  };

  const filteredChannels = channels.filter(c =>
    c.username.toLowerCase().includes(searchChannelQuery.toLowerCase()) ||
    (c.display_name && c.display_name.toLowerCase().includes(searchChannelQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-7xl py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-blue-200 shadow-lg">
                <Facebook className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Facebook Analytics</h1>
                <p className="text-sm text-slate-500">Quản lý Fanpage & Group</p>
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
                    const r = await runGlobalHrSync('FACEBOOK', loadFacebookChannels);
                    setChannels(await loadFacebookChannels());
                    if (r.imported > 0) {
                      toast.success(
                        `Đồng bộ ${r.imported} kênh (ưu tiên Facebook) — Apify đã cập nhật`,
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
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
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

        {/* Loading State — skeleton cards khi chưa có kênh nào */}
        {loadingInitial && channels.length === 0 && (
          <ChannelCardSkeletonGrid count={8} />
        )}

        {/* Empty State */}
        {!loadingInitial && channels.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 m-4"
          >
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
              <Facebook className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Chưa có kênh nào</h3>
            <p className="text-slate-500 mb-8 max-w-md text-center">
              Hãy thêm Fanpage, Profile hoặc Group Facebook đầu tiên của bạn để bắt đầu theo dõi và phân tích dữ liệu.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all hover:-translate-y-1"
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
                <BarChart3 className="w-5 h-5 text-blue-600" />
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
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredChannels.map((channel, idx) => (
                <div
                  key={channel.id || idx}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col h-full"
                  style={{ willChange: 'transform' }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshChannel(channel);
                      }}
                      disabled={refreshingIds.has(channel.username) || processing}
                      className="bg-white/90 p-2 rounded-lg text-blue-600 shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors"
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
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-50 shadow-md"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name)}&background=1877F2&color=fff`;
                        }}
                       width={0} height={0} sizes="100vw" unoptimized/>
                      <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white text-white shadow-sm">
                        <Facebook className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold text-slate-900 truncate text-lg" title={channel.display_name}>{channel.display_name}</h3>
                      <p className="text-sm text-slate-500 truncate font-medium flex items-center gap-1">
                        @{channel.username}
                      </p>

                    </div>
                  </div>

                  {/* Stats Wrapper — hiển thị spinner khi mới import, đang refresh, hoặc chưa có số liệu */}
                  <div className="relative mt-auto flex-1 flex flex-col justify-end min-h-[100px] mb-4">
                    {(newlyImportedUsernames.has(channel.username) || refreshingIds.has(channel.username) || (!channel.total_followers && !channel.total_likes)) && (
                      <div className="absolute inset-[-8px] bg-white/60 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center border border-slate-100/50">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-1.5" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-white/90 px-3 py-1 rounded-full shadow-sm border border-blue-100">Đang lấy số liệu...</span>
                      </div>
                    )}
                    {/* Stats Grid - Show Followers only */}
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100 flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-blue-500 font-bold uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Followers</span>
                        <span className="text-blue-900 font-black text-lg">
                          {formatNumber(channel.total_followers || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => {
                      setLoadingChannelId(channel.username);
                      router.push(`/dashboard/facebook/analytics/${channel.username}`);
                    }}
                    disabled={loadingChannelId === channel.username}
                    className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-80"
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
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <Plus className="w-5 h-5" />
                    </div>
                    Thêm Kênh Facebook
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Theo dõi Fanpage hoặc trang cá nhân mới</p>
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
                  Link Facebook hoặc ID
                </label>
                <div className="relative mb-6">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddChannel()}
                    placeholder="Ví dụ: https://www.facebook.com/vtv24"
                    disabled={processing}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-lg text-slate-900 placeholder:text-slate-400"
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

                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-6">
                  <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Facebook className="w-4 h-4" /> Hỗ trợ các định dạng:
                  </h4>
                  <ul className="text-sm text-slate-600 space-y-1.5 pl-1">
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> Link Fanpage (facebook.com/trang)</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> Link Profile (facebook.com/nguoi.dung)</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> Username hoặc ID (vd: vtv24)</li>
                  </ul>
                </div>

                <div className="bg-green-50/50 rounded-xl p-4 border border-green-100 mb-4">
                  <h4 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                    ✅ Dữ liệu hỗ trợ đầy đủ
                  </h4>
                  <ul className="text-sm text-slate-600 space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-400 mt-2" />
                      <span><strong>Page Likes & Followers</strong> (Tự động quét từ trang)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-400 mt-2" />
                      <span>Video & Bài viết (20 bài gần nhất)</span>
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
                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
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
