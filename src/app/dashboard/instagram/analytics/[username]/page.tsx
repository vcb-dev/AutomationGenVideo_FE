'use client';

import Image from "next/image";
import { Suspense } from 'react';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Share2,
  ArrowLeft,
  Calendar,
  Download,
  Zap,
  Eye,
  Video,
  Home,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamic imports - reuse from ai analytics
const PerformanceChart = dynamic(() => import('../../../ai/analytics/[username]/PerformanceChart'), {
  loading: () => <div className="h-[300px] bg-slate-100/50 animate-pulse rounded-2xl" />,
  ssr: false
});
const EngagementBreakdown = dynamic(() => import('../../../ai/analytics/[username]/EngagementBreakdown'), {
  loading: () => <div className="h-[300px] bg-slate-100/50 animate-pulse rounded-2xl" />,
  ssr: false
});
const BestPostingTimes = dynamic(() => import('../../../ai/analytics/[username]/BestPostingTimes'), {
  loading: () => <div className="h-[300px] bg-slate-100/50 animate-pulse rounded-2xl" />,
  ssr: false
});
const VideoDurationAnalysis = dynamic(() => import('../../../ai/analytics/[username]/VideoDurationAnalysis'), {
  loading: () => <div className="h-[300px] bg-slate-100/50 animate-pulse rounded-2xl" />,
  ssr: false
});
const InstagramPostingStats = dynamic(() => import('./InstagramPostingStats'), {
  loading: () => <div className="h-[150px] bg-slate-100/50 animate-pulse rounded-2xl" />,
  ssr: false
});
const InstagramViralVideos = dynamic(() => import('./InstagramViralVideos'), {
  loading: () => <div className="h-[400px] bg-slate-100/50 animate-pulse rounded-2xl" />,
  ssr: false
});

function InstagramAnalyticsInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const username = (params.username as string) || '';
  const platform = 'instagram'; // Hardcoded for Instagram

  // Helper: tính ngày gần đây theo số ngày
  const getDateRange = (days: number) => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1)); // include today
    return { start: start.toISOString().split('T')[0], end };
  };

  const [loading, setLoading] = useState(false);  // Don't show loading on initial load
  const [hasFetched, setHasFetched] = useState(false);  // Track if user has fetched data
  const [profile, setProfile] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const ignoreNextFetch = useRef(false);

  const fetchChannelData = useCallback(async (currentStart?: string, currentEnd?: string) => {
    const effectiveStart = currentStart;
    const effectiveEnd = currentEnd;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');

      if (!username) {
        throw new Error('Username is required');
      }

      // Smart max_results calculation
      let smartMaxResults = 50;
      if (effectiveStart && effectiveEnd) {
        const start = new Date(effectiveStart);
        const end = new Date(effectiveEnd);
        const timeDiff = end.getTime() - start.getTime();
        const daysDiff = Math.max(Math.ceil(timeDiff / (1000 * 60 * 60 * 24)), 1);
        smartMaxResults = Math.min(daysDiff * 8, 300);
        smartMaxResults = Math.max(smartMaxResults, 5);
      }

      const requestBody = {
        platform: 'instagram',
        username: username,
        max_results: smartMaxResults,
        start_date: effectiveStart || undefined,
        end_date: effectiveEnd || undefined
      };

      console.log(`[INSTAGRAM] Fetching fresh data:`, requestBody);

      // Use AI service directly
      // Use Backend Proxy
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${baseUrl}/ai/user-videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`[INSTAGRAM] Response status:`, response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch videos');
      }

      const videoList = data.results || [];
      setVideos(videoList);

      // Map API response fields to expected format
      const mappedProfile = data.profile ? {
        ...data.profile,
        name: data.profile.display_name || data.profile.username || username,
        display_name: data.profile.display_name || username,
        username: data.profile.username || username,
        avatar_url: data.profile.avatar_url || `https://www.instagram.com/${username}/profile_pic.jpg`,
        total_followers: data.profile.follower_count || 0,
      } : null;

      if (mappedProfile) {
        console.log('📊 Setting profile with followers:', mappedProfile.total_followers);
        setProfile(mappedProfile);
      }

      // Process analytics inline to avoid function reference issues
      const totalLikes = videoList.reduce((sum: number, v: any) => sum + (Number(v?.likes_count) || 0), 0);
      const totalViews = videoList.reduce((sum: number, v: any) => sum + (Number(v?.views_count) || 0), 0);
      const totalComments = videoList.reduce((sum: number, v: any) => sum + (Number(v?.comments_count) || 0), 0);
      const totalShares = videoList.reduce((sum: number, v: any) => sum + (Number(v?.shares_count) || 0), 0);
      const videoCount = videoList.length;

      const avgEngagement = totalViews > 0
        ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
        : 0;

      setStats({
        totalLikes,
        totalViews,
        totalComments,
        totalShares,
        videoCount,
        avgEngagement: avgEngagement.toFixed(2),
        filteredLikes: totalLikes,
        filteredViews: totalViews,
        filteredComments: totalComments,
        filteredShares: totalShares,
        filteredVideoCount: videoCount,
        filteredEngagement: avgEngagement.toFixed(2),
      });

      // Only set fallback profile if API didn't return profile data
      if (!mappedProfile && videoList.length > 0 && videoList[0]) {
        console.log('⚠️ No API profile, using fallback');
        setProfile({
          name: videoList[0]?.author_name || username,
          display_name: videoList[0]?.author_name || username,
          username: videoList[0]?.author_username || username,
          avatar_url: `https://www.instagram.com/${username}/profile_pic.jpg`,
          total_followers: 0,
        });
      }

      // Mark as fetched
      setHasFetched(true);
      // NOTE: Intentionally NOT clearing dates so user can see what range was fetched

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Auto-fetch nếu có query param ?days=N (từ channel list "Xem Chi Tiết")
  useEffect(() => {
    const daysParam = searchParams.get('days');
    if (username && daysParam) {
      const days = parseInt(daysParam, 10) || 3;
      const { start, end } = getDateRange(days);
      console.log(`[INSTAGRAM] Auto-fetch last ${days} days: ${start} → ${end}`);
      setStartDate(start);
      setEndDate(end);
      fetchChannelData(start, end);
    }
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual fetch button handler
  const handleFetchData = () => {
    if (username && startDate && endDate) {
      fetchChannelData(startDate, endDate);
    }
  };

  // Avatar proxy – Instagram CDN URLs gây CORS, cần proxy qua BE
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const getAvatarUrl = (url?: string | null) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || username)}&background=ec4899&color=fff&size=128`;
    if (!url) return fallback;
    if (url.includes('cdninstagram.com') || url.includes('instagram.com') || url.includes('fbcdn.net')) {
      return `${apiUrl}/ai/proxy/avatar?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const formatNumber = (num: number | undefined | null) => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading Instagram analytics...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  // Show filter selection UI when no data fetched yet
  if (!hasFetched && !loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] p-6 pb-20">
        <div className="max-w-[1600px] mx-auto">
          {/* Breadcrumbs */}
          <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
            <Home className="w-4 h-4" />
            <ChevronRight className="w-4 h-4" />
            <span className="capitalize text-pink-600 font-medium">Instagram</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-medium text-slate-900">@{username}</span>
          </div>

          {/* Filter Selection Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 max-w-2xl mx-auto mt-20">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Phân tích @{username}</h2>
              <p className="text-slate-500">Chọn khoảng thời gian để bắt đầu phân tích dữ liệu Instagram</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={(() => {
                    // Calculate max date: min(today, startDate + 14 days)
                    const today = new Date().toISOString().split('T')[0];
                    if (!startDate) return today;

                    const start = new Date(startDate);
                    const maxEnd = new Date(start);
                    maxEnd.setDate(start.getDate() + 14);

                    const maxEndStr = maxEnd.toISOString().split('T')[0];
                    return maxEndStr < today ? maxEndStr : today;
                  })()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <button
              onClick={handleFetchData}
              disabled={!startDate || !endDate}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all mb-4 ${startDate && endDate
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                : 'bg-slate-300 cursor-not-allowed'
                }`}
            >
              {startDate && endDate ? '🚀 Bắt đầu phân tích' : 'Vui lòng chọn khoảng thời gian'}
            </button>

            <button
              onClick={() => router.push('/dashboard/instagram/channels')}
              className="relative z-50 cursor-pointer w-full py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              ← Quay lại danh sách kênh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6 pb-20">

      {/* Breadcrumbs */}
      <div className="max-w-[1600px] mx-auto mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Home className="w-4 h-4" />
        <ChevronRight className="w-4 h-4" />
        <span className="capitalize text-pink-600 font-medium">Instagram</span>
        <ChevronRight className="w-4 h-4" />
        <span className="font-medium text-slate-900">{profile?.name || username}</span>
      </div>

      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Top Profile & Summary Stats Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">

          {/* Left: Profile Info */}
          <div className="flex items-center gap-5 min-w-[300px]">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-500 flex-shrink-0">
              <Image
                src={getAvatarUrl(profile?.avatar_url)}
                alt={profile?.name}
                className="w-full h-full rounded-full object-cover border-2 border-white"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || username)}&background=ec4899&color=fff&size=128`;
                }}
               width={0} height={0} sizes="100vw" unoptimized/>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{profile?.display_name || profile?.name}</h1>
                <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] rounded-full font-bold uppercase tracking-wider">Instagram</span>
              </div>
              <p className="text-slate-500 text-sm">@{profile?.username}</p>
            </div>
          </div>

          {/* Right: Back Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => router.push('/dashboard/instagram/channels')}
              className="relative z-[70] cursor-pointer group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium">Quay lại</span>
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
            <Calendar className="w-4 h-4" /> Date Range
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <input
              type="date"
              value={startDate}
              max={endDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm font-medium text-slate-600 outline-none bg-transparent"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={(() => {
                // Calculate max date: min(today, startDate + 14 days)
                const today = new Date().toISOString().split('T')[0];
                if (!startDate) return today;

                const start = new Date(startDate);
                const maxEnd = new Date(start);
                maxEnd.setDate(start.getDate() + 14);

                const maxEndStr = maxEnd.toISOString().split('T')[0];
                return maxEndStr < today ? maxEndStr : today;
              })()}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm font-medium text-slate-600 outline-none bg-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-medium shadow-sm transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={<Video className="w-5 h-5 text-pink-500" />}
            label="Videos Posted"
            value={stats?.filteredVideoCount}
            change={0}
          />
          <StatsCard
            icon={<Eye className="w-5 h-5 text-purple-500" />}
            label="Total Views"
            value={stats?.filteredViews}
            change={0}
          />
          <StatsCard
            icon={<Heart className="w-5 h-5 text-pink-500" />}
            label="Total Likes"
            value={stats?.filteredLikes}
            change={0}
          />
          <StatsCard
            icon={<MessageCircle className="w-5 h-5 text-indigo-500" />}
            label="Comments"
            value={stats?.filteredComments}
            change={0}
          />
          <StatsCard
            icon={<Share2 className="w-5 h-5 text-emerald-500" />}
            label="Shares"
            value={stats?.filteredShares}
            change={0}
          />
          <StatsCard
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            label="Total Engagement"
            value={formatNumber(Number(stats?.filteredLikes || 0) + Number(stats?.filteredComments || 0) + Number(stats?.filteredShares || 0))}
            change={0}
            isNumberString={true}
          />
          <StatsCard
            icon={<TrendingUp className="w-5 h-5 text-cyan-500" />}
            label="Engagement Rate"
            value={`${stats?.filteredEngagement}%`}
            change={0}
            isNumberString={true}
          />
          <StatsCard
            icon={<Users className="w-5 h-5 text-slate-500" />}
            label="Followers"
            value={profile?.total_followers || 0}
            change={0}
          />
        </div>

        {/* Charts Section - Full width since no follower history available for Instagram */}
        <div>
          <PerformanceChart videos={videos} />
        </div>

        {/* Row 3: Activity & Best Times */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InstagramPostingStats videos={videos} />
          <EngagementBreakdown stats={stats} />
          <BestPostingTimes videos={videos} />
        </div>

        {/* Row 2: Video Duration Analysis - Full Width */}
        <div>
          <VideoDurationAnalysis videos={videos} />
        </div>

        {/* Row 3: Viral Videos (5K+ views or likes) - Full Width */}
        <div>
          <InstagramViralVideos videos={videos} />
        </div>

      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ icon, label, value, change, isNumberString = false, subLabel }: any) {
  const isPositive = change >= 0;
  const displayValue = isNumberString ? value : new Intl.NumberFormat('en-US').format(Number(value) || 0);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-3">{displayValue}</h3>
      <div className="flex items-center gap-2">
        {change !== 0 && (
          <>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs previous</span>
          </>
        )}
        {subLabel != null && subLabel !== '' && <span className="text-[10px] text-emerald-600 font-medium">{subLabel}</span>}
      </div>
    </div>
  );
}

// Suspense wrapper (required for useSearchParams in Next.js App Router)
export default function InstagramAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading Instagram analytics...</p>
        </div>
      </div>
    }>
      <InstagramAnalyticsInner />
    </Suspense>
  );
}
