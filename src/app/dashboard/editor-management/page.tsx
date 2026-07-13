'use client';

import Image from "next/image";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import {
  Users,
  Video,
  Heart,
  Eye,
  TrendingUp,
  Calendar,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  Music2,
  Instagram,
  Facebook as FacebookIcon,
} from 'lucide-react';

interface ChannelStats {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_videos: number;
  total_followers: number | null;
  total_likes: number;
  total_views: number;
  engagement_rate: number;
  last_synced_at: string | null;
}

interface EditorStats {
  total_channels: number;
  total_videos_produced: number;
  total_videos_posted: number;
  total_followers: number;
  total_likes: number;
  total_views: number;
  channels: ChannelStats[];
}

interface Editor {
  id: string;
  email: string;
  full_name: string;
  avatar: string | null;
  roles: string[];
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  stats: EditorStats;
}

interface MyEditorsResponse {
  editors: Editor[];
  total_editors: number;
  platform_filter: string | null;
}

const PLATFORMS = [
  { value: '', label: 'Tất cả nền tảng' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
];

export default function EditorManagementPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [data, setData] = useState<MyEditorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [expandedEditor, setExpandedEditor] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is manager
    const roles = user?.roles || [];
    if (user && !roles.includes(UserRole.MANAGER) && !roles.includes(UserRole.ADMIN)) {
      router.push('/dashboard/ai');
      return;
    }

    fetchEditors();
  }, [user, token, selectedPlatform]);

  const fetchEditors = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedPlatform) {
        params.append('platform', selectedPlatform);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/my-editors?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch editors');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Chưa đăng nhập';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return <Music2 className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'facebook':
        return <FacebookIcon className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return 'bg-black text-white';
      case 'instagram':
        return 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white';
      case 'facebook':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Đang tải dữ liệu editors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Activity className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-2">Lỗi tải dữ liệu</p>
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchEditors}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Quản Lý Editors</h1>
            <p className="text-indigo-100">
              Xem số liệu video sản xuất của các editors bạn quản lý
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="font-semibold">{data.total_editors}</span> editors
            </div>
          </div>
        </div>

        {/* Platform Filter */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5" />
            <span className="font-semibold">Nền tảng:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {PLATFORMS.map((platform) => (
                <option key={platform.value} value={platform.value}>
                  {platform.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Editors List */}
      <div className="space-y-4">
        {data.editors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">
              {selectedPlatform
                ? `Không có editor nào quản lý kênh ${PLATFORMS.find(p => p.value === selectedPlatform)?.label}`
                : 'Chưa có editor nào'}
            </p>
          </div>
        ) : (
          data.editors.map((editor) => {
            const isExpanded = expandedEditor === editor.id;

            return (
              <div
                key={editor.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Editor Header */}
                <button
                  onClick={() => setExpandedEditor(isExpanded ? null : editor.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {editor.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-slate-900">
                        {editor.full_name}
                      </h3>
                      <p className="text-sm text-slate-600">{editor.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hoạt động: {formatDate(editor.last_login_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Stats Summary - Only Videos */}
                    <div className="hidden md:flex items-center gap-4">
                      <div className="text-center px-6 py-3 bg-purple-100 rounded-lg">
                        <p className="text-xs text-slate-600 mb-1">Video sản xuất</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {editor.stats.total_videos_produced}
                        </p>
                      </div>
                      <div className="text-center px-6 py-3 bg-green-100 rounded-lg">
                        <p className="text-xs text-slate-600 mb-1">Video đăng tải</p>
                        <p className="text-2xl font-bold text-green-900">
                          {editor.stats.total_videos_posted}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          ({editor.stats.total_channels} kênh)
                        </p>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div
                      className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''
                        }`}
                    >
                      <ChevronDown className="w-6 h-6 text-slate-400" />
                    </div>
                  </div>
                </button>

                {/* Expanded Channels */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-4">
                      Danh sách kênh ({editor.stats.channels.length})
                    </h4>

                    {editor.stats.channels.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
                        <Video className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          Editor chưa quản lý kênh nào
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {editor.stats.channels.map((channel) => (
                          <div
                            key={channel.id}
                            className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow"
                          >
                            {/* Channel Header */}
                            <div className="flex items-center gap-3 mb-3">
                              {channel.avatar_url ? (
                                <Image
                                  src={channel.avatar_url}
                                  alt={channel.display_name || channel.username}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                                 width={0} height={0} sizes="100vw" unoptimized/>
                              ) : (
                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                                  <Users className="w-6 h-6 text-slate-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-slate-900 truncate">
                                  {channel.display_name || channel.username}
                                </h5>
                                <p className="text-xs text-slate-500">
                                  @{channel.username}
                                </p>
                              </div>
                            </div>

                            {/* Channel Stats */}
                            <div className="flex items-center justify-between">
                              <div className="bg-purple-50 rounded-lg px-4 py-3 flex-1">
                                <p className="text-xs text-slate-600 mb-1">Tổng videos</p>
                                <p className="text-2xl font-bold text-purple-900">
                                  {channel.total_videos}
                                </p>
                              </div>
                            </div>

                            {/* Last Synced */}
                            <div className="text-xs text-slate-500 text-center mt-3">
                              Cập nhật: {formatDate(channel.last_synced_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
