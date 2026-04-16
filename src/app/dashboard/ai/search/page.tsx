'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, Video, Eye, Heart, MessageCircle, Share2, Music2, Hash, Play, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GenerateContentButton from '@/components/content/GenerateContentButton';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import { useTikTokSearchStore, ScrapedVideo } from '@/store/tiktok-search-store';

export default function TikTokSearchPage() {
  // ── Zustand store — persist khi navigate sang trang khác và quay lại ──
  const {
    searchTerm, setSearchTerm,
    searchType, setSearchType,
    maxPosts, setMaxPosts,
    videos, setVideos,
    currentPage, setCurrentPage,
    normalizedQuery, setNormalizedQuery,
    error, setError,
    loading, setLoading,
    isFetchingMore, setIsFetchingMore,
    taskId, setTaskId,
    searchSessionId, setSearchSessionId,
    reset,
  } = useTikTokSearchStore();

  const [sortType, setSortType] = useState<'general' | 'hot' | 'latest'>('general');
  const itemsPerPage = 8;

  // Calculate Pagination variables
  const totalPages = Math.ceil(videos.length / itemsPerPage);
  // Ensure strict clamping
  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const indexOfLastVideo = safeCurrentPage * itemsPerPage;
  const indexOfFirstVideo = indexOfLastVideo - itemsPerPage;
  const currentVideos = videos.slice(indexOfFirstVideo, indexOfLastVideo);

  // ── Polling Background Task (Celery) ──
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!taskId) return;

      try {
        const token = localStorage.getItem('auth_token');

        const response = await fetch(`/api/search/status/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const data = await response.json();

        if (data.ready) {
          if (data.successful && data.result) {
            const newVideos: ScrapedVideo[] = data.result.results || [];
            setVideos(newVideos);
            if (videos.length === 0) setCurrentPage(1);
          } else {
            setError(data.result?.error || 'Search failed on server');
          }
          setLoading(false);
          setIsFetchingMore(false);
          setTaskId(null);
        }
      } catch (err: any) {
        console.error('Polling error', err);
        setError(err.message || 'Failed to check search status');
        setLoading(false);
        setIsFetchingMore(false);
        setTaskId(null);
      }
    };

    if (taskId && (loading || isFetchingMore)) {
      intervalId = setInterval(checkStatus, 3000); // Polling every 3s
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [taskId, loading, isFetchingMore]);

  const handlePageChange = async (pageNumber: number) => {
    // If user is trying to go beyond current known pages, we need to load more
    if (pageNumber > totalPages) {
      await handleLoadMore();
    } else {
      setCurrentPage(pageNumber);
    }
  };

  const handleLoadMore = async () => {
    // Increase scan limit by 30
    const nextLimit = maxPosts + 30;
    setMaxPosts(nextLimit);
    setIsFetchingMore(true);

    // We start deep scanning
    await handleSearch(false, nextLimit);

    setIsFetchingMore(false);

    // After loading, ideally we go to the next page. 
    // Current page is likely 'totalPages' (before update).
    // We want to move to the next one if data came in.
    setCurrentPage(currentPage + 1);
  };

  const handleSearch = async (reset = true, overrideMaxResult?: number) => {
    if (!searchTerm.trim()) {
      setError('Vui lòng nhập từ khóa');
      return;
    }

    // Chỉ set loading cho search button khi tìm kiếm mới; Scan Next Page chỉ dùng isFetchingMore (set ở handleLoadMore)
    if (reset) setLoading(true);
    if (reset) {
      setError(null);
      setVideos([]);
      setCurrentPage(1);
      setMaxPosts(30); // Reset to 30 for fresh start
      setNormalizedQuery(null);
    }

    try {
      const token = localStorage.getItem('auth_token');

      const limitToUse = overrideMaxResult || (reset ? 30 : maxPosts);

      let currentSessionId = searchSessionId;
      if (reset) {
        currentSessionId = Math.random().toString(36).substring(2, 12);
        setSearchSessionId(currentSessionId);
      }

      let finalKeyword = searchTerm.trim();

      // Handle Hashtag Normalization if searchType is 'hashtag'
      if (searchType === 'hashtag') {
        // Helper to normalize hashtag: remove accents, remove spaces, lowercase, remove #
        const normalizeHashtag = (str: string) => {
          return str.trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/\s+/g, "") // Remove spaces
            .replace(/#/g, ""); // Remove hash
        };

        finalKeyword = normalizeHashtag(searchTerm);
        console.log(`TikTok Search - Original: "${searchTerm}" -> Normalized: "${finalKeyword}"`);

        if (!finalKeyword) {
          setError('Hashtag không hợp lệ sau khi xử lý.');
          setLoading(false);
          return;
        }

        // Update normalized query state for UI feedback
        setNormalizedQuery(finalKeyword);

        // Prepend # for API (or let backend handle it, but here we explicitly format it)
        // If the backend expects # for hashtags, we should add it. 
        // Based on previous code: `searchType === 'hashtag' && !searchTerm.trim().startsWith('#') ? '#' + ...`
        // So let's construct it correctly.
        // Actually, let's keep it simple: normalize it, and pass it. The API body logic below handles adding '#' if missing.
        // Wait, the API body logic below USES `searchTerm`. I need to change that to use `finalKeyword`.
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: platform,
          keyword: searchType === 'hashtag'
            ? `#${finalKeyword}` // Always ensure # for hashtag searches with normalized keyword
            : finalKeyword,      // Or just raw keyword
          max_results: limitToUse,
          search_type: 'posts',
          // Truyền search_mode để backend biết cách filter kết quả:
          // - 'hashtag': TikTok search đúng hashtag, không cần lọc caption thêm
          // - 'keyword': Fetch pool lớn hơn + lọc caption/description chứa keyword
          search_mode: searchType,
          use_cache: false,
          min_views: searchType === 'keyword' ? 1000 : 0,  // Keyword mode: loại video <1K views (spam)
          min_likes: searchType === 'keyword' ? 100 : 0,   // Keyword mode: loại video <100 likes (rác)
          async_mode: false,
          session_id: currentSessionId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      // If async_mode = true, backend returns task_id
      if (data.async_mode && data.task_id) {
        setTaskId(data.task_id);
        // Do not turn off loading here. Polling will handle it.
      } else if (data.success && data.results) {
        // Fallback sync mode
        const newVideos: ScrapedVideo[] = data.results || [];
        setVideos(newVideos);
        setLoading(false);
        setIsFetchingMore(false);
        if (reset) setCurrentPage(1);
      } else {
        if (reset) setVideos([]);
        if (!data.success) throw new Error(data.error || 'No data returned');
        setLoading(false);
        setIsFetchingMore(false);
        setTaskId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search TikTok');
      setLoading(false);
      setIsFetchingMore(false);
      setTaskId(null);
    }
  };


  const formatNumber = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getAvatarUrl = (video: ScrapedVideo) => {
    if (video.raw_data && video.raw_data.author && video.raw_data.author.avatar) {
      return video.raw_data.author.avatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(video.author_name || video.author_username)}&background=random`;
  };

  const platform = 'tiktok'; // Fixed to TikTok only

  // Clear kết quả khi đổi mode để tránh nhầm lẫn kết quả cũ
  const handleSearchTypeChange = (type: 'keyword' | 'hashtag') => {
    if (type === searchType) return;
    setSearchType(type);
    reset(); // clear videos, error, taskId từ Zustand store
    setNormalizedQuery(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border-2 border-[#00f2ea] shadow-[2px_2px_0px_#ff0050]">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              TikTok Search
            </h1>
          </div>
          <p className="text-slate-400 text-lg ml-16">Tìm kiếm nội dung Viral trên các nền tảng mạng xã hội</p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 mb-8 relative"
        >
          {/* Aesthetic Background Blob */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#00f2ea]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#ff0050]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Controls */}
          <div className="flex flex-col gap-4 mb-4 relative z-10">

            {/* Search Type */}
            <div className="flex bg-slate-800 p-1 rounded-xl w-fit">
              <button
                onClick={() => handleSearchTypeChange('keyword')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${searchType === 'keyword'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Search className="w-4 h-4" /> Keyword
              </button>
              <button
                onClick={() => handleSearchTypeChange('hashtag')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${searchType === 'hashtag'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Hash className="w-4 h-4" /> Hashtag
              </button>
            </div>
          </div>

          {/* Search Input with Autocomplete */}
          <div className="relative z-10">
            <SearchAutocomplete
              platform="TIKTOK"
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={() => handleSearch(true)}
              placeholder={searchType === 'keyword' ? 'Nhập từ khóa (vd: mèo cute)...' : 'Nhập hashtag (vd: xuhuong)...'}
              className="mb-3"
            />

            {/* Search Button */}
            <button
              onClick={() => handleSearch(true)}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#00f2ea] to-[#ff0050] text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
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
            className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 mb-8 flex items-center gap-3"
          >
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Normalized Query Feedback */}
        {normalizedQuery && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-2 bg-[#00f2ea]/10 text-[#00f2ea] rounded-lg text-sm inline-flex items-center gap-2 border border-[#00f2ea]/20"
          >
            <Hash className="w-4 h-4" />
            <span>
              {loading ? 'Đang tìm kiếm hashtag: ' : 'Kết quả tìm kiếm cho hashtag: '}
              <strong>#{normalizedQuery}</strong>
            </span>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {videos.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-4 text-slate-400 flex justify-between items-center">
                <div>
                  Tìm thấy <span className="text-[#00f2ea] font-bold">{videos.length}</span> video viral
                </div>
                <div className="text-sm text-slate-500">
                  Trang {safeCurrentPage} / {totalPages || 1}
                </div>
              </div>

              {/* Grid Layout - 8 items per page */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {currentVideos.map((video, index) => {
                  // Debug: log first video to check structure
                  if (index === 0) {
                    console.log('Video data structure:', video);
                  }
                  return (
                    <div
                      key={video.video_id || index}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-[#ff0050]/50 transition-all duration-300 group relative flex flex-col h-full"
                    >
                      {/* Cover */}
                      <div className="relative aspect-[9/16] bg-slate-800 group-hover:scale-[1.02] transition-transform duration-500">
                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                          </div>
                        </div>

                        <Image
                          src={video.thumbnail_url}
                          alt={video.description}
                          className="w-full h-full object-cover"
                          loading='lazy'
                          decoding="async"
                         width={0} height={0} sizes="100vw" unoptimized/>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />

                        {/* Stats Overlay */}
                        <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-between items-end">
                          <div className="flex items-center gap-1 text-white bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
                            <Play className="w-3 h-3 text-[#00f2ea]" />
                            <span className="text-xs font-bold">{formatNumber(video.views_count)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 relative bg-slate-900 z-10 flex flex-col flex-1">
                        {/* Author */}
                        <div className="flex items-center gap-2 mb-3">
                          <Image
                            src={getAvatarUrl(video)}
                            alt=""
                            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                            loading="lazy"
                           width={0} height={0} sizes="100vw" unoptimized/>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate" title={video.author_name}>{video.author_name}</p>
                            <p className="text-xs text-slate-500 truncate">@{video.author_username}</p>
                          </div>
                        </div>

                        <p className="text-sm text-slate-300 line-clamp-2 mb-3 h-10" title={video.description}>{video.description}</p>

                        {/* Metrics */}
                        <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-auto">
                          <div className="flex items-center gap-1 text-slate-400 text-xs" title="Likes">
                            <Heart className="w-3 h-3 text-[#ff0050]" /> {formatNumber(video.likes_count)}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-xs" title="Comments">
                            <MessageCircle className="w-3 h-3 text-white" /> {formatNumber(video.comments_count)}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-xs" title="Shares">
                            <Share2 className="w-3 h-3 text-[#00f2ea]" /> {formatNumber(video.shares_count)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <a
                            href={video.video_url} // Or construct tiktok URL if generic
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Xem
                          </a>
                          <GenerateContentButton
                            videoId={video.id || Math.abs(video.video_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))}
                            videoTitle={video.title || video.description || 'TikTok Video'}
                            videoDescription={[video.description, ...(video.hashtags || []).map((h: string) => `#${h}`)].filter(Boolean).join(' ')}
                            videoUrl={video.video_url || video.download_url || ''}
                            className="text-xs py-2.5"
                            compact={true}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Pagination Controls */}
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isFetchingMore}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;

                  // Show logic: First, Last, Current +/- 1
                  if (totalPages > 7) {
                    if (pageNum !== 1 && pageNum !== totalPages &&
                      (pageNum < safeCurrentPage - 1 || pageNum > safeCurrentPage + 1)) {
                      if (pageNum === safeCurrentPage - 2 || pageNum === safeCurrentPage + 2) {
                        return <span key={pageNum} className="px-2 pt-2 text-slate-500">...</span>;
                      }
                      return null;
                    }
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-4 py-2 rounded-lg transition-colors ${safeCurrentPage === pageNum
                        ? 'bg-[#00f2ea] text-black font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={isFetchingMore}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${currentPage >= totalPages
                    ? 'bg-[#ff0050]/20 hover:bg-[#ff0050]/30 text-[#ff0050] border border-[#ff0050]/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                >
                  {isFetchingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    currentPage >= totalPages ? 'Scan Next Page' : 'Next'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && videos.length === 0 && !error && (
          <div className="text-center py-20 text-slate-500">
            <Music2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nhập từ khóa hoặc hashtag để khám phá TikTok</p>
          </div>
        )}
      </div>
    </div>
  );
}
