'use client';

import NextImage from "next/image";
import { useState } from 'react';
import { Image as ImageIcon, Film, LayoutGrid, BarChart3, X, Play, Heart, MessageCircle, Eye, Calendar, ExternalLink } from 'lucide-react';

interface InstagramPostingStatsProps {
  videos: any[];
}

export default function InstagramPostingStats({ videos }: InstagramPostingStatsProps) {
  const [selectedType, setSelectedType] = useState<'posts' | 'reels' | 'all' | null>(null);

  // Separate posts and reels based on type/is_video field
  const reels = videos.filter(v => 
    v.type === 'video' || v.type === 'reel' || v.is_video === true || v.video_url
  );
  const posts = videos.filter(v => 
    !v.is_video && !v.video_url && v.type !== 'video' && v.type !== 'reel'
  );
  const total = videos.length;

  const getDetailItems = () => {
    switch (selectedType) {
      case 'posts': return posts;
      case 'reels': return reels;
      case 'all': return videos;
      default: return [];
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-bold text-slate-900">Posting Activity</h3>
        </div>

        <div className="space-y-4">
          {/* Posts */}
          <div 
            onClick={() => setSelectedType('posts')}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:border-orange-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Posts</p>
                <p className="text-xs text-slate-500">Ảnh & Carousel</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900">{posts.length}</span>
          </div>

          {/* Reels */}
          <div 
            onClick={() => setSelectedType('reels')}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Reels</p>
                <p className="text-xs text-slate-500">Video ngắn</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900">{reels.length}</span>
          </div>

          {/* Total */}
          <div 
            onClick={() => setSelectedType('all')}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:from-pink-100 hover:to-purple-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Tổng cộng</p>
                <p className="text-xs text-slate-500">Tất cả nội dung</p>
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">{total}</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedType(null)}>
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedType === 'posts' && `📷 Posts (${posts.length})`}
                {selectedType === 'reels' && `🎬 Reels (${reels.length})`}
                {selectedType === 'all' && `📊 Tất cả nội dung (${total})`}
              </h3>
              <button 
                onClick={() => setSelectedType(null)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {getDetailItems().length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Không có nội dung nào
                </div>
              ) : (
                <div className="space-y-4">
                  {getDetailItems().map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-lg hover:bg-white transition-all duration-200"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-slate-200">
                        {item.thumbnail_url ? (
                          <NextImage 
                            src={item.thumbnail_url} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/f1f5f9/94a3b8?text=No+Image';
                            }}
                            fill
                            sizes="128px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                            {(item.is_video || item.video_url) ? (
                              <Film className="w-10 h-10 text-slate-400" />
                            ) : (
                              <ImageIcon className="w-10 h-10 text-slate-400" />
                            )}
                          </div>
                        )}
                        {/* Video indicator */}
                        {(item.is_video || item.video_url || item.type === 'video' || item.type === 'reel') && (
                          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
                            <Play className="w-3 h-3 text-white fill-white" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Type badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            (item.is_video || item.video_url || item.type === 'video' || item.type === 'reel')
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {(item.is_video || item.video_url || item.type === 'video' || item.type === 'reel') ? '🎬 Reel' : '📷 Post'}
                          </span>
                          {item.published_at && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.published_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          )}
                        </div>

                        {/* Caption */}
                        <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                          {item.caption || item.title || 'Không có caption'}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-pink-600">
                            <Heart className="w-4 h-4 fill-pink-600" />
                            <span className="font-bold">{formatNumber(item.likes || 0)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-blue-600">
                            <MessageCircle className="w-4 h-4" />
                            <span className="font-bold">{formatNumber(item.comments || 0)}</span>
                          </div>
                          {item.views > 0 && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Eye className="w-4 h-4" />
                              <span className="font-bold">{formatNumber(item.views)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Link button */}
                      <a
                        href={item.url || `https://www.instagram.com/p/${item.short_code || item.video_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white hover:shadow-lg transition-shadow self-center"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
