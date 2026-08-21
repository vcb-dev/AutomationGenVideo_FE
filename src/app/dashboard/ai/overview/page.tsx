'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    DollarSign,
    Coins,
    Mic,
    Plus,
    Volume2,
    ChevronRight,
    Building2,
    UserCheck,
    CalendarRange,
    Trophy,
    Sparkles,
    Zap,
    TrendingUp,
    Wand2,
    DownloadCloud,
    LayoutDashboard,
    ArrowUpRight,
    Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/api-client';
import {
    RANGE_PRESETS,
    RangePresetId,
    formatRangeLabel,
    matchPreset,
    normalizeRange,
    resolvePreset,
} from '@/lib/ai-usage/usage-range';
import { DatePicker } from '@/components/ui/DatePicker';
import { UsageByUser, rankUsage } from '@/lib/ai-usage/usage-ranking';

const getApiUrl = () => {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
};

interface TeamMemberApi {
    id: string;
    user_id: string;
    joined_at: string;
    user: { id: string; full_name: string; email: string; roles: string[] };
}

interface TeamApi {
    id: string;
    name: string;
    leader_id: string | null;
    brand_type: string;
    market: string;
    is_active: boolean;
    leader: { id: string; full_name: string; email: string } | null;
    members: TeamMemberApi[];
    _count: { members: number; tasks: number };
}

interface UsageStats {
    pricing?: { vnd_per_1k_chars: number };
    total: { characters: number; tts_count: number; clone_count: number; cost_vnd?: number };
    by_user: UsageByUser[];
}

