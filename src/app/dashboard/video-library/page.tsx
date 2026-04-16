'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bookmark,
    Users,
    Globe,
    Play,
    Heart,
    Eye,
    MessageCircle,
    Share2,
    Crown,
    Clock,
    TrendingUp,
    Filter,
    Search,
    Sparkles,
    Loader2,
    Trash2,
    RefreshCw,
    ExternalLink,
    FileText,
    Film,
    Package,
    CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'team' | 'shared' | 'content';

interface LibraryVideo {
    id: string;
    video_id: string;
    platform: string;
    title: string;
    description: string;
    video_url: string;
    author_username: string;
    author_name: string;
    thumbnail_url: string | null;
    views_count: number;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    collection_type: 'TEAM' | 'SHARED';
    added_by_name: string;
    added_by_role: string;
    notes: string | null;
    sourcing_url: string | null;
    created_at: string;
}

interface ApprovedContentItem {
    id: string;
    script: string;
    content_type: string;
    content_type_display: string;
    word_count: number;
    source_video_id: number | null;
    source_video_title: string;
    source_video_desc: string;
    source_video_url: string;
    product_id: string | null;
    product_name: string | null;
    product_category: string | null;
    product_sku: string | null;
    approved_by_name: string;
    approved_by_role: string;
    created_at: string;
}

// ─── Content Type Colors ─────────────────────────────────────────────────────

