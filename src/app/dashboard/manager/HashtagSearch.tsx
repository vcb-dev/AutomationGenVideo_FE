'use client';

import Image from "next/image";
import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  Search,
  Hash,
  TrendingUp,
  Eye,
  Heart,
  Share2,
  Calendar,
  User,
  Video as VideoIcon,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import GenerateContentButton from '@/components/content/GenerateContentButton';

interface Video {
  id: string;
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  likes: number;
  views: number;
  shares: number;
  created_at: string;
  channel: {
    id: string;
    username: string;
    display_name: string;
    platform: string;
    avatar_url: string;
  };
}

interface SearchResult {
  hashtag: string;
  total_results: number;
  search_period: string;
  videos: Video[];
}

export default function HashtagSearchSection() {
  const { token } = useAuthStore();
  const [hashtag, setHashtag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hashtag.trim()) {
      setError('Vui lòng nhập hashtag');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tracked-channels/manager/search-hashtag?hashtag=${encodeURIComponent(hashtag)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Không thể tìm kiếm hashtag');
      }

      const data = await response.json();
      setSearchResult(data);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tìm kiếm');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setHashtag('');
    setSearchResult(null);
    setError(null);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Hash className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tìm kiếm theo Hashtag</h2>
            <p className="text-sm text-slate-600">Tìm video theo hashtag trong 30 ngày gần nhất</p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              placeholder="Nhập hashtag (ví dụ: trending, viral, funny...)"
              className="w-full pl-12 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
            {hashtag && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !hashtag.trim()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang tìm...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Tìm kiếm
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResult && (
        <div>
          {/* Results Header */}
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Tìm thấy</p>
                <p className="text-2xl font-bold text-purple-900">
                  {searchResult.total_results} video
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Hashtag</p>
                <p className="text-lg font-bold text-purple-700">#{searchResult.hashtag}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Khoảng thời gian</p>
                <p className="text-lg font-semibold text-slate-900">{searchResult.search_period}</p>
              </div>
            </div>
          </div>

          {/* Videos Grid */}
          {searchResult.videos.length === 0 ? (
            <div className="text-center py-12">
              <VideoIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Không tìm thấy video nào với hashtag này</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResult.videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[9/16] bg-slate-100 overflow-hidden">
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title || 'Video thumbnail'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                       width={0} height={0} sizes="100vw" unoptimized/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <VideoIcon className="w-16 h-16 text-slate-300" />
                      </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <VideoIcon className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Channel Info */}
                    <div className="flex items-center gap-2 mb-3">
                      {video.channel.avatar_url ? (
                        <Image
                          src={video.channel.avatar_url}
                          alt={video.channel.display_name}
                          className="w-8 h-8 rounded-full object-cover"
                         width={0} height={0} sizes="100vw" unoptimized/>
                      ) : (
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {video.channel.display_name || video.channel.username}
                        </p>
                        <p className="text-xs text-slate-500">@{video.channel.username}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                      {video.description || video.title || 'Không có mô tả'}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-semibold text-slate-700">
                          {formatNumber(video.likes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-semibold text-slate-700">
                          {formatNumber(video.views)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-semibold text-slate-700">
                          {formatNumber(video.shares)}
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(video.created_at)}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {video.video_url && (
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 bg-purple-600 text-white text-center text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Xem video
                        </a>
                      )}
                      <GenerateContentButton
                        videoId={parseInt(video.id)}
                        videoTitle={video.title || video.description || 'TikTok Video'}
                        className="text-xs py-2"
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
