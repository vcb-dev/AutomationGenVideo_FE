'use client';

import Image from "next/image";
import { useState } from 'react';
import { Play, Heart, Eye, Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InstagramViralVideosProps {
  videos: any[];
}

export default function InstagramViralVideos({ videos }: InstagramViralVideosProps) {
  const COLUMNS = 5;
  const INITIAL_ROWS = 2;
  const LOAD_MORE_ROWS = 5;

  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS * COLUMNS);

  // Instagram: Filter videos with >= 5k views OR >= 5k likes
  const viralVideos = videos.filter(v => {
    const views = Number(v.views_count) || 0;
    const likes = Number(v.likes_count) || 0;
    return views >= 5000 || likes >= 5000;
  })
  // Sort by engagement (views + likes) descending
  .sort((a, b) => {
    const engA = (Number(a.views_count) || 0) + (Number(a.likes_count) || 0);
    const engB = (Number(b.views_count) || 0) + (Number(b.likes_count) || 0);
    return engB - engA;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + (LOAD_MORE_ROWS * COLUMNS));
  };

  if (viralVideos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Viral Videos</h3>
            <p className="text-sm text-slate-500">Videos with 5K+ views or likes</p>
          </div>
        </div>
        <div className="text-center py-8 text-slate-500">
          No viral videos found (5K+ views or likes threshold)
        </div>
      </div>
    );
  }

  const visibleVideos = viralVideos.slice(0, visibleCount);
  const hasMore = visibleCount < viralVideos.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Viral Videos</h3>
            <p className="text-sm text-slate-500">{viralVideos.length} videos with 5K+ views or likes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AnimatePresence>
          {visibleVideos.map((video, idx) => (
            <motion.div 
              key={video.video_id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: (idx % (LOAD_MORE_ROWS * COLUMNS)) * 0.05 }}
              className="group relative bg-slate-50 rounded-xl overflow-hidden border border-slate-100 hover:shadow-md transition-all cursor-pointer"
              onClick={() => window.open(video.url || `https://www.instagram.com/p/${video.short_code || video.video_id}/`, '_blank')}
            >
              {/* Thumbnail */}
              <div className="aspect-[9/16] relative bg-gradient-to-br from-pink-100 to-purple-100">
                {video.thumbnail_url ? (
                  <Image 
                    src={video.thumbnail_url} 
                    alt={video.title || 'Video thumbnail'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                   width={0} height={0} sizes="100vw" unoptimized/>
                ) : null}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                {/* Rank Badge */}
                <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500 backdrop-blur-sm rounded-full">
                  <span className="text-xs font-bold text-white">#{idx + 1}</span>
                </div>

                {/* Viral Badge */}
                {(Number(video.views_count) >= 5000 || Number(video.likes_count) >= 5000) && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full">
                    <span className="text-[9px] font-bold text-white">VIRAL</span>
                  </div>
                )}
              </div>

              {/* Content info */}
              <div className="p-3">
                <h4 className="font-medium text-slate-900 line-clamp-2 text-xs mb-2 min-h-[32px] leading-relaxed">
                  {video.title || video.description?.slice(0, 50) || 'No caption'}
                </h4>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(video.published_at)}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="text-center p-1.5 bg-white rounded border border-slate-100">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Eye className="w-3 h-3 text-purple-500" />
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Views</p>
                    </div>
                    <p className="font-bold text-slate-900 text-xs">{formatNumber(video.views_count || 0)}</p>
                  </div>
                  <div className="text-center p-1.5 bg-white rounded border border-slate-100">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Heart className="w-3 h-3 text-pink-500" />
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Likes</p>
                    </div>
                    <p className="font-bold text-slate-900 text-xs">{formatNumber(video.likes_count || 0)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show More Button */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg shadow-pink-500/20 group"
          >
            Show More Viral Videos
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}
