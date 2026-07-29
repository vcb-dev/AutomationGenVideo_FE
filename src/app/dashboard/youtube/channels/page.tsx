'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Search, Plus, TrendingUp, Eye, Heart, Users, ArrowRight, X, Loader2, Video, RotateCcw } from 'lucide-react';
import { ChannelCardSkeletonGrid } from '@/components/channels/ChannelCardSkeleton';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
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

const YT_RED = '#FF0000';

export default function YoutubeChannelsPage() {
    const router = useRouter();
    const [platform] = useState('youtube');
    const [channels, setChannels] = useState<ChannelProfile[]>([]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [usernameInput, setUsernameInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
    const [searchChannelQuery, setSearchChannelQuery] = useState('');
    const [listLoading, setListLoading] = useState(true);
    const loadYoutubeChannels = async (): Promise<ChannelProfile[]> => {
        try {
            const response = await apiClient.get(`/tracked-channels?platform=YOUTUBE`);
            return Array.isArray(response.data) ? response.data : [];
        } catch {
            return [];
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setListLoading(true);
            try {
                const list = await loadYoutubeChannels();
                if (cancelled) return;
                setChannels(list);
                const staleResult = await enrichStaleChannelsIfNeeded();
                if (!cancelled && staleResult && staleResult.enriched > 0) {
                    const fresh = await loadYoutubeChannels();
                    if (!cancelled) {
                        setChannels(fresh);
                        toast.success(`Đã cập nhật số liệu ${staleResult.enriched} kênh`, { duration: 3000 });
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
        };
    }, []);

    const fetchTrackedChannels = async () => {
        try {
            const list = await loadYoutubeChannels();
            setChannels(list);
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error('Error fetching tracked channels:', error);
            }
        }
    };

    const fetchChannelProfile = async (input: string) => {
        setLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${baseUrl}/ai/user-videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: 'youtube',
                    username: input.replace('@', '').trim(),
                    max_results: 5,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    toast.error('Apify quota exceeded. Vui lòng thử lại sau.');
                    return;
                }
                toast.error(data.error || data.message || 'Lỗi kết nối server. Vui lòng thử lại.');
                return;
            }

            let payload: any = {};

            if (data.profile) {
                payload = {
                    platform: 'YOUTUBE',
                    username: data.profile.username || input.replace('@', '').trim(),
                    display_name: data.profile.display_name || data.profile.username,
                    avatar_url: data.profile.avatar_url || '',
                    total_followers: data.profile.follower_count || data.profile.subscribers_count || 0,
                    total_likes: data.profile.total_likes || 0,
                    total_views: data.profile.total_views || 0,
                    total_videos: data.profile.total_videos || 0,
                    engagement_rate: data.profile.engagement_rate || 0,
                };
            } else if (data.success && data.results && data.results.length > 0) {
                const first = data.results[0];
                const raw = first.raw_data || {};
                payload = {
                    platform: 'YOUTUBE',
                    username: raw.channelId || input.replace('@', '').trim(),
                    display_name: raw.channelName || first.author_name || input,
                    avatar_url: raw.channelAvatarUrl || '',
                    total_followers: raw.numberOfSubscribers || 0,
                    total_likes: data.results.reduce((s: number, v: any) => s + (v.likes_count || 0), 0),
                    total_views: raw.channelTotalViews || data.results.reduce((s: number, v: any) => s + (v.views_count || 0), 0),
                    total_videos: raw.channelTotalVideos || data.results.length,
                    engagement_rate: 0,
                };
            } else {
                toast.error('Không tìm thấy kênh YouTube này. Kiểm tra lại username hoặc link.');
                return;
            }

            try {
                await apiClient.post('/tracked-channels', payload);
                await fetchTrackedChannels();
                setShowAddModal(false);
                setUsernameInput('');
                toast.success('Đã thêm kênh YouTube thành công!');
            } catch (saveError: any) {
                if (saveError.response?.status === 401) {
                    toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                } else {
                    toast.error(saveError.response?.data?.message || 'Có lỗi xảy ra khi lưu kênh');
                }
            }
        } catch (error) {
            console.error('Error fetching YouTube channel:', error);
            toast.error(`Lỗi: ${error instanceof Error ? error.message : 'Vui lòng thử lại sau.'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddChannel = () => {
        if (!usernameInput.trim()) return;
        fetchChannelProfile(usernameInput.trim());
    };

    const handleRefreshChannel = async (channel: ChannelProfile) => {
        setRefreshingIds((prev) => new Set(prev).add(channel.username));
        try {
            if (channel.id) {
                const r = await enrichTrackedChannelApify(channel.id);
                await fetchTrackedChannels();
                if (!r.success) toast.error(r.message || 'Không làm mới được số liệu (Apify)');
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
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toString();
    };

    const getAvatarUrl = (channel: ChannelProfile) => {
        const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name || channel.username)}&background=FF0000&color=fff`;
        return channel.avatar_url || fallback;
    };

    const filteredChannels = channels.filter(
        (c) =>
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
                            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">YouTube Channels</h1>
                                <p className="text-slate-500 text-sm mt-0.5">
                                    {channels.length} kênh đang theo dõi
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black transition shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm kênh
                            </button>
                        </div>
                    </div>

                    {/* Platform switcher */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <ChannelsPlatformSwitcher />
                    </div>

                    {/* Search */}
                    <div className="mt-4 relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kênh..."
                            value={searchChannelQuery}
                            onChange={(e) => setSearchChannelQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                    </div>

                </div>
            </div>

            {/* Channel List */}
            <div className="container mx-auto px-4 max-w-7xl mt-8">
                {listLoading && channels.length === 0 ? (
                    <ChannelCardSkeletonGrid count={8} />
                ) : filteredChannels.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto bg-red-50 rounded-3xl flex items-center justify-center mb-4">
                            <Video className="w-10 h-10 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có kênh YouTube nào</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Thêm kênh YouTube bằng cách nhập username hoặc link kênh
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                        >
                            + Thêm kênh đầu tiên
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        <AnimatePresence>
                            {filteredChannels.map((channel) => (
                                <motion.div
                                    key={channel.username}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition group"
                                >
                                    <div className="p-5">
                                        {/* Avatar + Name */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                <Image
                                                    src={getAvatarUrl(channel)}
                                                    alt={channel.display_name || channel.username}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name || channel.username)}&background=FF0000&color=fff`;
                                                    }}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 truncate text-sm">
                                                    {channel.display_name || channel.username}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">@{channel.username}</p>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="relative mb-4">
                                            {(refreshingIds.has(channel.username) || (!channel.total_followers && !channel.total_likes && !channel.total_videos)) && (
                                                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 rounded-xl flex flex-col items-center justify-center">
                                                    <Loader2 className="w-5 h-5 text-red-500 animate-spin mb-1" />
                                                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest bg-white/90 px-2 py-0.5 rounded-full border border-red-100">Đang lấy số liệu...</span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-red-50 rounded-xl p-2.5 text-center">
                                                <Users className="w-3.5 h-3.5 text-red-500 mx-auto mb-0.5" />
                                                <p className="text-xs font-black text-slate-800">
                                                    {formatNumber(channel.total_followers || 0)}
                                                </p>
                                                <p className="text-[10px] text-slate-500">Subscribers</p>
                                            </div>
                                            <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                                                <Video className="w-3.5 h-3.5 text-slate-500 mx-auto mb-0.5" />
                                                <p className="text-xs font-black text-slate-800">
                                                    {formatNumber(channel.total_videos || 0)}
                                                </p>
                                                <p className="text-[10px] text-slate-500">Videos</p>
                                            </div>
                                            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                                                <Eye className="w-3.5 h-3.5 text-blue-500 mx-auto mb-0.5" />
                                                <p className="text-xs font-black text-slate-800">
                                                    {formatNumber(channel.total_views || 0)}
                                                </p>
                                                <p className="text-[10px] text-slate-500">Total Views</p>
                                            </div>
                                            <div className="bg-green-50 rounded-xl p-2.5 text-center">
                                                <TrendingUp className="w-3.5 h-3.5 text-green-500 mx-auto mb-0.5" />
                                                <p className="text-xs font-black text-slate-800">
                                                    {(channel.engagement_rate || 0).toFixed(1)}%
                                                </p>
                                                <p className="text-[10px] text-slate-500">Engage</p>
                                            </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRefreshChannel(channel)}
                                                disabled={refreshingIds.has(channel.username)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
                                            >
                                                {refreshingIds.has(channel.username) ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                )}
                                                Làm mới
                                            </button>
                                            <button
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/ai/analytics/${encodeURIComponent(channel.username)}?platform=youtube`
                                                    )
                                                }
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
                                            >
                                                <ArrowRight className="w-3.5 h-3.5" />
                                                Chi tiết
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Add Channel Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                                            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-900">Thêm kênh YouTube</h2>
                                </div>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Username hoặc Channel ID
                                    </label>
                                    <input
                                        type="text"
                                        value={usernameInput}
                                        onChange={(e) => setUsernameInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
                                        placeholder="@channelname hoặc UCxxxx..."
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                                        autoFocus
                                    />
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Ví dụ: @MrBeast, UCX6OQ3DkcsbYNE6H8uQQuVA
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <p className="text-xs text-amber-800 font-medium">
                                        ⏱ Quét YouTube qua Apify có thể mất 30–60 giây. Vui lòng chờ.
                                    </p>
                                </div>

                                <button
                                    onClick={handleAddChannel}
                                    disabled={loading || !usernameInput.trim()}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Đang lấy dữ liệu...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Thêm kênh
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
