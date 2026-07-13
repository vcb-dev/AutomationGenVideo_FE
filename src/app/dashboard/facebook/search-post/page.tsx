'use client';

import Image from "next/image";
import { useState, useCallback } from 'react';
import { Search, Loader2, Facebook, FileText, ThumbsUp, MessageCircle, Hash, AlertTriangle, Eye, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FacebookPost {
    id: number;
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
    hashtags: string[];
    raw_data: any;
}

export default function FacebookSearchPostPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'keyword' | 'hashtag'>('hashtag');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;
    const [loading, setLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [posts, setPosts] = useState<FacebookPost[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

    const getThumbnailSrc = (url: string | undefined) => {
        if (!url) return '';
        if (url.startsWith('/')) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return `${apiUrl}/media/?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    const handleImageError = useCallback((postId: string) => {
        setFailedImages(prev => new Set(prev).add(postId));
    }, []);

    // Pagination
    const totalPages = Math.ceil(posts.length / itemsPerPage);
    const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
    const indexOfLastPost = safeCurrentPage * itemsPerPage;
    const indexOfFirstPost = indexOfLastPost - itemsPerPage;
    const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearchTypeChange = (type: 'keyword' | 'hashtag') => {
        if (type === searchType) return;
        setSearchType(type);
        setPosts([]);
        setError(null);
        setCurrentPage(1);
        setFailedImages(new Set());
    };

    const handleSearch = async (reset = true) => {
        if (!searchTerm.trim()) {
            setError('Vui lòng nhập từ khóa hoặc hashtag');
            return;
        }

        setLoading(true);
        if (reset) {
            setError(null);
            setPosts([]);
            setCurrentPage(1);
            setFailedImages(new Set()); // Reset failed images khi search mới
        }

        try {
            const token = localStorage.getItem('auth_token');
            const keyword = searchType === 'hashtag'
                ? searchTerm.replace(/^#/, '').replace(/\s+/g, '').toLowerCase()
                : searchTerm.trim();

            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    platform: 'facebook',
                    keyword,
                    search_mode: searchType,
                    search_type: 'posts',
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

            const raw = data.results || data.videos || [];
            // Normalize: handle alternate field names and "No Content" from legacy BE
            const normalized = raw.map((p: any) => {
                const rd = p.raw_data || {};
                const user = rd.user || p.user || rd.author || {};
                const content = _normContent(
                    p.description ?? p.title ?? p.text ?? p.message ??
                    rd.postText ?? rd.text ?? rd.message ?? rd.caption ?? ''
                );
                return {
                    ...p,
                    description: content,
                    title: content,
                    likes_count: _normNum(p.likes_count ?? p.likes ?? p.like_count ?? p.likesCount ?? rd.reactionsCount),
                    comments_count: _normNum(p.comments_count ?? p.comments ?? p.comment_count ?? p.commentsCount ?? rd.commentsCount),
                    shares_count: _normNum(p.shares_count ?? p.shares ?? p.share_count ?? p.sharesCount ?? rd.sharesCount),
                    views_count: _normNum(p.views_count ?? p.views ?? p.view_count ?? p.viewsCount ?? rd.viewsCount),
                    author_name: (p.author_name || user.name || rd.postAuthor || p.pageName || rd.pageName || '').trim(),
                    author_username: (p.author_username || user.username || user.uri_token || user.id || p.pageName || rd.pageName || '').trim(),
                };
            });
            setPosts(normalized);
            if (reset) setCurrentPage(1);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Có lỗi xảy ra khi tìm kiếm.');
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const _normContent = (v: string | undefined | null) => {
        const s = String(v ?? '').trim();
        return (s === '' || s.toLowerCase() === 'no content') ? '' : s;
    };
    const _normNum = (v: number | string | undefined | null) => {
        if (v == null) return 0;
        const n = typeof v === 'number' ? v : parseInt(String(v), 10);
        return isNaN(n) ? 0 : Math.max(0, n);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatNumber = (num: number) => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const getAvatarUrl = (post: FacebookPost) => {
        const rd = post.raw_data || {};
        const user = rd.user || rd.author || {};
        const avatar = user.profilePic || user.profilePicture || user.avatar || user.profile_pic;
        if (avatar) return avatar;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name || post.author_username || '?')}&background=1877F2&color=fff`;
    };

    const extractProductLink = (text: string | null | undefined) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        if (matches && matches.length > 0) {
            const productLinK = matches.find(url => url.includes('shopee') || url.includes('lazada') || url.includes('tiktok') || url.includes('mwc') || url.includes('tiki'));
            return productLinK || matches[0];
        }
        return null;
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
                            <Facebook className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Facebook Search
                        </h1>
                    </div>
                    <p className="text-slate-600 text-lg ml-16">Tìm bài viết có ảnh sản phẩm + caption (link Shopee, Lazada, TikTok Shop…)</p>
                </motion.div>

                {/* Search Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 mb-8 shadow-xl"
                >
                    {/* Search Type Selector */}
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="flex p-1 rounded-xl w-fit gap-1">
                            <button
                                onClick={() => handleSearchTypeChange('keyword')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${searchType === 'keyword'
                                    ? 'bg-white text-blue-600 shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Search className="w-4 h-4" /> Keyword
                            </button>
                            <button
                                onClick={() => handleSearchTypeChange('hashtag')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${searchType === 'hashtag'
                                    ? 'bg-white text-blue-600 shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Hash className="w-4 h-4" /> Hashtag
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 italic">
                            * Keyword: lọc theo caption. Hashtag: tìm theo #hashtag.
                        </p>
                    </div>

                    {/* Search Input */}
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch(true)}
                            placeholder="Nhập từ khóa hoặc hashtag (vd: trang sức, #trangsuc)..."
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <button
                            onClick={() => handleSearch(true)}
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 active:scale-95"
                        >
                            {loading && !isFetchingMore ? (
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
                    {posts.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="mb-4 text-slate-600 flex justify-between items-center">
                                <div>
                                    Tìm thấy <span className="text-blue-600 font-bold">{posts.length}</span> bài viết (ảnh sản phẩm + caption)
                                </div>
                                <div className="text-sm text-slate-500">
                                    Trang {safeCurrentPage} / {totalPages || 1}
                                </div>
                            </div>

                            {/* Grid Layout */}
                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentPosts.map((post, index) => (
                                    <div
                                        key={post.video_id || index}
                                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400/50 hover:shadow-xl transition-all duration-300 group flex flex-col"
                                    >
                                        {/* Ảnh sản phẩm */}
                                        <div className="relative aspect-square bg-slate-100 overflow-hidden">
                                            {post.thumbnail_url && !failedImages.has(post.video_id || String(index)) ? (
                                                <Image
                                                    src={getThumbnailSrc(post.thumbnail_url)}
                                                    alt={post.description}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                    onError={() => handleImageError(post.video_id || String(index))}
                                                 width={0} height={0} sizes="100vw" unoptimized/>
                                            ) : (
                                                <div className="w-full h-full relative">
                                                    {/* Fallback: dùng avatar làm nền mờ */}
                                                    <Image
                                                        src={getAvatarUrl(post)}
                                                        alt={post.author_name || post.author_username}
                                                        className="w-full h-full object-cover blur-sm scale-110"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name || post.author_username || '?')}&background=1877F2&color=fff`;
                                                        }}
                                                     width={0} height={0} sizes="100vw" unoptimized/>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 px-3 text-center bg-black/40">
                                                        <FileText className="w-10 h-10 opacity-80" />
                                                        <span className="text-xs">Ảnh bị chặn. Nhấn &quot;Xem&quot; để xem bài viết trên Facebook</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Caption + CTA */}
                                        <div className="p-4 flex flex-col flex-1">
                                            <p className="text-sm text-slate-700 line-clamp-3 mb-3 flex-1" title={post.description || post.title}>
                                                {_normContent(post.description || post.title) || 'Không có mô tả.'}
                                            </p>

                                            <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                                                <span className="text-slate-400 truncate">{post.author_name || post.author_username}</span>
                                                <span>·</span>
                                                <ThumbsUp className="w-3 h-3 text-blue-500" /> {formatNumber(post.likes_count)}
                                                <MessageCircle className="w-3 h-3 text-green-500 ml-1" /> {formatNumber(post.comments_count)}
                                            </div>

                                            <div className={`grid gap-2 ${extractProductLink(post.description || post.title) ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                                <a
                                                    href={post.video_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1 min-w-0"
                                                >
                                                    <Eye className="w-3.5 h-3.5 flex-shrink-0" /> Xem
                                                </a>
                                                {extractProductLink(post.description || post.title) ? (
                                                    <a
                                                        href={extractProductLink(post.description || post.title) as string}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="col-span-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                                                        title="Mua ngay"
                                                    >
                                                        Mua ngay
                                                    </a>
                                                ) : (
                                                    <a
                                                        href={post.download_url || post.video_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1 min-w-0"
                                                    >
                                                        <Download className="w-3.5 h-3.5" /> Tải
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>

                                    {/* Page Numbers */}
                                    {[...Array(totalPages)].map((_, index) => {
                                        const pageNum = index + 1;

                                        if (totalPages > 7) {
                                            if (
                                                pageNum !== 1 &&
                                                pageNum !== totalPages &&
                                                (pageNum < safeCurrentPage - 1 || pageNum > safeCurrentPage + 1)
                                            ) {
                                                if (pageNum === safeCurrentPage - 2 || pageNum === safeCurrentPage + 2) {
                                                    return (
                                                        <span key={pageNum} className="px-2 pt-2 text-slate-400">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            }
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-4 py-2 rounded-lg transition-colors ${safeCurrentPage === pageNum
                                                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30'
                                                    : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage >= totalPages}
                                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty State */}
                {!loading && posts.length === 0 && !error && (
                    <div className="text-center py-20 text-slate-500">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Facebook className="w-8 h-8 text-blue-600 opacity-50" />
                        </div>
                        <p>Nhập từ khóa hoặc hashtag để tìm bài viết có ảnh sản phẩm + caption</p>
                    </div>
                )}
            </div>
        </div>
    );
}