export default function OverviewPage() {
    const { user } = useAuthStore();
    const [voicesCount, setVoicesCount] = useState(0);
    const [teams, setTeams] = useState<TeamApi[]>([]);
    const [teamsLoaded, setTeamsLoaded] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [usageLoaded, setUsageLoaded] = useState(false);
    const [range, setRange] = useState(() => resolvePreset('this_month'));

    const rangeLabel = formatRangeLabel(range);
    const activePreset = matchPreset(range);

    const applyPreset = (preset: RangePresetId) => setRange(resolvePreset(preset));

    useEffect(() => {
        const { from, to } = normalizeRange(range);
        if (!from || !to) return;

        let cancelled = false;
        const fetchUsage = async () => {
            setUsageLoaded(false);
            try {
                const res = await fetchWithAuth(
                    `${getApiUrl()}/ai/voice/usage/stats?date_from=${from}&date_to=${to}`,
                );
                if (!res.ok) throw new Error('Không thể lấy thống kê tiêu dùng');
                const data = await res.json();
                if (!cancelled && data.success) setUsageStats(data);
            } catch (error) {
                console.error('Lỗi khi tải thống kê tiêu dùng:', error);
                if (!cancelled) toast.error('Không thể tải thống kê tiêu dùng AI');
            } finally {
                if (!cancelled) setUsageLoaded(true);
            }
        };
        fetchUsage();
        return () => {
            cancelled = true;
        };
    }, [range]);

    const rankedUsage = rankUsage(usageStats?.by_user ?? []);
    const usageByUserId = new Map(rankedUsage.map(u => [u.user_id, u]));
    const vndPer1kChars = usageStats?.pricing?.vnd_per_1k_chars ?? 0;

    useEffect(() => {
        const fetchVoicesCount = async () => {
            try {
                const res = await fetchWithAuth(`${getApiUrl()}/ai/voice/list`);
                if (!res.ok) throw new Error('Không thể lấy danh sách giọng nói');
                const data = await res.json();
                if (data.success && data.voices) {
                    const clonedCount = data.voices.filter((v: any) => v.is_cloned).length;
                    setVoicesCount(clonedCount);
                }
            } catch (error) {
                console.error('Lỗi khi tải số lượng voice:', error);
            }
        };
        fetchVoicesCount();
    }, []);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const res = await fetchWithAuth(`${getApiUrl()}/task-auto/teams`);
                if (!res.ok) throw new Error('Không thể lấy danh sách team');
                const data = await res.json();
                setTeams(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Lỗi khi tải danh sách team:', error);
            } finally {
                setTeamsLoaded(true);
            }
        };
        fetchTeams();
    }, []);

    const isAdmin = user?.roles?.includes(UserRole.ADMIN);
    const isLeader = user?.roles?.includes(UserRole.LEADER) && !isAdmin;
    const isMemberOnly = !isAdmin && !isLeader;

    useEffect(() => {
        if (isAdmin && !selectedTeamId && teams.length > 0) {
            setSelectedTeamId(teams[0].id);
        }
    }, [isAdmin, teams, selectedTeamId]);

    const leaderTeamData =
        teams.find((t) => t.leader_id === user?.id) ||
        teams.find((t) => t.members.some((m) => m.user_id === user?.id)) ||
        null;

    const adminSelectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0] || null;
    const totalMembers = teams.reduce((acc, t) => acc + (t._count?.members ?? 0), 0);

    const leaderMemberIds = new Set((leaderTeamData?.members ?? []).map((m) => m.user_id));
    const visibleRanking = isLeader
        ? rankedUsage.filter((row) => leaderMemberIds.has(row.user_id) || row.user_id === user?.id)
        : rankedUsage;

    const getUserTeamName = (row: UsageByUser) => {
        if (row.team) return row.team;
        const matchingTeams = teams
            .filter((t) => t.members.some((m) => m.user_id === row.user_id) || t.leader_id === row.user_id)
            .map((t) => t.name);
        return matchingTeams.length > 0 ? matchingTeams.join(', ') : null;
    };

    return (
        <div className="mx-auto max-w-7xl pb-16 space-y-6">
            {/* HERO BANNER */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-white/10">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-bold tracking-wide">
                                <Sparkles className="w-3.5 h-3.5" />
                                {isAdmin ? 'ADMIN CONTROL CENTER' : isLeader ? `LEADER PANEL • ${leaderTeamData?.name ?? user?.team ?? ''}` : 'MEMBER DASHBOARD'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                <Zap className="w-3 h-3" />
                                AI Engine Active
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Tổng quan Tiện ích &amp; Công nghệ AI
                        </h1>
                        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
                            {isAdmin
                                ? 'Theo dõi toàn diện lượng tài nguyên AI tiêu thụ, hiệu năng sản xuất giọng đọc MiniMax và quản lý các nhóm sáng tạo.'
                                : isLeader
                                ? `Theo dõi mức độ sử dụng AI và năng suất của toàn bộ thành viên trong nhóm ${leaderTeamData?.name ?? 'của bạn'}.`
                                : 'Thống kê lượng ký tự, giọng clone và chi phí tạo giọng nói cá nhân của bạn.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                            href="/dashboard/ai/clone-voice"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-violet-600/30 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Tạo giọng nói mới
                        </Link>
                        <Link
                            href="/dashboard/ai/content-transform"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-md border border-white/10 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <Wand2 className="w-4 h-4 text-violet-300" />
                            Biến đổi nội dung
                        </Link>
                    </div>
                </div>

                {/* QUICK NAVIGATION STRIP */}
                <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Link
                        href="/dashboard/ai/clone-voice"
                        className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300">
                                <Mic className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">Clone Voice</p>
                                <p className="text-[10px] text-slate-400">Nhân bản giọng đọc</p>
                            </div>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    </Link>

                    <Link
                        href="/dashboard/ai/content-transform"
                        className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                                <Wand2 className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Script AI</p>
                                <p className="text-[10px] text-slate-400">Viết lại kịch bản</p>
                            </div>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    </Link>

                    <Link
                        href="/dashboard/tools/video-downloader"
                        className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                                <DownloadCloud className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">Downloader</p>
                                <p className="text-[10px] text-slate-400">Tải video đa nền tảng</p>
                            </div>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    </Link>

                    <Link
                        href="/dashboard/tools/lucky-spin"
                        className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Vòng quay</p>
                                <p className="text-[10px] text-slate-400">Minigame may mắn</p>
                            </div>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    </Link>
                </div>
            </div>

            {/* TIME FILTER & DATE RANGE BAR */}
            <div className="relative z-30 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                    <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                        <CalendarRange className="w-4 h-4" />
                    </div>
                    <span>Khoảng thời gian thống kê:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold dark:bg-white/[0.06] dark:text-slate-300">
                        {rangeLabel}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.05] p-1 rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
                        {RANGE_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => applyPreset(preset.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    activePreset === preset.id
                                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <DatePicker
                            value={range.from}
                            onChange={(val) => setRange((prev) => ({ ...prev, from: val }))}
                            placeholder="Từ ngày"
                            className="w-[142px]"
                        />
                        <span className="text-xs font-bold text-slate-400">➔</span>
                        <DatePicker
                            value={range.to}
                            onChange={(val) => setRange((prev) => ({ ...prev, to: val }))}
                            placeholder="Đến ngày"
                            className="w-[142px]"
                            align="right"
                        />
                    </div>
                </div>
            </div>

            {/* 4 STAT KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ký tự MiniMax */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-white/[0.08] dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Điểm âm thanh</span>
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        {!usageLoaded ? (
                            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />
                        ) : (
                            <>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {(usageStats?.total.characters ?? 0).toLocaleString('vi-VN')}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ký tự tính phí</span>
                                    <span>({rangeLabel})</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Tiền đã tiêu */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-white/[0.08] dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chi phí tiêu thụ</span>
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                            <Coins className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        {!usageLoaded ? (
                            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />
                        ) : vndPer1kChars > 0 ? (
                            <>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {(usageStats?.total.cost_vnd ?? 0).toLocaleString('vi-VN')}đ
                                </h3>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Đơn giá: <span className="font-semibold text-amber-600">{vndPer1kChars.toLocaleString('vi-VN')}đ</span> / 1k ký tự
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold text-slate-400">Chưa cấu hình giá</h3>
                                <p className="mt-1 text-xs text-slate-400">Theo dõi định mức ký tự</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Lượt TTS & Clone */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-white/[0.08] dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lượt tạo giọng</span>
                        <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                            <Volume2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        {!usageLoaded ? (
                            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />
                        ) : (
                            <>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {(usageStats?.total.tts_count ?? 0).toLocaleString('vi-VN')}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Lượt TTS • <span className="font-bold text-violet-600">{usageStats?.total.clone_count ?? 0}</span> giọng clone
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Thư viện giọng đã clone */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-white/[0.08] dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thư viện giọng</span>
                        <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400">
                            <Mic className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {voicesCount}
                        </h3>
                        <Link
                            href="/dashboard/ai/clone-voice"
                            className="mt-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 flex items-center gap-1"
                        >
                            <span>Xem kho giọng MiniMax</span>
                            <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* LEADERBOARD SECTION */}
            {!isMemberOnly && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60 overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                    <Trophy className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                    Bảng xếp hạng Tiêu dùng AI ({rangeLabel})
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {isLeader
                                    ? 'Danh sách thành viên trong team của bạn xếp theo mức độ sử dụng tài nguyên AI.'
                                    : 'Xếp hạng toàn bộ nhân sự sáng tạo theo tổng số ký tự MiniMax phát sinh.'}
                            </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05]">
                            {visibleRanking.length} người dùng có phát sinh
                        </span>
                    </div>

                    {!usageLoaded ? (
                        <div className="p-8 text-center text-sm text-slate-400">Đang tải bảng xếp hạng…</div>
                    ) : visibleRanking.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-400 italic">
                            Chưa có dữ liệu tiêu dùng AI trong khoảng thời gian này.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <th className="pl-6 py-3.5 w-14">Hạng</th>
                                        <th className="py-3.5">Người dùng</th>
                                        <th className="py-3.5">Team</th>
                                        <th className="py-3.5 text-right">Điểm đã tiêu</th>
                                        <th className="py-3.5 min-w-[150px]">Tỉ trọng</th>
                                        <th className="py-3.5 text-right">Lượt TTS</th>
                                        <th className="py-3.5 text-right">Giọng clone</th>
                                        {vndPer1kChars > 0 && <th className="py-3.5 text-right">Chi phí</th>}
                                        <th className="pr-6 py-3.5 text-right">Lần cuối dùng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                                    {visibleRanking.map((row) => {
                                        const teamName = getUserTeamName(row);
                                        const rankBadge =
                                            row.rank === 1
                                                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300'
                                                : row.rank === 2
                                                ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200'
                                                : row.rank === 3
                                                ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300'
                                                : 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400';

                                        return (
                                            <tr
                                                key={row.user_id}
                                                className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="pl-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-bold text-xs border ${rankBadge}`}
                                                    >
                                                        {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <p className="font-bold text-slate-900 dark:text-white">{row.full_name}</p>
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{row.email}</p>
                                                </td>
                                                <td className="py-4">
                                                    {teamName ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {teamName.split(',').map((t, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50"
                                                                >
                                                                    {t.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">Chưa phân team</span>
                                                    )}
                                                </td>
                                                <td className="py-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                                                    {row.characters.toLocaleString('vi-VN')}
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all"
                                                                style={{ width: `${Math.min(100, Math.max(2, row.share_percent))}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 w-12 text-right">
                                                            {row.share_percent.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right font-bold text-violet-600 dark:text-violet-400">
                                                    {row.tts_count}
                                                </td>
                                                <td className="py-4 text-right font-bold text-cyan-600 dark:text-cyan-400">
                                                    {row.clone_count}
                                                </td>
                                                {vndPer1kChars > 0 && (
                                                    <td className="py-4 text-right font-bold text-amber-600 dark:text-amber-400">
                                                        {(row.cost_vnd ?? 0).toLocaleString('vi-VN')}đ
                                                    </td>
                                                )}
                                                <td className="pr-6 py-4 text-right text-slate-500 dark:text-slate-400">
                                                    {new Date(row.last_used_at).toLocaleDateString('vi-VN')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ADMIN TEAM MANAGEMENT & DRILL DOWN */}
            {isAdmin && (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-500" />
                                    Danh sách Team ({teams.length}) — {totalMembers} Thành viên
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Bấm vào từng nhóm để xem chi tiết danh sách và mức độ tiêu dùng của từng người.
                                </p>
                            </div>
                        </div>

                        {!teamsLoaded ? (
                            <div className="p-6 text-center text-sm text-slate-400">Đang tải danh sách nhóm…</div>
                        ) : teams.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-400">Chưa có team nào trong hệ thống.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {teams.map((team) => {
                                    const isSelected = selectedTeamId === team.id;
                                    return (
                                        <button
                                            key={team.id}
                                            onClick={() => setSelectedTeamId(team.id)}
                                            className={`p-4 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between h-32 ${
                                                isSelected
                                                    ? 'bg-violet-50/70 border-violet-400 shadow-md shadow-violet-500/10 dark:bg-violet-950/30 dark:border-violet-500'
                                                    : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <h4 className={`text-sm font-bold ${isSelected ? 'text-violet-900 dark:text-violet-300' : 'text-slate-900 dark:text-white'}`}>
                                                        {team.name}
                                                    </h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                        isSelected ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200' : 'bg-slate-100 text-slate-600 dark:bg-white/[0.08] dark:text-slate-300'
                                                    }`}>
                                                        {team._count?.members ?? team.members.length} người
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                                    Leader: <span className="font-semibold text-slate-600 dark:text-slate-300">{team.leader?.full_name ?? 'Chưa có'}</span>
                                                </p>
                                            </div>

                                            <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] w-full flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 uppercase font-semibold">{team.brand_type}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${team.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-400'}`}>
                                                    {team.is_active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Team Drill-down Table */}
                    {adminSelectedTeam && (
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60 overflow-hidden">
                            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                            Thành viên {adminSelectedTeam.name}
                                        </h3>
                                        <span className="text-xs text-slate-400 font-medium">
                                            (Leader: {adminSelectedTeam.leader?.full_name ?? 'Chưa có'})
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Mức độ tiêu dùng và lượt phát sinh của từng nhân sự trong nhóm.
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 px-3 py-1.5 rounded-xl border border-violet-200/60 dark:border-violet-800/50">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Đang xem: {adminSelectedTeam.name}</span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="pl-6 py-3.5">Tên thành viên</th>
                                            <th className="py-3.5">Email</th>
                                            <th className="py-3.5">Vai trò</th>
                                            <th className="py-3.5 text-right">Điểm đã tiêu</th>
                                            <th className="py-3.5 text-right">Lượt TTS</th>
                                            <th className="py-3.5 text-right">Giọng clone</th>
                                            <th className="pr-6 py-3.5 text-right">Ngày tham gia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                                        {adminSelectedTeam.members.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-400 italic">Nhóm chưa có thành viên</td>
                                            </tr>
                                        ) : (
                                            adminSelectedTeam.members.map((member) => {
                                                const usage = usageByUserId.get(member.user_id);
                                                return (
                                                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                        <td className="pl-6 py-4 font-bold text-slate-900 dark:text-white">
                                                            {member.user.full_name}
                                                        </td>
                                                        <td className="py-4 text-slate-500 dark:text-slate-400">
                                                            {member.user.email}
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {member.user.roles.map((role) => (
                                                                    <span
                                                                        key={role}
                                                                        className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md font-bold tracking-wide uppercase"
                                                                    >
                                                                        {role}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                                                            {(usage?.characters ?? 0).toLocaleString('vi-VN')}
                                                        </td>
                                                        <td className="py-4 text-right font-bold text-violet-600 dark:text-violet-400">
                                                            {usage?.tts_count ?? 0}
                                                        </td>
                                                        <td className="py-4 text-right font-bold text-cyan-600 dark:text-cyan-400">
                                                            {usage?.clone_count ?? 0}
                                                        </td>
                                                        <td className="pr-6 py-4 text-right text-slate-500 dark:text-slate-400">
                                                            {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MEMBER INDIVIDUAL CONSUMPTION CARD */}
            {isMemberOnly && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                            Mức tiêu dùng cá nhân của bạn ({rangeLabel})
                        </h3>
                        <span className="text-xs text-slate-400">Chỉ tính tác vụ do bạn thực hiện</span>
                    </div>

                    {(() => {
                        const mine = user?.id ? usageByUserId.get(user.id) : undefined;
                        if (!usageLoaded) {
                            return <div className="p-8 text-center text-sm text-slate-400">Đang tải dữ liệu…</div>;
                        }
                        if (!mine) {
                            return (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                                        <Volume2 className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm text-slate-400 italic">
                                        Bạn chưa phát sinh lượt tạo giọng AI nào trong khoảng thời gian này.
                                    </p>
                                </div>
                            );
                        }
                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">Điểm đã tiêu</p>
                                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-2">
                                        {mine.characters.toLocaleString('vi-VN')}
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 text-center">
                                    <p className="text-xs text-violet-700 dark:text-violet-400 font-bold uppercase tracking-wider">Lượt tạo giọng (TTS)</p>
                                    <p className="text-3xl font-black text-violet-700 dark:text-violet-300 mt-2">
                                        {mine.tts_count}
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/40 text-center">
                                    <p className="text-xs text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">Giọng đã clone</p>
                                    <p className="text-3xl font-black text-cyan-700 dark:text-cyan-300 mt-2">
                                        {mine.clone_count}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
