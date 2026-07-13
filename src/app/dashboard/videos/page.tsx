'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  createdAt: string;
  duplicate: {
    status: string;
    isMaster: boolean;
    similarityScore: number;
  };
  posts: Array<{
    platform: string;
    postedAt: string;
  }>;
}

export default function VideosListPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/my-videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setVideos(result.videos);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      UNIQUE: 'bg-green-100 text-green-800',
      DUPLICATE: 'bg-red-100 text-red-800',
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
      SUSPICIOUS: 'bg-orange-100 text-orange-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Videos</h1>
        <Link
          href="/dashboard/videos/upload"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
        >
          + Upload Video
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No videos yet</h3>
          <p className="text-gray-500 mb-4">Upload your first video to get started</p>
          <Link
            href="/dashboard/videos/upload"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
          >
            Upload Video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {/* Video Thumbnail Placeholder */}
              <div className="bg-gray-200 h-48 flex items-center justify-center">
                <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* Video Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg line-clamp-2 flex-1">{video.title}</h3>
                  {video.duplicate.isMaster && (
                    <svg className="w-5 h-5 text-yellow-500 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>

                {video.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                )}

                <div className="flex items-center justify-between mb-3">
                  {getStatusBadge(video.duplicate.status)}
                  {video.duration && (
                    <span className="text-xs text-gray-500">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Platforms */}
                {video.posts.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Published on:</p>
                    <div className="flex flex-wrap gap-1">
                      {video.posts.map((post, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          {post.platform}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  Uploaded: {new Date(video.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
