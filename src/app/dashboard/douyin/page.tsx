'use client';

import Image from "next/image";
import { useState } from 'react';
import {
  Search, Loader2, AlertTriangle, Video, Eye, Heart, MessageCircle,
  Share2, User, Music, Hash, Plus, Check, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface DouyinVideo {
  video_id: string;
  caption: string;
  hashtags: string[];
  views_count: number | null;
  likes_count: number | null;
  comments_count: number;
  shares_count: number;
  author_username: string;
  author_name: string;
  author_avatar: string;
  video_url: string;
  thumbnail_url: string;
  music_title: string;
  published_at: string | null;
}

const ITEMS_PER_PAGE = 9;   // 3 cột × 3 hàng
const BATCH_SIZE = 30;       // fetch 30 mỗi lần để tiết kiệm credits (đã tối ưu variety ở BE)

export default function DouyinScraperPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'keyword' | 'hashtag'>('keyword');
  const [loading, setLoading] = useState(false);
  const [scanningNext, setScanningNext] = useState(false);
  const [allVideos, setAllVideos] = useState<DouyinVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [trackedChannels, setTrackedChannels] = useState<Set<string>>(new Set());
  const [followingChannels, setFollowingChannels] = useState<Set<string>>(new Set());
  const [seenVideoIds, setSeenVideoIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination
  const totalPages = Math.ceil(allVideos.length / ITEMS_PER_PAGE);
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const pageEnd = pageStart + ITEMS_PER_PAGE;
  const visibleVideos = allVideos.slice(pageStart, pageEnd);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleFollowChannel = async (video: DouyinVideo) => {
    const username = video.author_username.replace('@', '').trim();
    if (followingChannels.has(username) || trackedChannels.has(username)) return;
    setFollowingChannels(prev => new Set(prev).add(username));
    try {
      const authorVideos = allVideos.filter(v => v.author_username.replace('@', '').trim() === username);
      const totalViews = authorVideos.reduce((sum, v) => sum + (v.views_count || 0), 0);
      const totalLikes = authorVideos.reduce((sum, v) => sum + (v.likes_count || 0), 0);
      await apiClient.post('/tracked-channels', {
        platform: 'DOUYIN',
        username,
        display_name: video.author_name || username,
        avatar_url: video.author_avatar || null,
        total_followers: 0,
        total_likes: totalLikes,
        total_views: totalViews,
        total_videos: authorVideos.length,
        posts_count: authorVideos.length,
        engagement_rate: 0,
      });
      setTrackedChannels(prev => new Set(prev).add(username));
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi theo dõi kênh');
    } finally {
      setFollowingChannels(prev => { const next = new Set(prev); next.delete(username); return next; });
    }
  };

  const hasLatinOrVietnamese = (text: string) => /[a-zA-Z\u00C0-\u1EF9]/.test(text);
  const needsTranslation = searchType === 'keyword' && hasLatinOrVietnamese(searchTerm.trim());
  const canSearch = !needsTranslation;

  const handleSearchTypeChange = (type: 'keyword' | 'hashtag') => {
    if (type === searchType) return;
    setSearchType(type);
    setAllVideos([]);
    setSeenVideoIds(new Set());
    setCurrentPage(1);
    setHasSearched(false);
    setError(null);
  };

  const fetchVideos = async (isLoadMore = false) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${apiUrl}/douyin/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchTerm: searchTerm.trim(),
        searchType,
        maxPosts: BATCH_SIZE,
        sortBy: 'general',  // mix viral + recent → backend sẽ sort trend
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Search failed');
    return (data.data?.videos || []) as DouyinVideo[];
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) { setError('Vui lòng nhập từ khóa hoặc hashtag'); return; }
    if (!canSearch) return;

    setLoading(true);
    setError(null);
    setAllVideos([]);
    setSeenVideoIds(new Set());
    setCurrentPage(1);
    setHasSearched(true);

    // Pre-search Translation
    let finalTerm = searchTerm.trim();
    if (searchType === 'keyword' && /[a-zA-Z\u00C0-\u1EF9]/.test(finalTerm)) {
      try {
        const transRes = await fetch('/api/translate-chinese', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: finalTerm }),
        });
        if (transRes.ok) {
          const transData = await transRes.json();
          if (transData.success && transData.translated) {
            finalTerm = transData.translated;
            setSearchTerm(finalTerm);
          }
        }
      } catch { /* ignore */ }
    }

    try {
      const videos = await fetchVideos(false);
      const uniqueIds = new Set(videos.map(v => v.video_id));
      setAllVideos(videos);
      setSeenVideoIds(uniqueIds);
    } catch (err: any) {
      setError(err.message || 'Failed to search Douyin');
    } finally {
      setLoading(false);
    }
  };

  const scanNextBatch = async () => {
    if (!searchTerm.trim() || scanningNext) return;
    setScanningNext(true);
    setError(null);
    try {
      const videos = await fetchVideos(true);
      // Dedup: bỏ video đã thấy
      const newVideos = videos.filter(v => !seenVideoIds.has(v.video_id));
      if (newVideos.length === 0) {
        setError('Không tìm thấy video mới. Thử tìm kiếm lại.');
        return;
      }
      setAllVideos(prev => {
        const updated = [...prev, ...newVideos];
        // Nhảy đến trang cuối cùng để xem batch mới
        const newTotalPages = Math.ceil(updated.length / ITEMS_PER_PAGE);
        setCurrentPage(newTotalPages);
        return updated;
      });
      setSeenVideoIds(prev => {
        const next = new Set(prev);
        newVideos.forEach(v => next.add(v.video_id));
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to scan next batch');
    } finally {
      setScanningNext(false);
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 mb-2">
            🎶 Douyin Scraper
          </h1>
          <p className="text-slate-400 text-lg">Tìm kiếm video Douyin theo keyword hoặc hashtag • Phân trang tích lũy</p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 mb-8"
        >
          {/* Search Type Toggle */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleSearchTypeChange('keyword')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${searchType === 'keyword'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Search className="w-4 h-4 inline mr-2" />Keyword
            </button>
            <button
              onClick={() => handleSearchTypeChange('hashtag')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${searchType === 'hashtag'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Hash className="w-4 h-4 inline mr-2" />Hashtag
            </button>
          </div>

          {/* Search Input */}
          <div className="relative z-10">
            <SearchAutocomplete
              platform="DOUYIN"
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={handleSearch}
              placeholder={searchType === 'keyword' ? 'Nhập từ khóa (tiếng Việt)...' : 'Nhập hashtag (không cần #)...'}
              className="mb-4"
            />
            {needsTranslation && (
              <p className="text-amber-400/90 text-sm mb-3">
                Đang chờ dịch sang tiếng Trung... Nhập xong và đợi vài giây.
              </p>
            )}
            <button
              onClick={handleSearch}
              disabled={loading || !canSearch}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Đang tìm...</> : <><Search className="w-5 h-5" />Tìm kiếm</>}
            </button>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 mb-8 flex items-center gap-3"
            >
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {allVideos.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Result header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-slate-300 font-semibold">
                    Tìm thấy <span className="text-red-400 font-bold">{allVideos.length}</span> video
                  </span>
                  {totalPages > 1 && (
                    <span className="text-slate-500 text-sm ml-3">— Trang {safePage}/{totalPages}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Hiển thị {pageStart + 1}–{Math.min(pageEnd, allVideos.length)} / {allVideos.length}
                </div>
              </div>

              {/* Video Grid */}
              <motion.div
                key={safePage}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
              >
                {visibleVideos.map((video) => {
                  const username = video.author_username.replace('@', '').trim();
                  const isTracked = trackedChannels.has(username);
                  const isFollowing = followingChannels.has(username);
                  return (
                    <div
                      key={video.video_id}
                      className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 group flex flex-col h-full"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-[9/16] bg-slate-800 group-hover:opacity-95 transition-opacity">
                        {video.thumbnail_url ? (
                          <Image
                            src={video.thumbnail_url}
                            alt={video.caption}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            fill
                            sizes="(max-width: 1024px) 100vw, 33vw"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-12 h-12 text-slate-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Content */}
                      <div className="p-4 flex flex-col flex-1">
                        {/* Author */}
                        <div className="flex items-center gap-2 mb-3">
                          {video.author_avatar ? (
                            <Image src={video.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover" loading="lazy" width={32} height={32} unoptimized />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{video.author_name}</p>
                            <p className="text-xs text-slate-500 truncate">@{video.author_username}</p>
                          </div>
                        </div>

                        {/* Caption */}
                        <p className="text-sm text-slate-300 line-clamp-2 mb-3 h-10">{video.caption}</p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 mb-3 mt-auto">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Eye className="w-3 h-3" />{formatNumber(video.views_count)}
                          </div>
                          {video.likes_count != null && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Heart className="w-3 h-3" />{formatNumber(video.likes_count)}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <MessageCircle className="w-3 h-3" />{formatNumber(video.comments_count)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Share2 className="w-3 h-3" />{formatNumber(video.shares_count)}
                          </div>
                        </div>

                        {/* Hashtags */}
                        {video.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {video.hashtags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">#{tag}</span>
                            ))}
                          </div>
                        )}

                        {/* Music */}
                        {video.music_title && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                            <Music className="w-3 h-3" /><span className="truncate">{video.music_title}</span>
                          </div>
                        )}

                        {/* Footer Actions */}
                        <div className="flex gap-2 mt-auto pt-3">
                          <a
                            href={video.video_url} target="_blank" rel="noopener noreferrer"
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                          >
                            <Video className="w-4 h-4" /><span>Douyin</span>
                          </a>
                          <button
                            onClick={() => handleFollowChannel(video)}
                            disabled={isTracked || isFollowing}
                            className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:cursor-not-allowed ${isTracked
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : isFollowing
                                ? 'bg-slate-700 text-slate-400 border border-slate-600'
                                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95'
                              }`}
                          >
                            {isTracked ? <><Check className="w-4 h-4 mr-1" /><span>Đã theo dõi</span></>
                              : isFollowing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /><span>Đang lưu...</span></>
                                : <><Plus className="w-4 h-4 mr-1" /><span>Theo dõi</span></>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Pagination + Scan Next Batch */}
              <div className="flex flex-col items-center gap-5 pb-10">
                {/* Page nav */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(safePage - 1)}
                      disabled={safePage === 1}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {renderPageButtons()?.map((p, i) =>
                      p === '...' ? (
                        <span key={`dot-${i}`} className="px-1 text-slate-500 text-sm">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${safePage === p
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-500/30'
                            : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300'
                            }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => handlePageChange(safePage + 1)}
                      disabled={safePage >= totalPages}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Scan Next Batch */}
                <button
                  onClick={scanNextBatch}
                  disabled={scanningNext}
                  className="group flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-red-600/20 to-orange-600/20 hover:from-red-600/40 hover:to-orange-600/40 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20"
                >
                  {scanningNext ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /><span>Đang quét batch mới...</span></>
                  ) : (
                    <><RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                      <span>Scan Next Batch</span>
                      <span className="text-xs bg-red-500/20 px-2 py-0.5 rounded-full">+{BATCH_SIZE} video mới</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-600">
                  Đã tích lũy <span className="text-slate-400">{allVideos.length}</span> video •
                  Trang <span className="text-slate-400">{safePage}/{totalPages}</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[9/16] bg-slate-800" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-slate-700 rounded w-2/3" />
                  <div className="h-2 bg-slate-800 rounded w-full" />
                  <div className="h-2 bg-slate-800 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty: no results */}
        {!loading && allVideos.length === 0 && hasSearched && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-16 text-center"
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Không tìm thấy video nào</h3>
            <p className="text-slate-500">Thử đổi từ khóa hoặc kiểm tra lại chính tả</p>
          </motion.div>
        )}

        {/* Initial state */}
        {!loading && !hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/20 border border-slate-800/40 rounded-3xl p-16 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-300 mb-2">Khám phá Douyin</h3>
            <p className="text-slate-500">Nhập từ khóa hoặc hashtag phía trên để bắt đầu tìm kiếm</p>
          </motion.div>
        )}

      </div>
    </div>
  );
}
