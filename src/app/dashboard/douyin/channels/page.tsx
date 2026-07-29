'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import { Search, Plus, TrendingUp, Eye, Heart, Users, ArrowRight, X, Loader, Loader2, Video, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { enrichTrackedChannelApify } from '@/lib/enrich-tracked-channel-apify';
import {
    channelAwaitingStats,
} from '@/lib/poll-tracked-channels-stats';
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

export default function DouyinChannelsPage() {
    const router = useRouter();
    const [platform] = useState('douyin');
    const [channels, setChannels] = useState<ChannelProfile[]>([]);

    // Add Channel Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [usernameInput, setUsernameInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
    const [searchChannelQuery, setSearchChannelQuery] = useState('');
    const [listLoading, setListLoading] = useState(true);

    const loadDouyinChannels = async (): Promise<ChannelProfile[]> => {
        try {
            const response = await apiClient.get(`/tracked-channels?platform=${platform.toUpperCase()}`);
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
                const list = await loadDouyinChannels();
                if (cancelled) return;
                setChannels(list);
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
            const list = await loadDouyinChannels();
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
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

            // Call the new Douyin profile proxy endpoint
            const response = await fetch(`${baseUrl}/douyin/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.replace('@', '')
                })
            });

            const data = await response.json();
            console.log('Update Profile API Response:', data);

            if (!response.ok) {
                toast.error(data.message || data.error || 'Lỗi kết nối đến server. Vui lòng thử lại.');
                return;
            }

            if (!data.success || !data.profile) {
                toast.error('Không thể lấy thông tin kênh này. Kênh có thể bị private hoặc không tồn tại.');
                setLoading(false);
                return;
            }

            const profile = data.profile;
            const payload = {
                platform: 'DOUYIN',
                username: profile.username || username.replace('@', ''),
                display_name: profile.display_name || profile.username,
                avatar_url: profile.avatar_url,
                total_followers: profile.follower_count || 0,
                total_likes: profile.total_likes || 0,
                total_views: profile.total_views || 0,
                total_videos: profile.total_videos || 0,
                engagement_rate: profile.engagement_rate || 0
            };

            try {
                // Save updated profile to our DB
                const saveResponse = await apiClient.post('/tracked-channels', payload);
                if (saveResponse.data) {
                    await fetchTrackedChannels();
                    setShowAddModal(false);
                    setUsernameInput('');
                }
            } catch (saveError: any) {
                if (saveError.response?.status === 401) {
                    toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                } else {
                    const errorMessage = saveError.response?.data?.message || 'Có lỗi xảy ra khi lưu kênh';
                    toast.error(errorMessage);
                }
                return;
            }
        } catch (error) {
            console.error('Error fetching channel profile:', error);
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
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        return num.toString();
    };

    const getAvatarUrl = (channel: ChannelProfile) => {
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.display_name || channel.username)}&background=random&color=fff`;
        if (!channel.avatar_url) return fallbackUrl;

        // Always proxy Douyin CDN links to avoid CORS/expiry issues.  Proxying
        // non‑CDN links is harmless and gives us a consistent origin.
        const proxyBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        if (
            channel.avatar_url.includes('douyinpic.com') ||
            channel.avatar_url.includes('douyincdn.com') ||
            channel.avatar_url.includes('snssdk.com')
        ) {
            return `${proxyBaseUrl}/ai/proxy/avatar?url=${encodeURIComponent(channel.avatar_url)}`;
        }
        // fallback to original URL if it doesn't match known CDNs
        return channel.avatar_url;
    };

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
                            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-2xl">
                                🎵
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Douyin Analytics</h1>
                                <p className="text-slate-500">Monitor and track your Douyin channel performance</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all shadow-lg"
                            >
                                <Plus className="w-5 h-5" />
                                Add Channel
                            </button>
                        </div>
                    </div>
                    <div className="mt-4">
                        <ChannelsPlatformSwitcher />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 max-w-7xl pt-8">
                {listLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 px-4 min-h-[320px]">
                        <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-6" />
                        <p className="text-slate-800 font-semibold text-lg text-center">
                            Đang tải kênh Douyin…
                        </p>
                    </div>
                ) : (
                    <>
                <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-5 h-5 text-red-600" />
                                <span className="text-2xl font-bold text-slate-900">{channels.length}</span>
                                <span className="text-slate-500">Channel{channels.length !== 1 ? 's' : ''}</span>
                            </div>
                            <p className="text-sm text-slate-400">Total tracked accounts</p>
                        </div>

                        <div className="relative">
                            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search your channels..."
                                value={searchChannelQuery}
                                onChange={(e) => setSearchChannelQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                            />
                        </div>
                    </div>
                </div>

                {filteredChannels.length === 0 ? (
                    <div className="text-center py-20">
                        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No channels yet</h3>
                        <p className="text-slate-500 mb-6">Click "+ Add Channel" to start tracking your first Douyin channel</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredChannels.map((channel, idx) => (
                            <motion.div
                                key={channel.username}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="relative">
                                        <Image
                                            src={getAvatarUrl(channel)}
                                            alt={channel.display_name || channel.username}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                                            onError={(e) => {
                                                // If the image fails to load (expired URL/CORS),
                                                // fallback to generated avatar.
                                                const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                    channel.display_name || channel.username
                                                )}&background=random&color=fff`;
                                                e.currentTarget.src = fallback;
                                            }}
                                         width={0} height={0} sizes="100vw" unoptimized/>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[10px] border-2 border-white">
                                            🎵
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 truncate text-sm">{channel.display_name || channel.username}</h3>
                                        <p className="text-xs text-slate-500 truncate">@{channel.username}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRefreshChannel(channel)}
                                        disabled={refreshingIds.has(channel.username)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <RotateCcw className={`w-3.5 h-3.5 ${refreshingIds.has(channel.username) ? 'animate-spin' : ''}`} />
                                        {refreshingIds.has(channel.username) ? 'Updating...' : 'Update'}
                                    </button>
                                </div>

                                <div className="relative mt-auto flex-1 flex flex-col justify-end min-h-[100px] mb-5">
                                    {channelAwaitingStats(channel) && (
                                        <div className="absolute inset-[-8px] bg-white/60 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center animate-pulse border border-slate-100/50">
                                            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin mb-2" />
                                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest bg-white/90 px-3 py-1 rounded-full shadow-sm border border-indigo-200">AI đang quét số liệu...</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Followers</span>
                                            <p className="text-lg font-bold text-slate-900">{formatNumber(channel.total_followers || 0)}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Likes</span>
                                            <p className="text-lg font-bold text-slate-900">{formatNumber(Number(channel.total_likes) || 0)}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Videos</span>
                                            <p className="text-lg font-bold text-slate-900">{channel.total_videos || 0}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <span className="block text-xs font-medium text-slate-400 uppercase mb-1">Engagement</span>
                                            <p className="text-lg font-bold text-slate-900">{channel.engagement_rate?.toFixed(2) || '0.00'}%</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(`/dashboard/douyin/analytics/${channel.username}`)}
                                    className="w-full py-3 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 group"
                                >
                                    View Analytics
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                                <h2 className="text-2xl font-bold text-slate-900">Add Douyin Channel</h2>
                                <button
                                    onClick={() => !loading && setShowAddModal(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Username / Channel ID</label>
                                <input
                                    type="text"
                                    value={usernameInput}
                                    onChange={(e) => setUsernameInput(e.target.value)}
                                    placeholder="Enter Douyin username"
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddChannel}
                                    disabled={loading || !usernameInput.trim()}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Add Channel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
