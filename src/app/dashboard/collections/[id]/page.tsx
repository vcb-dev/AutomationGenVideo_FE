'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, ExternalLink, Heart, Eye, MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface Video {
  id: number;
  title: string;
  author_username: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
  thumbnail_url: string;
  video_url: string;
  platform: string;
}

interface CollectionVideo {
  id: number;
  video: Video;
  notes: string;
  order: number;
  created_at: string;
}

interface Collection {
  id: number;
  name: string;
  description: string;
  color: string;
  video_count: number;
  collection_videos: CollectionVideo[];
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchCollection();
    }
  }, [params.id]);

  const fetchCollection = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${baseUrl}/ai/collections/${params.id}/`);
      const data = await response.json();
      if (data.success) {
        setCollection(data.collection);
      }
    } catch (error) {
      console.error('Error fetching collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeVideo = async (videoId: number) => {
    if (!confirm('Bạn có chắc muốn xóa video này khỏi bộ sưu tập?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/ai/collections/${params.id}/remove-video/${videoId}/`,
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (data.success) {
        fetchCollection();
      }
    } catch (error) {
      console.error('Error removing video:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold mb-2">Không tìm thấy bộ sưu tập</h3>
        <Link href="/dashboard/collections" className="text-blue-600 hover:underline">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/collections')}
          className="relative z-50 cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>

        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-xl flex-shrink-0"
            style={{ backgroundColor: collection.color }}
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{collection.name}</h1>
            <p className="text-gray-600 mb-2">
              {collection.description || 'Chưa có mô tả'}
            </p>
            <p className="text-sm text-gray-500">
              {collection.video_count} video{collection.video_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {collection.collection_videos.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <h3 className="text-xl font-semibold mb-2">Chưa có video nào</h3>
          <p className="text-gray-600 mb-4">
            Tìm kiếm video và thêm vào bộ sưu tập này
          </p>
          <Link
            href="/dashboard/ai/search"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Tìm kiếm video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collection.collection_videos.map((cv) => (
            <div
              key={cv.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-100">
                {cv.video.thumbnail_url ? (
                  <Image
                    src={cv.video.thumbnail_url}
                    alt={cv.video.title}
                    className="w-full h-full object-cover"
                   width={0} height={0} sizes="100vw" unoptimized/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">
                  {cv.video.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  @{cv.video.author_username}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {formatNumber(cv.video.likes_count)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {formatNumber(cv.video.views_count)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <a
                    href={cv.video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xem
                  </a>
                  <button
                    onClick={() => removeVideo(cv.video.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