const CONTENT_TYPE_COLOR: Record<string, string> = {
    A4: 'from-green-500 to-emerald-500',
    A5: 'from-yellow-500 to-orange-500',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_COLOR: Record<string, string> = {
    TIKTOK: 'from-pink-500 to-rose-500',
    INSTAGRAM: 'from-purple-500 to-pink-500',
    FACEBOOK: 'from-blue-500 to-blue-700',
    DOUYIN: 'from-slate-700 to-slate-900',
    XIAOHONGSHU: 'from-red-500 to-rose-600',
    YOUTUBE: 'from-red-600 to-rose-700',
};

const PLATFORM_LABEL: Record<string, string> = {
    TIKTOK: 'TikTok',
    INSTAGRAM: 'Instagram',
    FACEBOOK: 'Facebook',
    DOUYIN: 'Douyin',
    XIAOHONGSHU: 'Xiaohongshu',
    YOUTUBE: 'YouTube',
};

function formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

// ─── Video Card ────────────────────────────────────────────────────────────────

function VideoCard({
    video,
    index,
    canDelete,
    onDelete,
}: {
    video: LibraryVideo;
    index: number;
    canDelete: boolean;
    onDelete: (id: string) => void;
}) {
    const gradientClass = PLATFORM_COLOR[video.platform] ?? 'from-slate-600 to-slate-800';
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Xoá video này khỏi bộ sưu tập?')) return;
        setDeleting(true);
        onDelete(video.id);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="group relative bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 flex flex-col"
        >
            {/* Thumbnail */}
            <div className={`relative h-44 bg-gradient-to-br ${gradientClass} overflow-hidden flex-shrink-0`}>
                {video.thumbnail_url ? (
                    <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                        <span className="text-white/80 text-xs font-medium px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
                            {PLATFORM_LABEL[video.platform] ?? video.platform}
                        </span>
                    </div>
                )}

                {/* Platform badge on top of thumbnail */}
                <div className="absolute bottom-2 left-2">
                    <span className="text-white/90 text-[10px] font-bold px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                        {PLATFORM_LABEL[video.platform] ?? video.platform}
                    </span>
                </div>

                {/* Note badge */}
                {video.notes && (
                    <div className="absolute top-2 right-2">
                        <div className="bg-amber-500/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Ghi chú
                        </div>
                    </div>
                )}

                {/* Delete button */}
                {canDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-red-600/80 backdrop-blur-sm flex items-center justify-center hover:bg-red-600 transition-all"
                    >
                        {deleting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-white" />}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 flex flex-col flex-1">
                <div>
                    <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
                        {video.title || '(Không có tiêu đề)'}
                    </h3>
                    {video.description && (
                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{video.description}</p>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-slate-500 text-xs flex-wrap">
                    <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {formatCount(video.views_count)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {formatCount(video.likes_count)}
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {formatCount(video.comments_count)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Share2 className="w-3 h-3" /> {formatCount(video.shares_count)}
                    </span>
                </div>

                {/* Notes */}
                {video.notes && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        <p className="text-amber-400 text-xs leading-relaxed">{video.notes}</p>
                    </div>
                )}

                <div className="flex-1" />

                {/* Divider */}
                <div className="border-t border-white/[0.06]" />

                {/* Added by */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span className="text-slate-400 truncate max-w-[90px]">{video.added_by_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 text-xs">
                        <Clock className="w-3 h-3" />
                        {new Date(video.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Sourcing Content (the old AI button) */}
                    {video.sourcing_url ? (
                        <a
                            href={video.sourcing_url}
                            className="h-9 flex items-center justify-center gap-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all duration-200"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Sourcing
                        </a>
                    ) : (
                        <div className="h-9 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-700 text-[10px] font-bold uppercase tracking-widest">
                            Sourcing
                        </div>
                    )}

                    {/* Open original */}
                    <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-slate-500 hover:text-white text-[10px] font-bold tracking-widest transition-all uppercase"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Mở
                    </a>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Content Card ──────────────────────────────────────────────────────────────

function ContentCard({
    item,
    index,
    onDelete,
}: {
    item: ApprovedContentItem;
    index: number;
    onDelete: (id: string) => void;
}) {
    const gradientClass = CONTENT_TYPE_COLOR[item.content_type] ?? 'from-purple-500 to-pink-500';
    const [deleting, setDeleting] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Xoá content này khỏi bộ sưu tập?')) return;
        setDeleting(true);
        onDelete(item.id);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="group relative bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 flex flex-col"
        >
            {/* Header gradient */}
            <div className={`relative h-24 bg-gradient-to-br ${gradientClass} overflow-hidden flex-shrink-0 p-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                    <span className="text-white/90 text-xs font-bold px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
                        {item.content_type_display || item.content_type}
                    </span>
                    <span className="text-white/80 text-xs px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {item.word_count} tu
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-white/60" />
                    <span className="text-white/80 text-xs font-medium">Content da duyet</span>
                </div>

                {/* Delete button */}
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-red-600/80 backdrop-blur-sm flex items-center justify-center hover:bg-red-600 transition-all"
                >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-white" />}
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 flex flex-col flex-1">
                {/* Script preview */}
                <div
                    className="cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <p className={`text-white/90 text-sm leading-relaxed whitespace-pre-wrap ${expanded ? '' : 'line-clamp-4'}`}>
                        {item.script}
                    </p>
                    {!expanded && item.script.length > 200 && (
                        <span className="text-blue-400 text-xs mt-1 inline-block hover:underline">Xem them...</span>
                    )}
                </div>

                {/* Source video info */}
                {item.source_video_title && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                            <Film className="w-3 h-3" /> Video goc
                        </div>
                        <p className="text-amber-300/80 text-xs line-clamp-2">{item.source_video_title}</p>
                    </div>
                )}

                {/* Product info */}
                {item.product_name && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Package className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span className="text-blue-300/80 text-xs truncate">{item.product_name}</span>
                        {item.product_sku && (
                            <span className="text-blue-500/60 text-[10px] ml-auto flex-shrink-0">{item.product_sku}</span>
                        )}
                    </div>
                )}

                <div className="flex-1" />
                <div className="border-t border-white/[0.06]" />

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span className="text-slate-400 truncate max-w-[90px]">{item.approved_by_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 text-xs">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                </div>

                {/* Action: open source video */}
                {item.source_video_url && (
                    <a
                        href={item.source_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-slate-500 hover:text-white text-[10px] font-bold tracking-widest transition-all uppercase"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Xem video goc
                    </a>
                )}
            </div>
        </motion.div>
    );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabId }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-28 text-center"
        >
            <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6">
                {tab === 'content' ? (
                    <FileText className="w-9 h-9 text-slate-600" />
                ) : tab === 'team' ? (
                    <Users className="w-9 h-9 text-slate-600" />
                ) : (
                    <Globe className="w-9 h-9 text-slate-600" />
                )}
            </div>
            <h3 className="text-white/80 text-xl font-semibold mb-2">
                {tab === 'content' ? 'Chưa có content nào' : 'Chưa có video nào'}
            </h3>
            <p className="text-slate-600 text-sm max-w-sm">
                {tab === 'content'
                    ? 'Chưa có content nào được duyệt. Hãy Generate Content rồi bấm "Duyệt" để lưu vào đây.'
                    : tab === 'team'
                    ? 'Leader chưa thêm video nào vào bộ sưu tập Team.'
                    : 'Manager/Admin chưa thêm video nào vào bộ sưu tập Chung.'}
            </p>
        </motion.div>
    );
}

// ─── Inner page ────────────────────────────────────────────────────────────────

function VideoLibraryInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();

    const tabParam = (searchParams?.get('tab') as TabId) || 'team';
    const [activeTab, setActiveTab] = useState<TabId>(tabParam);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlatform, setFilterPlatform] = useState<string>('all');

    const [teamVideos, setTeamVideos] = useState<LibraryVideo[]>([]);
    const [sharedVideos, setSharedVideos] = useState<LibraryVideo[]>([]);
    const [contentItems, setContentItems] = useState<ApprovedContentItem[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(true);
    const [loadingShared, setLoadingShared] = useState(true);
    const [loadingContent, setLoadingContent] = useState(true);

    const isManagement = user?.roles?.some((r) =>
        [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(r),
    ) ?? false;
    const isAdminOrManager = user?.roles?.some((r) =>
        [UserRole.ADMIN, UserRole.MANAGER].includes(r),
    ) ?? false;

    const fetchVideos = useCallback(async (type: 'TEAM' | 'SHARED', setter: (v: LibraryVideo[]) => void, setLoading: (b: boolean) => void) => {
        setLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${apiUrl}/video-library?type=${type}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setter(Array.isArray(data) ? data : []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchContent = useCallback(async () => {
        setLoadingContent(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${apiUrl}/approved-content`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setContentItems(Array.isArray(data) ? data : []);
            }
        } catch {
            // silent
        } finally {
            setLoadingContent(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos('TEAM', setTeamVideos, setLoadingTeam);
        fetchVideos('SHARED', setSharedVideos, setLoadingShared);
        fetchContent();
    }, [fetchVideos, fetchContent]);

    useEffect(() => {
        setActiveTab((searchParams?.get('tab') as TabId) || 'team');
    }, [searchParams]);

    const switchTab = (tab: TabId) => {
        setActiveTab(tab);
        router.replace(`/dashboard/video-library?tab=${tab}`, { scroll: false });
    };

    const handleDelete = async (id: string, type: 'TEAM' | 'SHARED') => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${apiUrl}/video-library/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                if (type === 'TEAM') setTeamVideos((v) => v.filter((x) => x.id !== id));
                else setSharedVideos((v) => v.filter((x) => x.id !== id));
            }
        } catch {
            // silent
        }
    };

    const handleDeleteContent = async (id: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${apiUrl}/approved-content/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setContentItems((v) => v.filter((x) => x.id !== id));
            }
        } catch {
            // silent
        }
    };

    const activeVideos = activeTab === 'team' ? teamVideos : sharedVideos;
    const filteredVideos = activeVideos.filter((v) => {
        const matchSearch =
            !searchQuery ||
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.author_username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchPlatform = filterPlatform === 'all' || v.platform === filterPlatform;
        return matchSearch && matchPlatform;
    });

    const filteredContent = contentItems.filter((c) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            c.script.toLowerCase().includes(q) ||
            c.source_video_title.toLowerCase().includes(q) ||
            (c.product_name ?? '').toLowerCase().includes(q)
        );
    });

    const isLoading = activeTab === 'content' ? loadingContent : activeTab === 'team' ? loadingTeam : loadingShared;
    const canDeleteCurrent = isAdminOrManager || (activeTab === 'team' && user?.roles?.includes(UserRole.LEADER));

    const tabs: { id: TabId; label: string; icon: React.ReactNode; count: number; loading: boolean }[] = [
        { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" />, count: teamVideos.length, loading: loadingTeam },
        { id: 'shared', label: 'Chung', icon: <Globe className="w-4 h-4" />, count: sharedVideos.length, loading: loadingShared },
        { id: 'content', label: 'Content', icon: <FileText className="w-4 h-4" />, count: contentItems.length, loading: loadingContent },
    ];

    const platforms = ['all', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'DOUYIN', 'XIAOHONGSHU'] as const;
    const platformLabels: Record<string, string> = {
        all: 'Tất cả', TIKTOK: 'TikTok', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', DOUYIN: 'Douyin', XIAOHONGSHU: 'Xiaohongshu',
    };

    const uniquePlatforms = Array.from(new Set(activeVideos.map((v) => v.platform)));

    return (
        <div className="min-h-[calc(100vh-73px)] bg-[#07090F] text-white p-6 md:p-10 -m-6 selection:bg-blue-500/30">
            <style dangerouslySetInnerHTML={{
                __html: `
                    header { background-color: #07090F !important; border-bottom-color: #151820 !important; }
                    header p { color: #f8fafc !important; }
                    body { background-color: #07090F !important; }
                    main { background-color: #07090F !important; }
                    .bg-gray-50 { background-color: #07090F !important; }
                `,
            }} />

            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto space-y-8">

                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-3 pt-4"
                >
                    <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] px-4 py-1.5 rounded-full text-sm text-slate-400 mb-2">
                        <Bookmark className="w-3.5 h-3.5 text-blue-400" />
                        Được tuyển chọn bởi Leader & Manager
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Bộ</span>
                        <span className="text-white mx-2">Sưu</span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Tập</span>
                    </h1>
                    <p className="text-slate-500 text-base font-medium max-w-xl mx-auto">
                        Video hay được Leader và Manager tuyển chọn — nguồn cảm hứng cho cả team.
                    </p>
                </motion.div>

                {/* Tab switcher */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex justify-center"
                >
                    <div className="inline-flex bg-white/[0.04] border border-white/[0.08] rounded-2xl p-1.5 gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => switchTab(tab.id)}
                                className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-slate-500'
                                }`}>
                                    {tab.loading ? '…' : tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-6"
                    >
                        {/* Stats bar — video tabs */}
                        {activeTab !== 'content' && !isLoading && activeVideos.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Tổng video', value: activeVideos.length, icon: <Bookmark className="w-4 h-4 text-blue-400" /> },
                                    { label: 'Tuần này', value: activeVideos.filter((v) => {
                                        const d = new Date(v.created_at);
                                        const now = new Date();
                                        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
                                        return diff <= 7;
                                    }).length, icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
                                    { label: activeTab === 'team' ? 'Leader đóng góp' : 'Manager đóng góp', value: new Set(activeVideos.map((v) => v.added_by_name)).size, icon: <Crown className="w-4 h-4 text-amber-400" /> },
                                    { label: 'Nền tảng', value: uniquePlatforms.length, icon: <Globe className="w-4 h-4 text-purple-400" /> },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-lg leading-none">{stat.value}</div>
                                            <div className="text-slate-600 text-xs mt-0.5">{stat.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Stats bar — content tab */}
                        {activeTab === 'content' && !isLoading && contentItems.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Tổng content', value: contentItems.length, icon: <FileText className="w-4 h-4 text-emerald-400" /> },
                                    { label: 'Tuần này', value: contentItems.filter((c) => {
                                        const d = new Date(c.created_at);
                                        const now = new Date();
                                        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
                                        return diff <= 7;
                                    }).length, icon: <TrendingUp className="w-4 h-4 text-blue-400" /> },
                                    { label: 'Người duyệt', value: new Set(contentItems.map((c) => c.approved_by_name)).size, icon: <Crown className="w-4 h-4 text-amber-400" /> },
                                    { label: 'Loại content', value: new Set(contentItems.map((c) => c.content_type)).size, icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-lg leading-none">{stat.value}</div>
                                            <div className="text-slate-600 text-xs mt-0.5">{stat.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search & Filter */}
                        {!isLoading && ((activeTab === 'content' && contentItems.length > 0) || (activeTab !== 'content' && activeVideos.length > 0)) && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder={activeTab === 'content' ? 'Tìm content...' : 'Tìm video trong bộ sưu tập...'}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                                    {activeTab !== 'content' && (
                                        <>
                                            <Filter className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                            {platforms.filter((p) => p === 'all' || uniquePlatforms.includes(p)).map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setFilterPlatform(p)}
                                                    className={`flex-shrink-0 text-xs px-3 py-2 rounded-lg border transition-all font-medium ${
                                                        filterPlatform === p
                                                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                                            : 'bg-white/[0.03] border-white/[0.07] text-slate-500 hover:text-slate-300'
                                                    }`}
                                                >
                                                    {platformLabels[p] ?? p}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (activeTab === 'content') fetchContent();
                                            else if (activeTab === 'team') fetchVideos('TEAM', setTeamVideos, setLoadingTeam);
                                            else fetchVideos('SHARED', setSharedVideos, setLoadingShared);
                                        }}
                                        className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.07] text-slate-500 hover:text-slate-300 flex items-center justify-center"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Loading */}
                        {isLoading && (
                            <div className="flex items-center justify-center py-28">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    <p className="text-slate-600 text-sm">
                                        {activeTab === 'content' ? 'Đang tải content...' : 'Đang tải bộ sưu tập...'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Grid / Empty — video tabs */}
                        {activeTab !== 'content' && !isLoading && (
                            filteredVideos.length === 0 ? (
                                <EmptyState tab={activeTab} />
                            ) : (
                                <AnimatePresence>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {filteredVideos.map((video, idx) => (
                                            <VideoCard
                                                key={video.id}
                                                video={video}
                                                index={idx}
                                                canDelete={canDeleteCurrent ?? false}
                                                onDelete={(id) => handleDelete(id, activeTab === 'team' ? 'TEAM' : 'SHARED')}
                                            />
                                        ))}
                                    </div>
                                </AnimatePresence>
                            )
                        )}

                        {/* Grid / Empty — content tab */}
                        {activeTab === 'content' && !isLoading && (
                            filteredContent.length === 0 ? (
                                <EmptyState tab="content" />
                            ) : (
                                <AnimatePresence>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {filteredContent.map((item, idx) => (
                                            <ContentCard
                                                key={item.id}
                                                item={item}
                                                index={idx}
                                                onDelete={handleDeleteContent}
                                            />
                                        ))}
                                    </div>
                                </AnimatePresence>
                            )
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Page export ───────────────────────────────────────────────────────────────

export default function VideoLibraryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[calc(100vh-73px)] bg-[#07090F] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <VideoLibraryInner />
        </Suspense>
    );
}
