'use client';

import NextImage from "next/image";
import { useState } from 'react';
import { Search, Hash, Loader2, Heart, MessageCircle, Eye, ExternalLink, TrendingUp, AlertTriangle, Image as ImageIcon, Film, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GenerateContentButton from '@/components/content/GenerateContentButton';

interface SearchResult {
    id: number;
    video_id: string;
    video_url: string;
    title: string;
    description: string;
    author_username: string;
    author_name: string;
    likes_count: number;
    views_count: number;
    comments_count: number;
    published_at: string;
    thumbnail_url: string;
    is_video: boolean;
}

const ITEMS_PER_PAGE = 15;
const VIDEOS_PER_BATCH = 15;
const MIN_LIKES = 500;
const MIN_VIEWS = 500;
const MIN_COMMENTS = 50;

export default function InstagramSearchPage() {
    const [hashtag, setHashtag] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [allResults, setAllResults] = useState<SearchResult[]>([]);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [apiPage, setApiPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [filterFallback, setFilterFallback] = useState(false);
    const [searchMode, setSearchMode] = useState<'hashtag' | 'keyword'>('hashtag');
    const [currentPage, setCurrentPage] = useState(1);
    const [normalizedQuery, setNormalizedQuery] = useState('');

    const apiUrl = '/api';

    // Pagination logic
    const totalPages = Math.ceil(allResults.length / ITEMS_PER_PAGE);
    const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
    const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
    const pageEnd = pageStart + ITEMS_PER_PAGE;
    const visibleResults = allResults.slice(pageStart, pageEnd);

    const normalizeHashtag = (str: string) =>
        str.trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '').replace(/#/g, '');

    const getThumbnailSrc = (url: string) => {
        if (!url) return '';
        if (url.startsWith('/')) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return `${apiUrl}/image-proxy/?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    const handleSearchModeChange = (mode: 'hashtag' | 'keyword') => {
        if (mode === searchMode) return;
        setSearchMode(mode);
        setAllResults([]);
        setHasSearched(false);
        setCurrentPage(1);
        setApiPage(1);
        setHasMore(false);
        setFilterFallback(false);
        setError('');
        setNormalizedQuery('');
    };

    const performSearch = async (isLoadMore = false) => {
        if (!hashtag.trim()) {
            setError('Vui lòng nhập hashtag hoặc keyword');
            return;
        }

        const pageToFetch = isLoadMore ? apiPage + 1 : 1;

        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setAllResults([]);
            setCurrentPage(1);
            setApiPage(1);
            setHasSearched(true);
            const nq = searchMode === 'hashtag' ? normalizeHashtag(hashtag) : hashtag.replace(/^#/, '').trim();
            setNormalizedQuery(nq);
        }
        setError('');

        try {
            const token = localStorage.getItem('auth_token');
            const keyword = searchMode === 'hashtag'
                ? normalizeHashtag(hashtag)
                : hashtag.replace(/^#/, '').trim();

            const response = await fetch(`${apiUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    platform: 'instagram',
                    keyword,
                    search_type: 'posts',
                    search_mode: searchMode,
                    min_likes: MIN_LIKES,
                    min_views: MIN_VIEWS,
                    min_comments: MIN_COMMENTS,
                    max_results: VIDEOS_PER_BATCH,
                    page: pageToFetch,
                    use_cache: false,
                    async_mode: false,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.message || 'Search failed');

            const newResults: SearchResult[] = data.videos || data.results || [];
            setHasMore(data.has_more ?? false);
            setFilterFallback(data.filter_fallback ?? false);
            setApiPage(pageToFetch);

            if (isLoadMore) {
                setAllResults(prev => {
                    // Lọc bỏ các video đã tồn tại (dedup theo video_id)
                    const existingIds = new Set(prev.map(r => r.video_id));
                    const uniqueNew = newResults.filter(r => !existingIds.has(r.video_id));
                    const updated = [...prev, ...uniqueNew];
                    const newTotalPages = Math.ceil(updated.length / ITEMS_PER_PAGE);
                    setCurrentPage(newTotalPages);
                    return updated;
                });
            } else {
                setAllResults(newResults);
                setCurrentPage(1);
            }
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tìm kiếm');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const formatNumber = (num: number) => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            const now = new Date();
            const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diff < 60) return 'vừa xong';
            if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
            if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
            return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
        } catch { return 'N/A'; }
    };

    const renderPageButtons = () => {
        if (totalPages <= 1) return null;
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 3) pages.push('...');
            for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
            if (safePage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                            Instagram Posts Search
                        </h1>
                    </div>
                    <p className="text-slate-600 text-lg ml-16">
                        Tìm theo hashtag hoặc keyword • Filter: ≥{MIN_LIKES / 1000}K likes OR ≥{MIN_VIEWS / 1000}K views OR ≥{MIN_COMMENTS} comments
                    </p>
                </motion.div>

                {/* Search Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 mb-8 shadow-xl"
                >
                    {/* Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => handleSearchModeChange('hashtag')}
                            className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${searchMode === 'hashtag'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            # Hashtag
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSearchModeChange('keyword')}
                            className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${searchMode === 'keyword'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            🔍 Keyword
                        </button>
                    </div>

                    {/* Input */}
                    <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 z-10">
                                {searchMode === 'hashtag' ? <Hash className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                            </div>
                            <input
                                type="text"
                                value={hashtag}
                                onChange={(e) => setHashtag(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && performSearch(false)}
                                placeholder={searchMode === 'hashtag' ? 'VD: trangsuc, fashion, beauty...' : 'VD: trang sức, jewelry, thời trang...'}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-700 placeholder-slate-400"
                            />
                        </div>
                        <button
                            onClick={() => performSearch(false)}
                            disabled={loading || !hashtag.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 active:scale-95"
                        >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Đang tìm...</>
                            ) : (
                                <><Search className="w-5 h-5" /> Tìm Kiếm</>
                            )}
                        </button>
                    </div>

                    {/* Quick tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">Phổ biến:</span>
                        {['fashion', 'travel', 'food', 'fitness', 'photography', 'beauty', 'lifestyle'].map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setHashtag(tag)}
                                className="px-3 py-1 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-full text-xs font-medium transition-colors"
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8 flex items-center gap-3"
                        >
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Normalized Query Badge */}
                {normalizedQuery && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-sm"
                    >
                        {searchMode === 'hashtag' ? <Hash className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                        {loading ? 'Đang tìm kiếm: ' : 'Kết quả cho: '}
                        <strong>{searchMode === 'hashtag' ? `#${normalizedQuery}` : normalizedQuery}</strong>
                    </motion.div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {allResults.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Filter fallback banner */}
                            {filterFallback && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-amber-800 text-sm">
                                        ⚠️ Không có bài đạt ngưỡng tối thiểu. Đang hiển thị tất cả {allResults.length} bài tìm được.
                                    </p>
                                </div>
                            )}

                            {/* Result header */}
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <span className="text-slate-700 font-semibold">
                                        Tìm thấy <span className="text-purple-600">{allResults.length}</span> bài viết
                                    </span>
                                    {totalPages > 1 && (
                                        <span className="text-slate-500 text-sm ml-3">
                                            — Trang {safePage}/{totalPages}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400">
                                    Hiển thị {pageStart + 1}–{Math.min(pageEnd, allResults.length)} / {allResults.length}
                                </div>
                            </div>

                            {/* Grid */}
                            <motion.div
                                key={safePage}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25 }}
                                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 mb-8"
                            >
                                {visibleResults.map((post, idx) => (
                                    <div
                                        key={post.video_id || idx}
                                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-purple-400/60 hover:shadow-xl transition-all duration-300 group flex flex-col"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative aspect-square bg-slate-100 overflow-hidden">
                                            {post.thumbnail_url ? (
                                                <NextImage
                                                    src={getThumbnailSrc(post.thumbnail_url)}
                                                    alt={post.description || 'Post'}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        const t = e.target as HTMLImageElement;
                                                        if (t.src?.includes('image-proxy')) {
                                                            t.src = post.thumbnail_url || 'https://placehold.co/400x400?text=No+Image';
                                                        } else {
                                                            t.src = 'https://placehold.co/400x400?text=No+Image';
                                                        }
                                                    }}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 20vw"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                                    <ImageIcon className="w-10 h-10" />
                                                    <span className="text-xs">No image</span>
                                                </div>
                                            )}

                                            {/* Overlay gradient */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />

                                            {/* Media type badge */}
                                            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
                                                {post.is_video
                                                    ? <><Film className="w-3 h-3" /> Video</>
                                                    : <><ImageIcon className="w-3 h-3" /> Photo</>
                                                }
                                            </div>

                                            {/* Stats overlay bottom */}
                                            <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center gap-2">
                                                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px]">
                                                    <Heart className="w-3 h-3 text-pink-400" />
                                                    {formatNumber(post.likes_count)}
                                                </div>
                                                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px]">
                                                    <Eye className="w-3 h-3 text-purple-300" />
                                                    {formatNumber(post.views_count)}
                                                </div>
                                            </div>

                                            {/* Hover CTA */}
                                            <a
                                                href={post.video_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                            >
                                                <div className="bg-white/20 backdrop-blur-md border border-white/30 p-2.5 rounded-full">
                                                    <ExternalLink className="w-5 h-5 text-white" />
                                                </div>
                                            </a>
                                        </div>

                                        {/* Content */}
                                        <div className="p-3 flex flex-col flex-1">
                                            {/* Author */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                    {post.author_username?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">@{post.author_username || 'unknown'}</p>
                                                    <p className="text-[10px] text-slate-400">{formatDate(post.published_at)} trước</p>
                                                </div>
                                            </div>

                                            <p className="text-xs text-slate-600 line-clamp-2 mb-3 flex-1" title={post.description}>
                                                {post.description || post.title || 'Không có caption'}
                                            </p>

                                            {/* Footer stats */}
                                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mb-3 text-[10px] text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Heart className="w-3 h-3 text-pink-500" />
                                                    {formatNumber(post.likes_count)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MessageCircle className="w-3 h-3 text-blue-500" />
                                                    {formatNumber(post.comments_count)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Eye className="w-3 h-3 text-purple-500" />
                                                    {formatNumber(post.views_count)}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <a
                                                    href={post.video_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Xem post
                                                </a>
                                                <GenerateContentButton
                                                    videoId={post.id}
                                                    videoTitle={post.title || post.description || 'Instagram Post'}
                                                    videoDescription={post.description || ''}
                                                    className="text-[11px] py-2"
                                                    compact={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Pagination + Scan Next Batch */}
                            <div className="flex flex-col items-center gap-5 pb-10">
                                {/* Page nav */}
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handlePageChange(safePage - 1)}
                                            disabled={safePage === 1}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>

                                        {renderPageButtons()?.map((p, i) =>
                                            p === '...' ? (
                                                <span key={`dot-${i}`} className="px-1 text-slate-400 text-sm">...</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => handlePageChange(p as number)}
                                                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${safePage === p
                                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30'
                                                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        )}

                                        <button
                                            onClick={() => handlePageChange(safePage + 1)}
                                            disabled={safePage >= totalPages}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Scan Next Batch — luôn hiện để người dùng có thể quét thêm */}
                                <button
                                    onClick={() => performSearch(true)}
                                    disabled={loadingMore}
                                    className="px-7 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    {loadingMore ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Đang quét...</>
                                    ) : (
                                        <><RefreshCw className="w-5 h-5" /> Scan Next Batch (+{VIDEOS_PER_BATCH})</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty: loading skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {Array.from({ length: VIDEOS_PER_BATCH }).map((_, i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
                                <div className="aspect-square bg-slate-200" />
                                <div className="p-3 space-y-2">
                                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                                    <div className="h-2 bg-slate-100 rounded w-full" />
                                    <div className="h-2 bg-slate-100 rounded w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty: no results after search */}
                {!loading && allResults.length === 0 && hasSearched && !error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border border-slate-200 rounded-3xl p-16 text-center"
                    >
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Không tìm thấy bài viết nào</h3>
                        <p className="text-slate-500 mb-5">Thử đổi hashtag hoặc kiểm tra lại chính tả</p>
                        <button
                            onClick={() => { setHashtag(''); setHasSearched(false); setNormalizedQuery(''); }}
                            className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
                        >
                            Thử lại
                        </button>
                    </motion.div>
                )}

                {/* Empty: initial */}
                {!loading && !hasSearched && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-3xl p-16 text-center"
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Hash className="w-10 h-10 text-purple-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Khám phá Instagram Posts</h3>
                        <p className="text-slate-500">Nhập hashtag hoặc keyword phía trên để bắt đầu tìm kiếm</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
