'use client';

import Image from "next/image";
import { useState } from 'react';
import { Play, Heart, MessageCircle, Share2, Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopViralVideosProps {
  videos: any[];
}

export default function TopViralVideos({ videos }: TopViralVideosProps) {
  // Constants for grid layout (assuming 5 columns on desktop now for smaller cards)
  const COLUMNS = 5;
  const INITIAL_ROWS = 2;
  const LOAD_MORE_ROWS = 5;

  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS * COLUMNS);

  // Show ALL videos, sorted by date (newest first)
  const allVideos = [...videos].sort((a, b) => {
    const dateA = new Date(a.published_at || 0).getTime();
    const dateB = new Date(b.published_at || 0).getTime();
    return dateB - dateA;
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

  if (allVideos.length === 0) {
    return null; 
  }

  const visibleVideos = allVideos.slice(0, visibleCount);
  const hasMore = visibleCount < allVideos.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xl">�</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">All Scraped Videos</h3>
            <p className="text-sm text-slate-500">{allVideos.length} videos found</p>
          </div>
        </div>
      </div>

      {/* Denser Grid: More columns, smaller gap */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AnimatePresence>
          {visibleVideos.map((video, idx) => (
            <motion.div 
              key={video.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: (idx % (LOAD_MORE_ROWS * COLUMNS)) * 0.05 }}
              className="group relative bg-slate-50 rounded-xl overflow-hidden border border-slate-100 hover:shadow-md transition-all cursor-pointer"
              onClick={() => window.open(video.video_url, '_blank')}
            >
              {/* Thumbnail */}
              <div className="aspect-[9/16] relative bg-black/5">
                <Image 
                  src={video.thumbnail_url || '/placeholder-video.jpg'} 
                  alt={video.title || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-video.jpg';
                  }}
                 width={0} height={0} sizes="100vw" unoptimized/>
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                
                {/* Play Button Overlay - Smaller */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                {/* Top Rank Badge - Smaller */}
                <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full border border-white/20">
                  <span className="text-xs font-bold text-white">#{idx + 1}</span>
                </div>
              </div>

              {/* Content info - Compact padding */}
              <div className="p-3">
                <h4 className="font-medium text-slate-900 line-clamp-2 text-xs mb-2 min-h-[32px] leading-relaxed">
                  {video.title || video.description || 'No caption'}
                </h4>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(video.published_at)}
                  </div>
                </div>

                {/* Stats Grid - Compact */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="text-center p-1 bg-white rounded border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Views</p>
                    <p className="font-bold text-slate-900 text-xs">{formatNumber(video.views_count)}</p>
                  </div>
                  <div className="text-center p-1 bg-white rounded border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Likes</p>
                    <p className="font-bold text-slate-900 text-xs">{formatNumber(video.likes_count)}</p>
                  </div>
                  <div className="text-center p-1 bg-white rounded border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Eng</p>
                    <p className="font-bold text-emerald-600 text-xs">
                      {/* Approx Engagement Rate */}
                      {video.views_count > 0 
                        ? (((Number(video.likes_count) + Number(video.comments_count) + Number(video.shares_count)) / Number(video.views_count)) * 100).toFixed(1)
                        : '0.0'}%
                    </p>
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
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm group"
          >
            Show More Videos
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}
