'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, AlertTriangle, Facebook, Instagram, Music2, Music, BookOpen, Hash, Play, Heart, MessageCircle, Share2, Eye, Bookmark, BookmarkCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';

type Platform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'DOUYIN' | 'XIAOHONGSHU';
type SearchType = 'keyword' | 'hashtag';

interface UnifiedVideo {
    id: string;
    video_id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    video_url: string;
    author_name: string;
    author_username: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    platform: Platform;
    raw_data?: any;
}

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER];

export default function GlobalSearchPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const hasAccess = user?.roles?.some((r) => ALLOWED_ROLES.includes(r)) ?? false;

    useEffect(() => {
        if (user !== undefined && !hasAccess) {
            router.replace('/dashboard');
        }
    }, [user, hasAccess, router]);

    const [platform, setPlatform] = useState<Platform>('TIKTOK');
    const [searchType, setSearchType] = useState<SearchType>('keyword');
    const [searchTerm, setSearchTerm] = useState('');
    const [instagramPostType, setInstagramPostType] = useState<'posts' | 'reels'>('posts');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [results, setResults] = useState<UnifiedVideo[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [batchIndex, setBatchIndex] = useState(0);
    const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
    const [hasMore, setHasMore] = useState(false);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    // All video_ids already in the library — these are hidden from search results
    const [libraryVideoIds, setLibraryVideoIds] = useState<Set<string>>(new Set());
    const ITEMS_PER_PAGE = 10;

    // Fetch saved IDs once on mount so we can hide them from future searches
    useEffect(() => {
        const fetchSavedIds = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                const token = localStorage.getItem('auth_token');
                const res = await fetch(`${apiUrl}/video-library/saved-ids`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setLibraryVideoIds(new Set<string>(data.ids ?? []));
                    setSavedIds(new Set<string>(data.ids ?? []));
                }
            } catch {
                // silent — don't block search if this fails
            }
        };
        fetchSavedIds();
    }, []);

    const buildSourcingUrl = (video: UnifiedVideo) => {
        const params = new URLSearchParams({
            videoId: video.video_id,
            videoTitle: encodeURIComponent(video.title),
            videoDescription: encodeURIComponent((video.description ?? '').slice(0, 800)),
        });
        if (video.video_url) params.set('videoUrl', encodeURIComponent(video.video_url));
        return `/dashboard/content/product-selection?${params.toString()}`;
    };

    const handleSaveToLibrary = async (video: UnifiedVideo) => {
        if (savingIds.has(video.video_id)) return;
        setSavingIds((prev) => new Set(prev).add(video.video_id));
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${apiUrl}/video-library/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    video_id: video.video_id,
                    platform: video.platform,
                    title: video.title,
                    description: video.description ?? '',
                    video_url: video.video_url,
                    author_username: video.author_username,
                    author_name: video.author_name ?? video.author_username,
                    thumbnail_url: video.thumbnail_url ?? null,
                    views_count: video.views_count ?? 0,
                    likes_count: video.likes_count ?? 0,
                    comments_count: video.comments_count ?? 0,
                    shares_count: video.shares_count ?? 0,
                    sourcing_url: buildSourcingUrl(video),
                }),
            });
            if (res.ok || res.status === 409) {
                setSavedIds((prev) => new Set(prev).add(video.video_id));
                setLibraryVideoIds((prev) => new Set(prev).add(video.video_id));
            }
        } catch {
            // silent
        } finally {
            setSavingIds((prev) => { const s = new Set(prev); s.delete(video.video_id); return s; });
        }
    };

    const platforms: { id: Platform; label: string; icon: any; color: string; glow: string; bg: string; disabled?: boolean }[] = [
        { id: 'TIKTOK', label: 'TikTok', icon: Music2, color: 'from-[#00f2ea] to-[#ff0050]', glow: 'shadow-[#00f2ea]/20', bg: 'bg-[#00f2ea]' },
        { id: 'FACEBOOK', label: 'Facebook', icon: Facebook, color: 'from-[#1877F2] to-[#0052D4]', glow: 'shadow-[#1877F2]/20', bg: 'bg-[#1877F2]', disabled: true },
        { id: 'INSTAGRAM', label: 'Instagram', icon: Instagram, color: 'from-[#833ab4] via-[#fd1d1d] to-[#fcb045]', glow: 'shadow-[#fd1d1d]/20', bg: 'bg-[#fd1d1d]' },
        { id: 'DOUYIN', label: 'Douyin', icon: Music, color: 'from-[#25F4EE] to-[#FE2C55]', glow: 'shadow-[#fe2c55]/20', bg: 'bg-[#FE2C55]' },
        { id: 'XIAOHONGSHU', label: 'Xiaohongshu', icon: BookOpen, color: 'from-[#ff2741] to-[#eb3349]', glow: 'shadow-[#ff2741]/20', bg: 'bg-[#ff2741]', disabled: true },
    ];

    const handleSearch = async (appendMode = false, nextBatchIndex = 0, currentSeenIds?: Set<string>) => {
        if (!searchTerm.trim()) {
            setError('Vui lòng nhập từ khóa tìm kiếm');
            return;
        }

        if (appendMode) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setError(null);
            setResults([]);
            setCurrentPage(1);
            setBatchIndex(0);
            setSeenIds(new Set());
            setHasMore(false);
        }

        try {
            const token = localStorage.getItem('auth_token');

            let endpoint = '';
            let body: any = {};

            // Douyin & Xiaohongshu still call NestJS directly (they have dedicated controllers).
            // TikTok / Facebook / Instagram go through the local Next.js proxy (/api/search)
            // which forwards server-side to NestJS → Django, avoiding all CORS / cache issues.
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

            if (platform === 'DOUYIN') {
                endpoint = `${apiUrl}/douyin/search/`;
                const ids = currentSeenIds ?? seenIds;
                body = {
                    searchTerm: searchTerm.trim(),
                    searchType: searchType,
                    maxPosts: 30,
                    batchIndex: nextBatchIndex,
                    seenIds: Array.from(ids),
                };
            } else if (platform === 'XIAOHONGSHU') {
                endpoint = `${apiUrl}/xiaohongshu/search/`;
                body = {
                    searchTerm: searchTerm.trim(),
                    maxPosts: 20,
                };
            } else if (platform === 'TIKTOK') {
                endpoint = '/api/search';
                body = {
                    platform: 'tiktok',
                    keyword: searchType === 'hashtag' ? `#${searchTerm.replace(/#/g, '')}` : searchTerm,
                    max_results: 30,
                    search_type: 'posts',
                    search_mode: searchType,
                    page: appendMode ? nextBatchIndex + 1 : 1,
                };
            } else {
                endpoint = '/api/search';
                body = {
                    platform: platform.toLowerCase(),
                    keyword: searchTerm,
                    max_results: 30,
                    search_type: platform === 'INSTAGRAM' ? instagramPostType : 'posts',
                    search_mode: searchType,
                    page: appendMode ? nextBatchIndex + 1 : 1,
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            // Safely parse JSON — if server returns HTML (e.g. 404 page) Safari throws
            // "The string did not match the expected pattern." which is misleading.
            let data: any = {};
            try {
                data = await response.json();
            } catch {
                throw new Error(`Lỗi kết nối server (HTTP ${response.status}). Vui lòng kiểm tra backend đang chạy tại ${endpoint}`);
            }

            if (!response.ok) {
                const msg = data?.message ?? data?.error;
                throw new Error(
                    Array.isArray(msg) ? msg.join('; ') : (msg || `Lỗi tìm kiếm trên ${platform} (HTTP ${response.status})`)
                );
            }

            // Normalize results based on platform
            let rawList: any[] = [];
            if (platform === 'DOUYIN') {
                rawList = data.data?.videos || [];
                // Cập nhật hasMore từ response
                setHasMore(data.data?.hasMore ?? false);
            } else if (platform === 'XIAOHONGSHU') {
                rawList = data.data?.notes || [];
            } else {
                rawList = data.results || [];
                // Instagram/TikTok: đọc has_more từ SearchView response
                if (platform === 'INSTAGRAM') {
                    setHasMore(data.has_more ?? (rawList.length >= 30));
                }
            }

            const normalized: UnifiedVideo[] = rawList.map((item: any) => ({
                id: item.video_id || item.id || Math.random().toString(36).substr(2, 9),
                video_id: item.video_id || '',
                title: item.title || item.description || '',
                description: item.description || item.title || '',
                thumbnail_url: item.thumbnail_url || item.cover_url || '',
                video_url: item.video_url || item.url || '',
                author_name: item.author_name || item.user_name || 'N/A',
                author_username: item.author_username || item.user_id || '',
                views_count: item.views_count || 0,
                likes_count: item.likes_count || 0,
                comments_count: item.comments_count || 0,
                shares_count: item.shares_count || 0,
                platform: platform,
                raw_data: item
            }));

            if (appendMode) {
                // Append mode: thêm vào kết quả hiện tại, loại trùng
                setResults(prev => {
                    const existingIds = new Set(prev.map(v => v.video_id));
                    const newItems = normalized.filter(v => !existingIds.has(v.video_id));
                    return [...prev, ...newItems];
                });
                // Cập nhật seenIds
                setSeenIds(prev => {
                    const updated = new Set(prev);
                    normalized.forEach(v => { if (v.video_id) updated.add(v.video_id); });
                    return updated;
                });
            } else {
                setResults(normalized);
                // Khởi tạo seenIds từ batch đầu
                const newIds = new Set(normalized.map(v => v.video_id).filter(Boolean));
                setSeenIds(newIds);
            }
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tìm kiếm');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleNextBatch = () => {
        const nextIdx = batchIndex + 1;
        setBatchIndex(nextIdx);
        handleSearch(true, nextIdx, seenIds);
    };

    // Reset page and clear data when platform changes
    useEffect(() => {
        setSearchTerm('');
        setResults([]);
        setError(null);
        setCurrentPage(1);
        setBatchIndex(0);
        setSeenIds(new Set());
        setHasMore(false);
        setInstagramPostType('posts');
        setSearchType('keyword');
    }, [platform]);

    // Hide videos already saved to the library from search results
    const visibleResults = results.filter((v) => !libraryVideoIds.has(v.video_id));
    const totalPages = Math.ceil(visibleResults.length / ITEMS_PER_PAGE);
    const paginatedResults = visibleResults.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 400, behavior: 'smooth' });
    };

    const formatNumber = (num: number) => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    if (!hasAccess) {
        return null;
    }

    return (
        <div className="min-h-[calc(100vh-73px)] bg-[#07090F] text-white p-6 md:p-10 -m-6 selection:bg-blue-500/30">
            <style dangerouslySetInnerHTML={{
                __html: `
                header { background-color: #07090F !important; border-bottom-color: #151820 !important; }
                header p { color: #f8fafc !important; }
                header { background-color: #07090F !important; border-bottom-color: #151820 !important; }
                header p { color: #f8fafc !important; }
                body { background-color: #07090F !important; }
                main { background-color: #07090F !important; }
                .bg-gray-50 { background-color: #07090F !important; }
            `}} />
            {/* Decorative localized glow */}
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 text-center space-y-2"
                >
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Video</span>
                        <span className="text-white mx-2">Discovery</span>
                        <span className="text-slate-800">Hub</span>
                    </h1>
                    <p className="text-slate-500 text-base font-medium max-w-xl mx-auto">
                        Hệ thống quét dữ liệu xu hướng thời gian thực trên các nền tảng mạng xã hội.
                    </p>
                </motion.div>

                {/* Platform Selection - PREMIUM REDESIGN */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
                    {platforms.map((p) => {
                        const isActive = platform === p.id;
                        const isDisabled = p.disabled;
                        return (
                            <button
                                key={p.id}
                                onClick={() => !isDisabled && setPlatform(p.id)}
                                disabled={isDisabled}
                                className={`group relative h-28 rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isDisabled
                                    ? 'opacity-40 cursor-not-allowed grayscale'
                                    : isActive
                                        ? `scale-105 shadow-xl ${p.glow}`
                                        : 'hover:scale-[1.02] hover:translate-y-[-2px]'
                                    }`}
                            >
                                {/* Background Layer */}
                                <div className={`absolute inset-0 rounded-3xl transition-all duration-500 border-2 ${isActive
                                    ? 'bg-slate-900 border-white/10'
                                    : 'bg-slate-900/40 border-slate-800'
                                    }`} />

                                {/* Active Gradient Glow */}
                                <AnimatePresence>
                                    {isActive && !isDisabled && (
                                        <motion.div
                                            layoutId="platform-glow"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className={`absolute -inset-[2px] rounded-3xl bg-gradient-to-br ${p.color} blur-[2px] opacity-40 -z-10`}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Content */}
                                <div className="relative h-full flex flex-col items-center justify-center p-4 gap-3 z-10">
                                    {/* Icon with Ring */}
                                    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'
                                        }`}>
                                        {/* Floating inner glow for active */}
                                        {isActive && !isDisabled && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                                transition={{ duration: 3, repeat: Infinity }}
                                                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${p.color} blur-lg opacity-40`}
                                            />
                                        )}

                                        <p.icon className={`relative w-7 h-7 transition-all duration-500 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                                            }`} />
                                    </div>

                                    {/* Label */}
                                    <div className="text-center">
                                        <span className={`block font-bold tracking-widest text-[10px] uppercase transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'
                                            }`}>
                                            {isDisabled ? 'Đang phát triển' : p.label}
                                        </span>
                                        {isActive && !isDisabled && (
                                            <motion.div
                                                layoutId="active-dot"
                                                className={`w-1 h-1 rounded-full mx-auto mt-1.5 ${p.bg}`}
                                            />
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Search Controls - HIGH-END REDESIGN */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group mb-16 z-50"
                >
                    {/* Futuristic Border Glow */}
                    <div className={`absolute -inset-[1px] rounded-[3rem] bg-gradient-to-r ${platforms.find(p => p.id === platform)?.color} opacity-20 blur-[1px] group-hover:opacity-40 transition-opacity duration-500`} />

                    <div className="relative bg-[#0F111A]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                        {/* Background Texture */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none rounded-[2.5rem]" />

                        <div className="flex flex-col gap-6 relative z-10">
                            {/* Mode Selection */}
                            <div className="flex bg-black/40 p-1 rounded-xl w-fit border border-white/5">
                                {[
                                    { id: 'keyword', label: 'Từ khóa', icon: Search },
                                    { id: 'hashtag', label: 'Hashtag', icon: Hash }
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setSearchType(mode.id as SearchType)}
                                        className={`px-6 py-2 rounded-lg text-[11px] font-bold transition-all duration-300 flex items-center gap-2 ${searchType === mode.id
                                            ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        <mode.icon className={`w-3.5 h-3.5 ${searchType === mode.id ? 'text-blue-400' : ''}`} />
                                        <span className="uppercase tracking-widest">{mode.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Input & Action Row */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative group/input">
                                    <div className="flex flex-col gap-4">
                                        {/* Optional Instagram Posts vs Reels Toggle */}
                                        <AnimatePresence>
                                            {platform === 'INSTAGRAM' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: -8 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    className="flex bg-black/40 p-1 rounded-xl w-fit border border-white/5 mb-1"
                                                >
                                                    {[
                                                        { id: 'posts', label: 'Bài viết (Posts)', icon: BookOpen },
                                                        { id: 'reels', label: 'Video (Reels)', icon: Play }
                                                    ].map((mode) => (
                                                        <button
                                                            key={mode.id}
                                                            onClick={() => setInstagramPostType(mode.id as 'posts' | 'reels')}
                                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 flex items-center gap-1.5 ${instagramPostType === mode.id
                                                                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 shadow-lg ring-1 ring-pink-500/30'
                                                                : 'text-slate-500 hover:text-slate-300'
                                                                }`}
                                                        >
                                                            <mode.icon className={`w-3 h-3 ${instagramPostType === mode.id ? 'text-pink-400' : ''}`} />
                                                            <span className="uppercase tracking-widest">{mode.label}</span>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <SearchAutocomplete
                                            platform={platform}
                                            value={searchTerm}
                                            onChange={setSearchTerm}
                                            onSearch={() => handleSearch()}
                                            placeholder={`Gõ ${searchType === 'keyword' ? 'từ khóa' : 'hashtag'} cần quét...`}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSearch()}
                                    disabled={loading}
                                    className={`relative group/btn md:w-48 h-12 rounded-xl overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-r ${platforms.find(p => p.id === platform)?.color} transition-transform duration-500 group-hover/btn:scale-110`} />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />

                                    <div className="relative flex items-center justify-center gap-2 text-white px-6">
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span className="text-xs font-black tracking-widest uppercase">Quét Ngay</span>
                                                <Search className="w-4 h-4" />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Dynamic Status / Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-10 overflow-hidden"
                        >
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <p className="text-red-400/90 font-medium">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results Hub */}
                <div className="relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading-state"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-32"
                            >
                                <div className="relative w-32 h-32 mb-8">
                                    <div className={`absolute inset-0 rounded-full border-t-2 border-b-2 border-transparent border-t-blue-500 border-b-purple-500 animate-spin`} />
                                    <div className={`absolute inset-4 rounded-full border-l-2 border-r-2 border-transparent border-l-pink-500 border-r-cyan-400 animate-spin-slow`} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white/5 rounded-full blur-xl animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500">
                                    CONNECTING TO {platform} DATABASE
                                </h3>
                                <p className="text-slate-600 text-sm mt-2 font-mono uppercase tracking-[0.3em]">Scraping viral insights...</p>
                            </motion.div>
                        ) : results.length > 0 ? (
                            <motion.div
                                key="has-results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-10 pb-20"
                            >
                                {/* Hidden-from-library notice */}
                                {results.length > visibleResults.length && (
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs font-medium w-fit mx-auto">
                                        <BookmarkCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                        Đã ẩn {results.length - visibleResults.length} video đã có trong Bộ sưu tập
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                    {paginatedResults.map((video, idx) => (
                                        <motion.div
                                            key={`${video.id}-${idx}`}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group relative flex flex-col h-full bg-[#111420] rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden hover:shadow-2xl"
                                        >
                                            {/* Visual Media Header */}
                                            <div className="relative aspect-[9/16] overflow-hidden">
                                                <Image
                                                    src={video.thumbnail_url}
                                                    alt={video.description}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                 width={0} height={0} sizes="100vw" unoptimized/>
                                                {/* Premium Overlays */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#111420] via-transparent to-transparent opacity-80" />

                                                {/* Platform Float Badge */}
                                                <div className="absolute top-4 left-4">
                                                    <div className={`px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-xl`}>
                                                        {(() => {
                                                            const pData = platforms.find(p => p.id === video.platform?.toUpperCase());
                                                            if (!pData) return null;
                                                            const Icon = pData.icon;
                                                            return <Icon className="w-3 h-3 text-white" />;
                                                        })()}
                                                        <span className="text-[9px] font-black tracking-wider text-white/70">{video.platform}</span>
                                                    </div>
                                                </div>

                                                {/* View Count Chip */}
                                                <div className="absolute bottom-4 left-4">
                                                    <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5">
                                                        <Eye className="w-3 h-3 text-cyan-400" />
                                                        <span className="text-[10px] font-bold text-white/90">{formatNumber(video.views_count)}</span>
                                                    </div>
                                                </div>

                                                {/* Play Action Float */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                                    <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center shadow-2xl">
                                                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Meta Section */}
                                            <div className="p-5 flex flex-col flex-1">
                                                {/* Author Card */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="relative w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center font-black text-white text-sm">
                                                        {video.author_name?.[0]?.toUpperCase() || 'V'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{video.author_name}</p>
                                                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter">@{video.author_username}</p>
                                                    </div>
                                                </div>

                                                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 h-8 mb-4" title={video.description}>
                                                    {video.description}
                                                </p>

                                                {/* Real-time Interaction Metrics */}
                                                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <Heart className="w-3.5 h-3.5 text-pink-500/80" />
                                                        <span className="text-[10px] font-bold text-slate-400">{formatNumber(video.likes_count)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MessageCircle className="w-3.5 h-3.5 text-indigo-400/80" />
                                                        <span className="text-[10px] font-bold text-slate-400">{formatNumber(video.comments_count)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Share2 className="w-3.5 h-3.5 text-emerald-400/80" />
                                                        <span className="text-[10px] font-bold text-slate-400">{formatNumber(video.shares_count)}</span>
                                                    </div>
                                                </div>

                                                {/* Final Action Hub */}
                                                <div className="grid grid-cols-1 gap-2 mt-auto">
                                                    {/* Thêm vào Bộ sưu tập */}
                                                    <button
                                                        onClick={() => handleSaveToLibrary(video)}
                                                        disabled={savingIds.has(video.video_id) || savedIds.has(video.video_id)}
                                                        className={`h-10 flex items-center justify-center gap-2 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all duration-300 ${
                                                            savedIds.has(video.video_id)
                                                                ? 'bg-violet-600/20 border-violet-500/40 text-violet-400 cursor-default'
                                                                : 'bg-white/5 border-white/10 hover:bg-violet-600/20 hover:border-violet-500/40 hover:text-violet-300 text-slate-300'
                                                        }`}
                                                    >
                                                        {savingIds.has(video.video_id) ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : savedIds.has(video.video_id) ? (
                                                            <BookmarkCheck className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Bookmark className="w-3.5 h-3.5" />
                                                        )}
                                                        {savedIds.has(video.video_id) ? 'Đã lưu' : 'Bộ sưu tập'}
                                                    </button>
                                                    <a
                                                        href={video.video_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="py-2.5 bg-slate-900 border border-white/5 hover:border-white/10 text-slate-500 hover:text-white rounded-xl text-[9px] font-bold tracking-widest text-center transition-all uppercase"
                                                    >
                                                        Mở Video
                                                    </a>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Pagination UI */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-3 mt-10">
                                        <button
                                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {[...Array(totalPages)].map((_, i) => {
                                                const page = i + 1;
                                                // Only show first, last, and pages around current
                                                if (
                                                    page === 1 ||
                                                    page === totalPages ||
                                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => handlePageChange(page)}
                                                            className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${currentPage === page
                                                                ? `bg-gradient-to-br ${platforms.find(p => p.id === platform)?.color} text-white shadow-lg`
                                                                : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 border border-white/10'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                } else if (
                                                    page === currentPage - 2 ||
                                                    page === currentPage + 2
                                                ) {
                                                    return <span key={page} className="text-slate-600">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>

                                        <button
                                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty-state"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 rounded-[4rem]"
                            >
                                <div className="relative group/search mb-10">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
                                    <div className="relative w-24 h-24 bg-[#111420] rounded-full flex items-center justify-center border border-white/10 shadow-2xl transition-transform group-hover/search:scale-110">
                                        <Search className="w-10 h-10 text-blue-400" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black italic tracking-tighter text-white mb-4">ENGINE STANDBY</h3>
                                <p className="text-slate-500 text-center max-w-sm font-medium leading-relaxed">
                                    Hệ thống sẵn sàng thu thập dữ liệu xu hướng. Hãy chọn một nền tảng và khởi chạy chiến dịch quét ngay bây giờ.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ===== SCAN NEXT BATCH Button (Douyin + Instagram) ===== */}
                    {(platform === 'DOUYIN' || platform === 'INSTAGRAM' || platform === 'TIKTOK') && results.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-center mt-8"
                        >
                            <button
                                onClick={handleNextBatch}
                                disabled={loadingMore}
                                className="group relative h-12 px-10 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {/* Gradient theo platform */}
                                <div className={`absolute inset-0 bg-gradient-to-r ${platform === 'INSTAGRAM'
                                    ? 'from-[#833ab4] via-[#fd1d1d] to-[#fcb045]'
                                    : 'from-[#25F4EE] to-[#FE2C55]'
                                    } transition-transform duration-500 group-hover:scale-110`} />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center gap-2.5 text-white">
                                    {loadingMore ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-xs font-black tracking-widest uppercase">Đang quét batch {batchIndex + 1}...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span className="text-xs font-black tracking-widest uppercase">Scan Next Batch #{batchIndex + 1}</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>

            <style jsx global>{`
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
