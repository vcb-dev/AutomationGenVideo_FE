'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, Search, ChevronLeft, ChevronRight, TrendingUp, Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import VideoCard from '../../../VideoCard';
import { useAuthStore } from '@/store/auth-store';
import { FacebookPage, FacebookVideo, PaginatedVideos, VideoFilters } from '@/types/facebook';
import { facebookService } from '@/services/facebookService';

export default function PageVideosPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const { page_id } = useParams<{ page_id: string }>();

  const [data, setData] = useState<PaginatedVideos | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [minViews, setMinViews] = useState('10000');
  const [minLikes, setMinLikes] = useState('');
  const [hashtagCat, setHashtagCat] = useState<'' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const searchTimerRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    searchTimerRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  const fetchVideos = useCallback(async () => {
    if (!token || !page_id) return;
    setLoading(true);
    try {
      const filters: VideoFilters = {
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        min_views: minViews ? Number(minViews) : undefined,
        min_likes: minLikes ? Number(minLikes) : undefined,
        hashtag_category: hashtagCat || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };
      const result = await facebookService.getPageVideos(token, page_id, filters);
      setData(result);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, page_id, page, debouncedSearch, minViews, minLikes, hashtagCat, dateFrom, dateTo]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handlePlayVideo = useCallback((postId: string) => { setActiveVideoId(postId); }, []);

  const pageInfo = data?.page_info;
  const videos = data?.videos || [];
  const totalPages = data?.total_pages || 1;
  const totalCount = data?.count || 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard/channels/facebook')}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {pageInfo && (
            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
              <img
                src={`https://graph.facebook.com/${pageInfo.page_id}/picture?type=large`}
                alt=""
                className="w-full h-full object-cover"
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  if (pageInfo.avatar_url && target.src !== pageInfo.avatar_url) target.src = pageInfo.avatar_url;
                }}
              />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{pageInfo?.name || 'Videos'}</h1>
            <p className="text-sm text-slate-500">Video &amp; Reels</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <TrendingUp size={16} className="text-emerald-500" />
          <span className="font-semibold text-slate-700">{totalCount}</span> video
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo caption, hashtag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <select
          value={hashtagCat}
          onChange={e => { setHashtagCat(e.target.value as any); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Tất cả loại</option>
          <option value="a1">A1 - Traffic</option>
          <option value="a2">A2 - Knowledge</option>
          <option value="a3">A3 - Credibility</option>
          <option value="a4">A4 - Conversion</option>
          <option value="a5">A5 - Combined</option>
        </select>
        <input type="number" placeholder="Min views" value={minViews} onChange={e => { setMinViews(e.target.value); setPage(1); }} className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <input type="number" placeholder="Min likes" value={minLikes} onChange={e => { setMinLikes(e.target.value); setPage(1); }} className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Đang tải video...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-xl border border-slate-200">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Play size={24} className="text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700">Không tìm thấy video</h3>
          <p className="text-sm text-slate-400 text-center max-w-sm">Thử thay đổi bộ lọc hoặc giảm ngưỡng views.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {videos.map(v => (
              <VideoCard key={v.post_id} video={v} isPlaying={activeVideoId === v.post_id} onPlay={handlePlayVideo} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">Trang {page}/{totalPages} ({totalCount} video)</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={14} /> Trước
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  Sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
