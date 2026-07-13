'use client';

import Image from "next/image";
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Facebook, Users, FileText, AlertCircle, CheckCircle, Video, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface FacebookPost {
  id: string;
  text?: string;
  url?: string;
  time?: string;
  timestamp?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  isVideo?: boolean;
  thumbnail?: string;
}

interface FacebookVideo {
  id: string;
  url: string;
  thumbnail: string;
  text: string;
  likes: number;
  comments: number;
  shares: number;
  time: string;
}

interface FacebookImage {
  id: string;
  url: string;
  thumbnail: string;
  text: string;
  likes: number;
  comments: number;
  shares: number;
  time: string;
}

interface FacebookAnalysisResult {
  type: 'page' | 'profile' | 'group';
  method: 'graph_api' | 'apify';
  name: string;
  identifier: string;
  followers_count: number | null;
  posts_count: number;
  posts: FacebookPost[];
  videos?: FacebookVideo[];
  images?: FacebookImage[];
  metadata: {
    user_profile_pic?: string;
    user_profile_url?: string;
    note?: string;
    fetched_posts?: number;
    videos_count?: number;
    images_count?: number;
  };
}

export default function FacebookAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FacebookAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'videos' | 'images'>('all');
  const [timeRange, setTimeRange] = useState('7_days'); // Default 7 days

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Vui lòng nhập URL Facebook');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // Determine max posts based on time range to ensure we cover the period
    // User requested "unlimited" scan to ensure accuracy for the period
    const maxPosts = 9999;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${baseUrl}/video-management/facebook/analyze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          max_posts: maxPosts,
          force_method: 'apify',
          period: timeRange
        }),
      });

      const data = await response.json() as {
        success: boolean;
        data?: FacebookAnalysisResult;
        error?: string;
      };

      if (data.success && data.data) {
        setResult(data.data);
        setActiveTab('all');
      } else {
        setError(data.error || 'Không thể phân tích URL');
      }
    } catch (err) {
      setError('Lỗi kết nối đến server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'page':
        return 'Trang Facebook';
      case 'profile':
        return 'Trang Cá Nhân';
      case 'group':
        return 'Nhóm Facebook';
      default:
        return type;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'graph_api':
        return 'Graph API';
      case 'apify':
        return 'Apify';
      default:
        return method;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPosts = () => {
    if (!result) return null;

    let postsToShow: (FacebookPost | FacebookVideo | FacebookImage)[] = [];

    if (activeTab === 'all') {
      postsToShow = result.posts || [];
    } else if (activeTab === 'videos') {
      postsToShow = result.videos || [];
    } else if (activeTab === 'images') {
      postsToShow = result.images || [];
    }

    if (postsToShow.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Không có {activeTab === 'videos' ? 'video' : activeTab === 'images' ? 'hình ảnh' : 'bài viết'} nào
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {postsToShow.map((post, index) => (
          <Card key={post.id || index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              {/* Thumbnail */}
              {post.thumbnail && (
                <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={post.thumbnail}
                    alt="Post thumbnail"
                    className="w-full h-48 object-cover"
                   width={0} height={0} sizes="100vw" unoptimized/>
                  {('isVideo' in post && post.isVideo) && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Video
                    </div>
                  )}
                </div>
              )}

              {/* Text */}
              <p className="text-sm mb-3 line-clamp-3">
                {post.text || 'Không có nội dung'}
              </p>

              {/* Stats */}
              <div className="flex gap-4 mb-3 text-xs text-gray-600">
                <span>👍 {post.likes?.toLocaleString() || 0}</span>
                <span>💬 {post.comments?.toLocaleString() || 0}</span>
                <span>🔄 {post.shares?.toLocaleString() || 0}</span>
              </div>

              {/* Time & Link */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(post.time)}</span>
                {post.url && (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    Xem <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-6 w-6 text-blue-600" />
            Phân Tích Facebook
          </CardTitle>
          <CardDescription>
            Nhập URL Facebook Page hoặc User Profile để phân tích
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="facebook-url">URL Facebook</Label>
                <Input
                  id="facebook-url"
                  type="url"
                  placeholder="https://www.facebook.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-range">Thời gian</Label>
                <select
                  id="time-range"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  disabled={loading}
                >
                  <option value="yesterday">Hôm qua</option>
                  <option value="7_days">7 ngày qua</option>
                  <option value="30_days">30 ngày qua</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!url.trim()}
              isLoading={loading}
              className="w-full"
            >
              {loading ? 'Đang phân tích dữ liệu...' : 'Bắt đầu Thống kê'}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Success Alert */}
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Phân tích thành công! Phương thức: <strong>{getMethodLabel(result.method)}</strong>
                </AlertDescription>
              </Alert>

              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-3">
                    {result.metadata.user_profile_pic && (
                      <Image
                        src={result.metadata.user_profile_pic}
                        alt={result.name}
                        className="w-12 h-12 rounded-full"
                       width={0} height={0} sizes="100vw" unoptimized/>
                    )}
                    <div>
                      <div>{result.name || 'N/A'}</div>
                      <div className="text-sm font-normal text-gray-500">
                        {getTypeLabel(result.type)}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {(result.followers_count || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.posts_count.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Bài viết</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {(result.metadata.videos_count || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Videos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(result.metadata.images_count || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Hình ảnh</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <div className="flex gap-2 border-b">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 font-medium transition-colors ${activeTab === 'all'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <FileText className="inline h-4 w-4 mr-1" />
                  Tất cả ({result.posts_count})
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`px-4 py-2 font-medium transition-colors ${activeTab === 'videos'
                      ? 'border-b-2 border-red-600 text-red-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Video className="inline h-4 w-4 mr-1" />
                  Videos ({result.metadata.videos_count || 0})
                </button>
                <button
                  onClick={() => setActiveTab('images')}
                  className={`px-4 py-2 font-medium transition-colors ${activeTab === 'images'
                      ? 'border-b-2 border-green-600 text-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <ImageIcon className="inline h-4 w-4 mr-1" />
                  Hình ảnh ({result.metadata.images_count || 0})
                </button>
              </div>

              {/* Posts Grid */}
              {renderPosts()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
