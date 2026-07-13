'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import { Film, Calendar, CheckCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
  file_url?: string;
  created_at: string;
  duplicate?: {
    status: string;
    is_master: boolean;
    similarity_score?: number;
  };
  posts?: {
    platform: string;
    posted_at: string;
  }[];
}

export default function MyVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyVideos();
  }, []);

  const fetchMyVideos = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${baseUrl}/videos/my-videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch videos');
      }

      setVideos(data.videos || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      UNIQUE: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Unique' },
      DUPLICATE: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle, label: 'Duplicate' },
      PENDING_REVIEW: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'Pending Review' },
      SUSPICIOUS: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle, label: 'Suspicious' },
    };

    const badge = badges[status] || badges.PENDING_REVIEW;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Film className="w-10 h-10 text-blue-500" />
            My Videos
          </h1>
          <p className="text-slate-400 text-lg">
            View and manage all your uploaded videos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Total Videos</p>
              <Film className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-white">{videos.length}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Unique</p>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              {videos.filter(v => v.duplicate?.status === 'UNIQUE').length}
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Duplicates</p>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              {videos.filter(v => v.duplicate?.status === 'DUPLICATE').length}
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Pending Review</p>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              {videos.filter(v => v.duplicate?.status === 'PENDING_REVIEW').length}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700 border-dashed rounded-2xl p-16 text-center">
            <Film className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No videos yet</h3>
            <p className="text-slate-400 mb-6">
              Upload your first video to get started with duplicate detection
            </p>
            <a
              href="/dashboard/video-filter"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Film className="w-5 h-5" />
              Upload Video
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-slate-900 relative overflow-hidden">
                  {video.thumbnail_url ? (
                    <Image
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                     width={0} height={0} sizes="100vw" unoptimized/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-16 h-16 text-slate-700" />
                    </div>
                  )}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs font-medium">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                  {video.duplicate?.is_master && (
                    <div className="absolute top-2 left-2 bg-blue-500 px-2 py-1 rounded text-white text-xs font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Master
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {video.title || 'Untitled Video'}
                  </h3>

                  {video.description && (
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  {/* Status */}
                  <div className="mb-3">
                    {video.duplicate && getStatusBadge(video.duplicate.status)}
                  </div>

                  {/* Similarity Score */}
                  {video.duplicate?.similarity_score !== undefined && video.duplicate.similarity_score < 1 && (
                    <div className="mb-3 bg-slate-900/50 rounded-lg p-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Similarity</span>
                        <span>{(video.duplicate.similarity_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-blue-400 h-full"
                          style={{ width: `${video.duplicate.similarity_score * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Platforms */}
                  {video.posts && video.posts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {video.posts.map((post, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full"
                        >
                          {post.platform}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(video.created_at).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
