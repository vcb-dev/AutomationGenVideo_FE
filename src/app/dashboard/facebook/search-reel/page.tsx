'use client';

import Image from "next/image";
import { useState, useCallback } from 'react';
import { Search, Loader2, Facebook, Film, ThumbsUp, MessageCircle, Share2, Eye, Download, Play, AlertTriangle, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FacebookReel {
    id?: number;
    platform: string;
    video_id: string;
    title: string;
    description: string;
    author_username: string;
    author_name: string;
    likes_count: number;
    views_count: number;
    comments_count: number;
    shares_count: number;
    video_url: string;
    download_url: string;
    thumbnail_url: string;
    published_at: string;
    raw_data: any;
}

export default function FacebookSearchReelPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'keyword' | 'hashtag'>('keyword');
    const [loading, setLoading] = useState(false);
    const [reels, setReels] = useState<FacebookReel[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

    const handleImageError = useCallback((reelId: string) => {
        setFailedImages(prev => new Set(prev).add(reelId));
    }, []);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const totalPages = Math.ceil(reels.length / itemsPerPage);
    const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
    const indexOfLastReel = safeCurrentPage * itemsPerPage;
    const indexOfFirstReel = indexOfLastReel - itemsPerPage;
    const currentReels = reels.slice(indexOfFirstReel, indexOfLastReel);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setError('Vui lòng nhập từ khóa tìm kiếm');
            return;
        }

        setLoading(true);
        setError(null);
        setReels([]);
        setCurrentPage(1);

        try {
            const baseUrl = '/api';
            const token = localStorage.getItem('auth_token');

            const keyword = searchType === 'hashtag'
                ? searchTerm.replace(/^#/, '').replace(/\s+/g, '').toLowerCase()
                : searchTerm.trim();

            const response = await fetch(`${baseUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    platform: 'facebook',
                    keyword,
                    search_type: 'reels',
                    search_mode: searchType,
                    min_likes: 0,
                    min_views: 0,
                    min_comments: 0,
                    max_results: 5,
                    page: 1,
                    use_cache: false,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.detail || 'Search failed');
            }

            setReels(data.results || data.videos || []);
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tìm kiếm reels.');
            setReels([]);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const getAvatarUrl = (reel: FacebookReel) => {
        const owner = reel.raw_data?.video_owner_profile;
        if (owner?.displayPicture?.uri) return owner.displayPicture.uri;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(reel.author_name || reel.author_username)}&background=1877F2&color=fff`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Film className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Search Reel
                        </h1>
                    </div>
                    <p className="text-slate-600 text-lg ml-16">Tìm kiếm Facebook Reels & Videos theo keyword hoặc hashtag</p>
                </motion.div>

                {/* Search Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 mb-8 shadow-xl"
                >
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="flex p-1 rounded-xl w-fit gap-1">
                            <button
                                onClick={() => setSearchType('keyword')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${searchType === 'keyword'
                                    ? 'bg-white text-blue-600 shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Search className="w-4 h-4" /> Keyword
                            </button>
                            <button
                                onClick={() => setSearchType('hashtag')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${searchType === 'hashtag'
                                    ? 'bg-white text-blue-600 shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Hash className="w-4 h-4" /> Hashtag
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 italic">* Keyword: tìm trên Facebook Watch. Hashtag: tìm theo #hashtag.</p>
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={searchType === 'hashtag' ? 'Nhập hashtag (vd: #trangsuc, #travel)...' : 'Nhập từ khóa (vd: trang sức, helicopter)...'}
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 active:scale-95"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang tìm...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Tìm Kiếm
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8 flex items-center gap-3"
                    >
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <p className="text-red-700">{error}</p>
                    </motion.div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {reels.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="mb-4 text-slate-600 flex justify-between items-center">
                                <div>
                                    Tìm thấy <span className="text-blue-600 font-bold">{reels.length}</span> reels/videos
                                </div>
                                <div className="text-sm text-slate-500">
                                    Trang {safeCurrentPage} / {totalPages || 1}
                                </div>
                            </div>

                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentReels.map((reel, index) => (
                                    <div
                                        key={reel.video_id || index}
                                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400/50 hover:shadow-xl transition-all duration-300 group flex flex-col"
                                    >
                                        <div className="relative aspect-[9/16] bg-slate-100 group-hover:scale-[1.02] transition-transform duration-500 overflow-hidden">
                                            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
                                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                                </div>
                                            </div>

                                            {reel.thumbnail_url && !failedImages.has(reel.video_id || String(index)) ? (
                                                <Image
                                                    src={reel.thumbnail_url}
                                                    alt={reel.description}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    onError={() => handleImageError(reel.video_id || String(index))}
                                                 width={0} height={0} sizes="100vw" unoptimized/>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                                    <Film className="w-12 h-12 opacity-50" />
                                                    <span className="text-xs">Reel</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

                                            <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-between items-end">
                                                <div className="flex items-center gap-1 text-white bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
                                                    <Eye className="w-3 h-3 text-blue-400" />
                                                    <span className="text-xs font-bold">{formatNumber(reel.views_count)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Image
                                                    src={getAvatarUrl(reel)}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reel.author_name || reel.author_username || '?')}&background=1877F2&color=fff`;
                                                    }}
                                                 width={0} height={0} sizes="100vw" unoptimized/>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate" title={reel.author_name}>
                                                        {reel.author_name || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">@{reel.author_username || '—'}</p>
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-700 line-clamp-2 mb-3 h-10" title={reel.description || reel.title}>
                                                {reel.description || reel.title || 'Không có mô tả.'}
                                            </p>

                                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto text-xs text-slate-500">
                                                <span title="Views"><Eye className="w-3 h-3 inline mr-1" />{formatNumber(reel.views_count)}</span>
                                                <span title="Likes"><ThumbsUp className="w-3 h-3 inline mr-1" />{formatNumber(reel.likes_count)}</span>
                                                <span title="Comments"><MessageCircle className="w-3 h-3 inline mr-1" />{formatNumber(reel.comments_count)}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <a
                                                    href={reel.video_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> Xem
                                                </a>
                                                <a
                                                    href={reel.download_url || reel.video_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Download className="w-3.5 h-3.5" /> Tải
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>

                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handlePageChange(i + 1)}
                                            className={`px-4 py-2 rounded-lg transition-colors ${safeCurrentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage >= totalPages}
                                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!loading && reels.length === 0 && !error && (
                    <div className="text-center py-20 text-slate-500">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Film className="w-8 h-8 text-blue-600 opacity-50" />
                        </div>
                        <p>Nhập từ khóa hoặc hashtag để tìm kiếm Facebook Reels & Videos</p>
                    </div>
                )}
            </div>
        </div>
    );
}
