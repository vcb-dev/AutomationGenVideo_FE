'use client';

import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Video, Image as ImageIcon,
    BarChart3, LayoutGrid, Loader2, Users,
    ThumbsUp, MessageCircle, Share2, TrendingUp,
    ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import dynamic from 'next/dynamic';

import { FacebookPost, ImageWithFallback } from './components/common';
import { ReelsAnalytics } from './components/ReelsView';
import { PostsAnalytics } from './components/PostsView';
import toast from 'react-hot-toast';

const FbEngagementChart = dynamic(
    () => import('./components/FbEngagementChart').then((m) => ({ default: m.FbEngagementChart })),
    { ssr: false },
);
const FbChannelMetricsCharts = dynamic(
    () => import('./components/FbEngagementChart').then((m) => ({ default: m.FbChannelMetricsCharts })),
    { ssr: false },
);

const Avatar = ({ src, alt, fallback }: { src?: string, alt: string, fallback: string }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 text-xl shadow-sm">
                {(fallback || 'U')[0].toUpperCase()}
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            className="w-12 h-12 rounded-full border border-slate-100 shadow-sm object-cover"
            onError={() => setError(true)}
         width={0} height={0} sizes="100vw" unoptimized/>
    );
};

export default function FacebookAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const username = params.username as string;

    // Nếu mở từ "Phân tích kênh" hub/report: chỉ hiển thị UI insights (điểm mạnh/điểm yếu/cơ hội...)
    const insightsOnly = (searchParams.get('view') || '').toLowerCase() === 'insights';

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FacebookPost[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [error, setError] = useState('');
    const [hasFetched, setHasFetched] = useState(false);

    // Insights (SocialLens-style 12 mục)
    const [insights, setInsights] = useState<Record<string, string>>({});
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsError, setInsightsError] = useState('');
    const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

    // Channel Metrics (viral posts, ads, charts) - NO Gemini
    const [channelMetrics, setChannelMetrics] = useState<any>(null);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metricsError, setMetricsError] = useState('');

    // UI State
    const [activeTab, setActiveTab] = useState<'all' | 'video' | 'post'>('all');
    const [showAllContent, setShowAllContent] = useState(false);
    const [visibleCount, setVisibleCount] = useState(1000); // Default high to show all initially


    // Date Range State (Default: Last 3 days)
    const [startDate, setStartDate] = useState(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Temporary date states for user selection (before applying)
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);

    const startDateRef = useRef(startDate);
    const endDateRef = useRef(endDate);
    const ignoreNextFetch = useRef(false);
    const isFetchingRef = useRef(false); // Prevent duplicate calls
    const insightsAutoRunRef = useRef(false);

    useEffect(() => {
        startDateRef.current = startDate;
        endDateRef.current = endDate;
    }, [startDate, endDate]);

    const fetchData = useCallback(async (currentStart?: string, currentEnd?: string, forceRefresh: boolean = false) => {
        if (!username) return;

        // Prevent duplicate concurrent calls
        if (isFetchingRef.current) {
            console.log('⚠️ Already fetching, skipping duplicate call');
            return;
        }

        isFetchingRef.current = true;

        const effectiveStart = currentStart ?? startDateRef.current;
        const effectiveEnd = currentEnd ?? endDateRef.current;

        setLoading(true);
        setError('');

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

        let timeoutId: NodeJS.Timeout | undefined;

        try {
            // Calculate smart max_results based on date range
            let smartMaxResults = 100; // Default

            if (effectiveStart && effectiveEnd) {
                const start = new Date(effectiveStart);
                const end = new Date(effectiveEnd);
                const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                // Estimate ~20 posts per day (conservative)
                smartMaxResults = daysDiff * 20;
                console.log(`📊 Date range: ${effectiveStart} to ${effectiveEnd} (${daysDiff} days) -> Max Limit: ${smartMaxResults}`);
            } else {
                // Default if no range: fetch last 30 items
                smartMaxResults = 30;
            }

            console.log(`🔍 Fetching data with forceRefresh=${forceRefresh}, start=${effectiveStart}, end=${effectiveEnd}`);

            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), 3600000); // 3600s = 1 hour timeout


            const response = await fetch(`${baseUrl}/ai/user-videos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    platform: 'facebook',
                    username: username,
                    max_results: smartMaxResults,
                    start_date: effectiveStart || undefined,
                    end_date: effectiveEnd || undefined,
                    force_refresh: forceRefresh // Use parameter instead of hardcoded false
                }),
                signal: controller.signal // Add abort signal for timeout
            });

            clearTimeout(timeoutId); // Clear timeout if request completes

            if (!response.ok) {
                throw new Error(`Lỗi kết nối: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            // Check if data is being updated in background
            if (result.is_updating) {
                console.log('📊 Showing cached data, will update in background');
            }

            if (result.profile) {
                setProfile(result.profile);
            }

            const posts = result.results || result.videos || [];
            console.log('📦 Data received from API:', posts.length);

            if (Array.isArray(posts)) {
                const mappedData: FacebookPost[] = posts.map((item: any) => {
                    // Log item to inspect structure if thumbnail missing
                    if (!item.thumbnail_url && !item.thumbnail && !item.image && !item.images?.length) {
                        console.log('⚠️ Missing thumbnail for item:', item);
                    }

                    const thumbnail = item.thumbnail_url || item.thumbnail || item.image || item.imageUrl || item.fullImage || (item.images && item.images.length > 0 ? item.images[0] : '') || '';

                    const url = item.url || item.video_url || item.postUrl || '#';
                    const isVideoUrl = url.includes('/reel/') || url.includes('/videos/') || url.includes('/watch') || url.includes('video');

                    return {
                        id: item.id || item.video_id || `post-${Math.random()}`,
                        text: item.title || item.description || '',
                        url: url,
                        timestamp: item.timestamp || Math.floor(new Date(item.published_at || item.createdAt || Date.now()).getTime() / 1000),
                        time: new Date((item.timestamp || Date.now() / 1000) * 1000).toISOString(),
                        isVideo: item.is_video ?? (item.isVideo ?? (Boolean(item.download_url) || isVideoUrl)),
                        thumbnail: thumbnail,
                        likes: item.likes_count || item.like_count || item.likes || 0,
                        comments: item.comments_count || item.comment_count || item.comments || 0,
                        shares: item.shares_count || item.share_count || item.shares || 0,
                        views: item.views_count || item.view_count || item.views || 0
                    };
                });

                setData(mappedData);
                setHasFetched(true);
                // Auto-expand visible count if data is loaded to avoid "hidden" items feeling
                setVisibleCount(prev => Math.max(prev, mappedData.length));

                // Show info message if data is being updated
                if (result.is_updating && result.message) {
                    console.log(`ℹ️ ${result.message}`);
                    // You can add a toast notification here if you have a toast library
                }

                // REMOVED auto-clear logic.
                const hasDateFilter = !!(effectiveStart && effectiveEnd);
                if (hasDateFilter) {
                    console.log('✅ Data fetched with filter. Filter preserved.');
                }

            } else {
                setData([]);
                setHasFetched(true);
            }

        } catch (err: any) {
            clearTimeout(timeoutId); // Clear timeout on error

            if (err.name === 'AbortError') {
                setError('Request timeout sau 1 giờ. Vui lòng thử lại hoặc giảm phạm vi ngày.');
                console.error('⏱️ Request timeout after 3600s');
            } else {
                setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
                console.error(err);
            }
        } finally {
            setLoading(false);
            isFetchingRef.current = false; // Reset flag
        }
    }, [username]);

    // REMOVED auto-fetch on date change
    // Users must click "Apply" button to trigger fetch

    // Initial fetch on mount - ALWAYS FORCE REFRESH
    useEffect(() => {
        console.log(`📍 useEffect triggered: username=${username}, hasFetched=${hasFetched}`);
        if (username && !hasFetched) {
            console.log('🔄 Initial load: Force refreshing data from Facebook...');
            fetchData(startDate, endDate, true);
        }
    }, [username]);

    // Mỗi lần restart FE server/build, Next.js buildId thường đổi.
    // Gắn cache theo buildId để tránh hiển thị output cũ sau restart.
    const getBuildId = () => {
        try {
            return (window as any).__NEXT_DATA__?.buildId?.toString?.() || 'unknown';
        } catch (_) {
            return 'unknown';
        }
    };

    const INSIGHTS_PREFIX = 'fb_insights_';
    const BUILD_ID_KEY = 'app_build_id';
    const STORAGE_KEY = (id: string, buildId: string) => `${INSIGHTS_PREFIX}${buildId}_${id}`;
    const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ

    // Insights chỉ coi là "có data thật" khi có ít nhất 1 mục KHÔNG phải placeholder "Chưa đủ dữ liệu..."
    const hasRealInsights = useCallback((i: Record<string, string>) => {
        if (!i || Object.keys(i).length === 0) return false;
        const vals = Object.values(i);
        const isPlaceholder = (v?: string) => {
            const s = (v || '').trim();
            if (!s) return true;
            return s.startsWith('Chưa đủ dữ liệu');
        };
        return vals.some(v => !isPlaceholder(v));
    }, []);

    // Clear insights cache nếu buildId đổi (tức server restart/rebuild)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const current = getBuildId();
        const prev = sessionStorage.getItem(BUILD_ID_KEY) || '';
        if (prev && prev !== current) {
            try {
                for (let i = sessionStorage.length - 1; i >= 0; i--) {
                    const k = sessionStorage.key(i) || '';
                    if (k.startsWith(INSIGHTS_PREFIX)) sessionStorage.removeItem(k);
                }
            } catch (_) {}
            setInsights({});
            setInsightsError('');
            setInsightsLoading(false);
        }
        try { sessionStorage.setItem(BUILD_ID_KEY, current); } catch (_) {}
    }, []);

    const saveInsightsState = useCallback((id: string, state: { loading?: boolean; insights?: Record<string, string>; error?: string }) => {
        try {
            const buildId = getBuildId();
            const existing = sessionStorage.getItem(STORAGE_KEY(id, buildId));
            const prev = existing ? JSON.parse(existing) : {};
            const next = { ...prev, ...state, updatedAt: Date.now() };
            sessionStorage.setItem(STORAGE_KEY(id, buildId), JSON.stringify(next));
        } catch (_) {}
    }, []);

    const getRequestedMaxPosts = useCallback((id: string) => {
        // Prefer selection from "Tạo báo cáo" (channel-analysis hub)
        try {
            const raw = sessionStorage.getItem('channel_analysis_autorun');
            if (raw) {
                const parsed = JSON.parse(raw);
                const p = (parsed?.platform || '').toString().toLowerCase();
                const u = (parsed?.username || '').toString().replace(/^@/, '').trim().toLowerCase();
                const cur = (id || '').toString().replace(/^@/, '').trim().toLowerCase();
                if (p === 'facebook' && u && cur && u === cur) {
                    const n = parseInt(parsed?.maxPosts, 10);
                    if (!Number.isNaN(n) && n > 0) return Math.min(Math.max(n, 10), 200);
                }
            }
        } catch (_) {}
        return 30;
    }, []);

    const fetchInsights = useCallback(async () => {
        const id = (profile?.username || username || '').toString().replace(/^@/, '').trim();
        if (!id) return;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        const apiUrl = `${baseUrl.replace(/\/$/, '')}/ai/facebook/insights`;
        const url = `https://www.facebook.com/${encodeURIComponent(id)}`;
        const requestedMaxPosts = getRequestedMaxPosts(id);
        setInsightsLoading(true);
        setInsightsError('');
        saveInsightsState(id, { loading: true, error: '' });
        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, max_posts: requestedMaxPosts, language: 'vi' }),
            });
            let json: any = {};
            try {
                if (res.headers.get('content-type')?.includes('json')) json = await res.json();
            } catch (_) {}
            if (!res.ok) {
                const msg = (json.error || json.message || '').toString();
                const friendly = res.status === 429 || msg.includes('429') || msg.toLowerCase().includes('quota')
                    ? 'Gemini API hết quota. Vui lòng thử lại sau 1–2 phút.'
                    : msg || `Lỗi ${res.status}`;
                throw new Error(friendly);
            }
            if (json.success === false && json.error) throw new Error(json.error);
            const data = json.insights || {};
            setInsights(data);
            saveInsightsState(id, { loading: false, insights: data, error: '' });
        } catch (e: any) {
            const msg = (e.message || 'Không thể tải phân tích kênh').toString();
            setInsightsError(msg);
            saveInsightsState(id, { loading: false, error: msg });
            console.error('[Insights]', msg, { apiUrl, url });
        } finally {
            setInsightsLoading(false);
            saveInsightsState(id, { loading: false });
        }
    }, [username, profile?.username, saveInsightsState, getRequestedMaxPosts]);

    const fetchChannelMetrics = useCallback(async () => {
        const id = (profile?.username || username || '').toString().replace(/^@/, '').trim();
        if (!id) return;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        const apiUrl = `${baseUrl.replace(/\/$/, '')}/ai/facebook/channel-metrics`;
        const url = `https://www.facebook.com/${encodeURIComponent(id)}`;
        const requestedMaxPosts = getRequestedMaxPosts(id);
        setMetricsLoading(true);
        setMetricsError('');
        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, max_posts: Math.max(30, requestedMaxPosts) }),
            });
            let json: any = {};
            try {
                if (res.headers.get('content-type')?.includes('json')) json = await res.json();
            } catch (_) {}
            if (!res.ok) {
                const msg = (json.error || json.message || '').toString() || `Lỗi ${res.status}`;
                throw new Error(msg);
            }
            if (json.success === false && json.error) throw new Error(json.error);
            setChannelMetrics(json.metrics || null);
        } catch (e: any) {
            const msg = (e.message || 'Không thể tải thống kê kênh').toString();
            setMetricsError(msg);
            console.error('[ChannelMetrics]', msg, { apiUrl, url });
        } finally {
            setMetricsLoading(false);
        }
    }, [username, profile?.username, getRequestedMaxPosts]);

    const runChannelAnalysis = useCallback(async () => {
        // Insights-only view: chỉ chạy Gemini insights (UI accordion)
        if (insightsOnly) {
            await fetchInsights();
        } else {
            // Full view: chạy song song metrics + Gemini insights
            await Promise.all([fetchChannelMetrics(), fetchInsights()]);
        }
        // Mark analyzed (for Channel Analysis list page)
        try {
            const id = (profile?.username || username || '').toString().replace(/^@/, '').trim();
            if (id) {
                localStorage.setItem(
                    `channel_analysis_facebook_${id}`,
                    JSON.stringify({ status: 'completed', analyzedAt: Date.now() })
                );
            }
        } catch (_) {}
    }, [fetchChannelMetrics, fetchInsights, insightsOnly, profile?.username, username]);

    // Insights-only view: auto-run analysis once on enter.
    useEffect(() => {
        if (!insightsOnly) return;
        const id = (profile?.username || username || '').toString().replace(/^@/, '').trim();
        if (!id) return;
        if (insightsAutoRunRef.current) return;
        insightsAutoRunRef.current = true;
        runChannelAnalysis();
        // We intentionally do not depend on runChannelAnalysis to avoid reruns.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [insightsOnly, username, profile?.username]);

    // Chỉ restore từ cache khi có data THẬT (không restore "Chưa đủ dữ liệu" / lỗi cũ)
    useEffect(() => {
        const id = (profile?.username || username || '').toString().replace(/^@/, '').trim();
        if (!id) return;
        try {
            const buildId = getBuildId();
            const raw = sessionStorage.getItem(STORAGE_KEY(id, buildId));
            if (raw) {
                const parsed = JSON.parse(raw);
                const age = Date.now() - (parsed.updatedAt || 0);
                if (parsed.insights && hasRealInsights(parsed.insights) && age < CACHE_TTL_MS) {
                    setInsights(parsed.insights);
                    setInsightsError('');
                } else if (parsed.loading && age < 3 * 60 * 1000) {
                    setInsightsLoading(true);
                }
                // Không restore error/empty state - để user bấm "Phân tích" mới hiện
            }
        } catch (_) {}
    }, [username, profile?.username, hasRealInsights]);

    // KHÔNG auto-fetch. User phải bấm nút "Phân tích kênh" mới gọi API.

    // Khi đang loading (vd user quay lại sau khi chuyển tab), poll sessionStorage để nhận kết quả từ fetch nền
    useEffect(() => {
        if (!insightsLoading) return;
        const id = (profile?.username || username || '').toString().replace(/^@/, '').trim();
        if (!id) return;
        const iv = setInterval(() => {
            try {
                const buildId = getBuildId();
                const raw = sessionStorage.getItem(STORAGE_KEY(id, buildId));
                if (!raw) return;
                const p = JSON.parse(raw);
                if (!p.loading && p.insights && hasRealInsights(p.insights)) {
                    setInsights(p.insights);
                    setInsightsLoading(false);
                } else if (!p.loading && p.error) {
                    setInsightsError(p.error);
                    setInsightsLoading(false);
                }
            } catch (_) {}
        }, 2000);
        return () => clearInterval(iv);
    }, [insightsLoading, username, profile?.username, hasRealInsights]);

    // Manual apply filter function
    const handleApplyFilter = () => {
        // Basic validation (calendar already limits to 14 days)
        if (tempStartDate && tempEndDate) {
            const start = new Date(tempStartDate);
            const end = new Date(tempEndDate);

            if (start > end) {
                toast.error('Ngày bắt đầu phải trước ngày kết thúc.');
                return;
            }
        }

        console.log('🔄 Manual filter applied:', { tempStartDate, tempEndDate });
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
        fetchData(tempStartDate, tempEndDate);
    };

    // Combined stats for "All" tab
    const filteredData = useMemo(() => {
        return data.filter(item => {
            // Filter by Time Range
            if (!startDate || !endDate) return true;
            const itemDate = new Date(item.timestamp * 1000);
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            return itemDate >= start && itemDate <= end;
        });
    }, [data, startDate, endDate]);

    const stats = useMemo(() => {
        const totalLikes = filteredData.reduce((sum, item) => sum + item.likes, 0);
        const totalComments = filteredData.reduce((sum, item) => sum + item.comments, 0);
        const totalViews = filteredData.reduce((sum, item) => sum + item.views, 0);
        const totalShares = filteredData.reduce((sum, item) => sum + item.shares, 0);
        const totalItems = filteredData.length;

        const engagementRate = totalViews > 0
            ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
            : 0;

        const totalEngagement = totalLikes + totalComments + totalShares;
        const avgEngagement = totalItems > 0 ? totalEngagement / totalItems : 0;

        return {
            totalLikes,
            totalComments,
            totalViews,
            totalShares,
            totalItems,
            totalEngagement,
            avgEngagement: avgEngagement.toFixed(1),
            engagementRate: engagementRate.toFixed(2)
        };
    }, [filteredData]);

    // Chart data for All view - AGGREGATE BY DATE
    const chartData = useMemo(() => {
        // Group by date and aggregate metrics
        const dateMap = new Map<string, {
            date: string;
            likes: number;
            comments: number;
            shares: number;
            views: number;
            engagement: number;
            count: number;
        }>();

        filteredData.forEach(item => {
            const dateKey = new Date(item.timestamp * 1000).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, {
                    date: dateKey,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    views: 0,
                    engagement: 0,
                    count: 0
                });
            }

            const existing = dateMap.get(dateKey)!;
            existing.likes += item.likes;
            existing.comments += item.comments;
            existing.shares += item.shares;
            existing.views += item.views;
            existing.engagement += (item.likes + item.comments + item.shares);
            existing.count += 1;
        });

        // Convert to array and sort by date
        return Array.from(dateMap.values())
            .sort((a, b) => {
                const dateA = new Date(a.date.split('/').reverse().join('-'));
                const dateB = new Date(b.date.split('/').reverse().join('-'));
                return dateA.getTime() - dateB.getTime();
            });
    }, [filteredData]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">

            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-subtle">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar
                            src={profile?.avatar_url}
                            alt={profile?.display_name || username}
                            fallback={profile?.display_name || profile?.username || username || 'U'}
                        />
                        <div>
                            <h1 className="font-bold text-slate-800 text-lg leading-tight">
                                {profile?.display_name || profile?.username || username}
                            </h1>
                            <div className="text-[10px] font-bold tracking-widest text-slate-400 mt-0.5">FACEBOOK ANALYTICS</div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="relative z-[70] cursor-pointer flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-all font-semibold text-sm shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 animate-pulse">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">🔄 Đang cập nhật dữ liệu mới nhất từ Facebook...</p>
                        <p className="text-xs text-slate-400 mt-2">Việc này có thể mất vài phút với dữ liệu lớn</p>
                        <div className="mt-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-700 font-medium">💡 Đang quét posts mới nhất, không dùng cache</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-red-200">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <h3 className="text-slate-800 font-bold text-lg mb-2">Đã xảy ra lỗi</h3>
                        <p className="text-slate-500 mb-6">{error}</p>
                        <button onClick={() => fetchData(startDate, endDate, true)} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Thử lại</button>
                    </div>
                ) : !hasFetched ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bắt đầu phân tích</h2>
                        <p className="text-slate-500 mb-10 max-w-md text-center">Chọn loại dữ liệu bạn muốn thống kê từ kênh này</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                            <button
                                onClick={() => { setActiveTab('all'); fetchData(startDate, endDate, true); }}
                                className="col-span-1 md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all group text-left relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <LayoutGrid className="w-24 h-24 text-purple-600" />
                                </div>
                                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <LayoutGrid className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Tất cả nội dung</h3>
                                <p className="text-sm text-slate-500">Xem toàn bộ bài viết, video và hình ảnh.</p>
                            </button>

                            <div className="grid grid-cols-2 gap-6 w-full col-span-1 md:col-span-2">
                                <button
                                    onClick={() => { setActiveTab('video'); fetchData(startDate, endDate, true); }}
                                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Video className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">Reels / Videos</h3>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('post'); fetchData(startDate, endDate, true); }}
                                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">Posts / Ảnh</h3>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                        {/* Tabs Switcher & Date Filter Row */}
                        {!insightsOnly && (
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex">
                                <button
                                    onClick={() => { setActiveTab('all'); setShowAllContent(false); }}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'all'
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    Tất cả
                                </button>
                                <button
                                    onClick={() => { setActiveTab('video'); setShowAllContent(false); }}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'video'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                >
                                    <Video className="w-4 h-4" />
                                    Reels / Videos
                                </button>
                                <button
                                    onClick={() => { setActiveTab('post'); setShowAllContent(false); }}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'post'
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    Posts / Ảnh
                                </button>
                            </div>

                            {/* Date Range Picker with Apply Button */}
                            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 h-[52px]">
                                <div className="px-4 flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider border-r border-slate-100 h-full">
                                    <BarChart3 className="w-4 h-4" />
                                    <span>Thời gian:</span>
                                </div>
                                <div className="flex items-center gap-2 px-2">
                                    <input
                                        type="date"
                                        value={tempStartDate}
                                        max={tempEndDate || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setTempStartDate(e.target.value)}
                                        className="bg-transparent text-slate-700 font-bold text-sm px-2 py-1.5 focus:outline-none cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
                                    />
                                    <span className="text-slate-300">|</span>
                                    <input
                                        type="date"
                                        value={tempEndDate}
                                        min={tempStartDate}
                                        max={(() => {
                                            // Calculate max date: min(today, startDate + 14 days)
                                            const today = new Date().toISOString().split('T')[0];
                                            if (!tempStartDate) return today;

                                            const start = new Date(tempStartDate);
                                            const maxEnd = new Date(start);
                                            maxEnd.setDate(start.getDate() + 14);

                                            const maxEndStr = maxEnd.toISOString().split('T')[0];
                                            return maxEndStr < today ? maxEndStr : today;
                                        })()}
                                        onChange={(e) => setTempEndDate(e.target.value)}
                                        className="bg-transparent text-slate-700 font-bold text-sm px-2 py-1.5 focus:outline-none cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
                                    />
                                </div>
                                <button
                                    onClick={handleApplyFilter}
                                    disabled={!tempStartDate || !tempEndDate}
                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all ml-1"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                        )}

                        {/* --- RENDER CONTENT BASED ON TAB --- */}
                        {!insightsOnly && activeTab === 'all' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {/* Stats Grid for All */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users className="w-5 h-5" /></div>
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng Nội dung</span>
                                        </div>
                                        <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalItems.toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">Bài viết/Video trong khoảng này</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Video className="w-5 h-5" /></div>
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng Lượt xem</span>
                                        </div>
                                        <div className="text-3xl font-black text-blue-600 tracking-tight">
                                            {stats.totalViews > 0 ? stats.totalViews.toLocaleString() : (stats.totalItems > 0 ? 'N/A' : '0')}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">Lượt xem video/reels</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><ThumbsUp className="w-5 h-5" /></div>
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                                                Tổng Likes
                                            </span>
                                        </div>
                                        <div className="text-3xl font-black text-rose-600 tracking-tight">
                                            {stats.totalLikes.toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            Tổng lượt like
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng Tương tác</span>
                                        </div>
                                        <div className="text-3xl font-black text-amber-600 tracking-tight">{stats.totalEngagement.toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">Tổng Like+Cmt+Share</div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><BarChart3 className="w-5 h-5" /></div>
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tương tác / Bài</span>
                                        </div>
                                        <div className="text-3xl font-black text-indigo-600 tracking-tight">{stats.avgEngagement}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">Trung bình tương tác</div>
                                    </div>
                                </div>

                                {/* Chart for All */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                                Biểu đồ tương tác tổng hợp
                                            </h3>
                                            <p className="text-sm text-slate-500">Xu hướng Likes & Comments trên tất cả nội dung</p>
                                        </div>
                                    </div>

                                    <div className="h-[300px] w-full">
                                        <FbEngagementChart chartData={chartData} />
                                    </div>
                                </div>

                                {/* List for All */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                                <LayoutGrid className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800">
                                                Danh sách tất cả <span className="text-slate-400 text-lg font-normal ml-1">({stats.totalItems})</span>
                                            </h3>
                                        </div>
                                        {!showAllContent && stats.totalItems > 0 && (
                                            <button
                                                onClick={() => setShowAllContent(true)}
                                                className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5"
                                            >
                                                <LayoutGrid className="w-4 h-4" />
                                                Hiển thị chi tiết
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                                        {filteredData.slice(0, showAllContent ? visibleCount : 8).map((item, idx) => (
                                            <div key={item.id || idx} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group relative">
                                                <div className="bg-slate-100 relative overflow-hidden aspect-square">
                                                    <ImageWithFallback
                                                        src={item.thumbnail}
                                                        alt={item.text}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        isVideo={item.isVideo}
                                                    />
                                                    {item.isVideo && (
                                                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1">
                                                            <Video className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-xs font-medium text-slate-700 line-clamp-2 h-8 leading-relaxed">
                                                        {item.text || 'Không có mô tả'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!insightsOnly && activeTab === 'video' && (
                            <ReelsAnalytics data={data} loading={loading} />
                        )}

                        {!insightsOnly && activeTab === 'post' && (
                            <PostsAnalytics data={data} loading={loading} />
                        )}

                        {insightsOnly && (
                            <div className="space-y-6 animate-in fade-in duration-300 w-full max-w-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">Phân tích kênh</h3>
                                    </div>
                                    <button
                                        onClick={() => runChannelAnalysis()}
                                        disabled={insightsLoading || metricsLoading || (!insightsOnly && !hasFetched)}
                                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
                                            insightsError
                                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                    >
                                        {(insightsLoading || metricsLoading) ? 'Đang phân tích...' : insightsError ? 'Thử lại' : hasRealInsights(insights) ? 'Phân tích lại' : 'Phân tích kênh'}
                                    </button>
                                </div>
                                {insightsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                                        <p className="text-slate-500 text-sm font-medium">Đang phân tích kênh bằng AI (Gemini)...</p>
                                        <p className="text-slate-400 text-xs mt-2">Bạn có thể chuyển trang khác, tiến trình vẫn chạy nền. Quay lại đây để xem kết quả.</p>
                                    </div>
                                ) : insightsError ? (
                                    <div className="py-8 px-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
                                        <p className="font-medium">{insightsError}</p>
                                        <p className="text-sm mt-2 text-amber-700">
                                            Kiểm tra: BE chạy, AI service chạy, GEMINI_API_KEY đã cấu hình.
                                        </p>
                                        <button
                                            onClick={() => runChannelAnalysis()}
                                            className="mt-4 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600"
                                        >
                                            Thử lại
                                        </button>
                                    </div>
                                ) : !hasRealInsights(insights) ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <FileText className="w-16 h-16 text-indigo-300 mb-4" />
                                        <p className="text-slate-600 font-medium mb-2">Chưa có phân tích kênh</p>
                                        <p className="text-slate-500 text-sm mb-6">Bấm nút bên dưới để AI phân tích kênh này</p>
                                        <button
                                            onClick={() => runChannelAnalysis()}
                                            disabled={!insightsOnly && !hasFetched}
                                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Phân tích kênh
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Metrics section (charts + lists) - hide in insights-only mode */}
                                        {!insightsOnly && (
                                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">Thống kê kênh</h4>
                                                    <p className="text-xs text-slate-500 mt-1">Top viral, bài quảng cáo và biểu đồ được tính từ các bài đã quét (Apify)</p>
                                                </div>
                                                {metricsLoading && <span className="text-xs text-slate-500">Đang tải metrics...</span>}
                                            </div>

                                            {metricsError ? (
                                                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                                    {metricsError}
                                                </div>
                                            ) : channelMetrics?.charts ? (
                                                <div className="space-y-6">
                                                    <FbChannelMetricsCharts channelMetrics={channelMetrics} />

                                                    {/* Distributions */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="border border-slate-200 rounded-xl p-4">
                                                            <p className="text-sm font-semibold text-slate-700 mb-3">Phân bố định dạng nội dung</p>
                                                            <div className="space-y-2">
                                                                {(channelMetrics.charts.format_distribution || []).map((it: any) => {
                                                                    const total = (channelMetrics?.meta?.posts_analyzed || 1);
                                                                    const pct = Math.round((it.count / total) * 100);
                                                                    return (
                                                                        <div key={it.format} className="space-y-1">
                                                                            <div className="flex items-center justify-between text-xs text-slate-600">
                                                                                <span className="font-semibold">{it.format}</span>
                                                                                <span>{it.count} ({pct}%)</span>
                                                                            </div>
                                                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div className="border border-slate-200 rounded-xl p-4">
                                                            <p className="text-sm font-semibold text-slate-700 mb-3">Phân bố định dạng quảng cáo (heuristic)</p>
                                                            <div className="space-y-2">
                                                                {(channelMetrics.charts.ad_format_distribution || []).map((it: any) => {
                                                                    const total = (channelMetrics?.meta?.ad_posts_found || 1);
                                                                    const pct = Math.round((it.count / total) * 100);
                                                                    return (
                                                                        <div key={it.type} className="space-y-1">
                                                                            <div className="flex items-center justify-between text-xs text-slate-600">
                                                                                <span className="font-semibold">{it.type}</span>
                                                                                <span>{it.count} ({pct}%)</span>
                                                                            </div>
                                                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Lists */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="border border-slate-200 rounded-xl p-4">
                                                            <p className="text-sm font-semibold text-slate-700 mb-3">Top 10 bài viral</p>
                                                            <div className="space-y-3">
                                                                {(channelMetrics.top_viral_posts || []).slice(0, 10).map((p: any, idx: number) => (
                                                                    <a key={p.id || idx} href={p.url || '#'} target="_blank" className="block p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                                                                            <span className="text-xs text-slate-600">Score: {Math.round(p.viral_score || 0)}</span>
                                                                        </div>
                                                                        <p className="text-sm text-slate-700 line-clamp-2">{p.text || '(Không có nội dung)'}</p>
                                                                        <p className="text-xs text-slate-500 mt-2">👍 {p.likes} · 💬 {p.comments} · 🔁 {p.shares} · 👁️ {p.views}</p>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="border border-slate-200 rounded-xl p-4">
                                                            <p className="text-sm font-semibold text-slate-700 mb-3">Bài quảng cáo (heuristic)</p>
                                                            <div className="space-y-3">
                                                                {(channelMetrics.ad_posts || []).slice(0, 10).map((p: any, idx: number) => (
                                                                    <a key={p.id || idx} href={p.url || '#'} target="_blank" className="block p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                                                                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{p.ad_type || 'Quảng cáo'}</span>
                                                                        </div>
                                                                        <p className="text-sm text-slate-700 line-clamp-2">{p.text || '(Không có nội dung)'}</p>
                                                                        <p className="text-xs text-slate-500 mt-2">👍 {p.likes} · 💬 {p.comments} · 🔁 {p.shares} · 👁️ {p.views}</p>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-slate-500">Bấm “Phân tích kênh” để tải metrics.</div>
                                            )}
                                        </div>
                                        )}

                                        {/* Gemini insights (accordion) */}
                                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                            {[
                                                'Định vị Thương hiệu', 'Giọng nói Thương hiệu', 'Khách hàng Mục tiêu',
                                                'Tuyến Nội dung', 'Công thức Nội dung', 'Phân tích Reel',
                                                'Chiến lược Quảng cáo', 'Phễu Marketing', 'Tương tác & Bình luận',
                                                'Tóm tắt Chiến lược', 'Điểm mạnh', 'Điểm yếu & Cơ hội',
                                                'Đề xuất hành động',
                                            ].map((key) => {
                                                const isExpanded = expandedInsight === key;
                                                const content = insights[key] || 'Chưa đủ dữ liệu.';
                                                return (
                                                    <div
                                                        key={key}
                                                        className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                                    >
                                                        <button
                                                            onClick={() => setExpandedInsight(isExpanded ? null : key)}
                                                            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                                                        >
                                                            <span className="font-semibold text-slate-800">{key}</span>
                                                            {isExpanded ? (
                                                                <ChevronUp className="w-5 h-5 text-slate-500 shrink-0" />
                                                            ) : (
                                                                <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                                                            )}
                                                        </button>
                                                        {isExpanded && (
                                                            <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                                                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
