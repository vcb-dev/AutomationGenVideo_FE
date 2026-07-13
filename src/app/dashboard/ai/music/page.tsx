'use client';

import Image from "next/image";
import { useState } from 'react';
import { Music, Loader2, Play, Heart, Eye, Download, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Video, MusicPostsRequest } from '@/types/ai';
import aiApiClient from '@/lib/ai-api-client';

export default function MusicPostsPage() {
  const [musicId, setMusicId] = useState('');
  const [count, setCount] = useState<number>(30);
  const [minLikes, setMinLikes] = useState<number | ''>('');
  const [minViews, setMinViews] = useState<number | ''>('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetchPosts = async () => {
    if (!musicId.trim()) {
      setError('Vui lòng nhập Music ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const requestData: MusicPostsRequest = {
        music_id: musicId.trim(),
        count: count,
      };

      if (minLikes && minLikes > 0) {
        requestData.min_likes = Number(minLikes);
      }

      if (minViews && minViews > 0) {
        requestData.min_views = Number(minViews);
      }

      const response = await aiApiClient.post('/api/music/posts', requestData);
      
      if (response.data.videos) {
        setVideos(response.data.videos);
      } else if (response.data.error) {
        setError(response.data.error);
      }
    } catch (err: any) {
      console.error('Music posts error:', err);
      setError(err.response?.data?.error || 'Có lỗi xảy ra khi lấy posts');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Music Posts</h1>
        <p className="text-gray-600 mt-2">Lấy danh sách video sử dụng một bài nhạc cụ thể</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Music ID Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Music ID *
              </label>
              <Input
                type="text"
                placeholder="Ví dụ: 7224128604890990593"
                value={musicId}
                onChange={(e) => setMusicId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFetchPosts()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Nhập Music ID từ TikTok/Douyin
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng video
              </label>
              <Input
                type="number"
                placeholder="30"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                min="1"
                max="100"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Likes tối thiểu (tùy chọn)
              </label>
              <Input
                type="number"
                placeholder="Ví dụ: 1000"
                value={minLikes}
                onChange={(e) => setMinLikes(e.target.value ? Number(e.target.value) : '')}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Views tối thiểu (tùy chọn)
              </label>
              <Input
                type="number"
                placeholder="Ví dụ: 10000"
                value={minViews}
                onChange={(e) => setMinViews(e.target.value ? Number(e.target.value) : '')}
                min="0"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleFetchPosts}
              disabled={loading}
              className="flex items-center gap-2 min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  Lấy Posts
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {videos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Kết quả ({videos.length} video)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  <Image
                    src={video.thumbnail || video.cover}
                    alt={video.title || video.caption}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop';
                    }}
                   width={0} height={0} sizes="100vw" unoptimized/>
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                    <Play className="w-12 h-12 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 px-2 py-1 rounded-lg">
                    <Music className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Title */}
                  <h3 className="font-medium text-gray-900 line-clamp-2 min-h-[3rem]">
                    {video.title || video.caption}
                  </h3>

                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white text-xs font-semibold">
                      {video.channelName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-600 truncate">
                      {video.channelName}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span>{formatNumber(video.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span>{formatNumber(video.views)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(video.url || video.video_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Xem
                    </Button>
                    {video.download_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(video.download_url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Tải
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nhập Music ID
          </h3>
          <p className="text-gray-600">
            Nhập Music ID để xem tất cả video sử dụng bài nhạc đó
          </p>
        </div>
      )}
    </div>
  );
}
