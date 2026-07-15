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
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import toast from 'react-hot-toast';

// Helper to get API URL
const getApiUrl = () => {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
};

const getAuthToken = () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);

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

interface UsageByUser {
    user_id: string;
    full_name: string;
    email: string;
    characters: number;
    tts_count: number;
    clone_count: number;
    last_used_at: string;
}

interface UsageStats {
    pricing?: { vnd_per_1k_chars: number };
    total: { characters: number; tts_count: number; clone_count: number; cost_vnd?: number };
    by_user: UsageByUser[];
}

function firstOfMonthStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

export default function OverviewPage() {
    const { user } = useAuthStore();
    const [voicesCount, setVoicesCount] = useState(0);
    const [teams, setTeams] = useState<TeamApi[]>([]);
    const [teamsLoaded, setTeamsLoaded] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [usageLoaded, setUsageLoaded] = useState(false);

    // Fetch voice usage stats (điểm TTS + số clone) — tháng hiện tại
    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const token = getAuthToken();
                const res = await fetch(
                    `${getApiUrl()}/ai/voice/usage/stats?date_from=${firstOfMonthStr()}&date_to=${todayStr()}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                );
                if (!res.ok) throw new Error('Không thể lấy thống kê tiêu dùng');
                const data = await res.json();
                if (data.success) setUsageStats(data);
            } catch (error) {
                console.error('Lỗi khi tải thống kê tiêu dùng:', error);
                toast.error('Không thể tải thống kê tiêu dùng AI');
            } finally {
                setUsageLoaded(true);
            }
        };
        fetchUsage();
    }, []);

    const usageByUserId = new Map((usageStats?.by_user ?? []).map(u => [u.user_id, u]));

    // Fetch real voices count from backend
    useEffect(() => {
        const fetchVoicesCount = async () => {
            try {
                const token = getAuthToken();
                const res = await fetch(`${getApiUrl()}/ai/voice/list`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error('Không thể lấy danh sách giọng nói');
                const data = await res.json();
                if (data.success && data.voices) {
                    const clonedCount = data.voices.filter((v: any) => v.is_cloned).length;
                    setVoicesCount(clonedCount);
                }
            } catch (error) {
                console.error('Lỗi khi tải số lượng voice:', error);
                toast.error('Không thể tải số lượng giọng nói đã clone');
            }
        };
        fetchVoicesCount();
    }, []);

    // Fetch real teams + members from backend
    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const token = getAuthToken();
                const res = await fetch(`${getApiUrl()}/task-auto/teams`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error('Không thể lấy danh sách team');
                const data = await res.json();
                setTeams(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Lỗi khi tải danh sách team:', error);
                toast.error('Không thể tải danh sách team');
            } finally {
                setTeamsLoaded(true);
            }
        };
        fetchTeams();
    }, []);

    // Determine primary role for viewing layout
    const isAdmin = user?.roles?.includes(UserRole.ADMIN);
    const isLeader = user?.roles?.includes(UserRole.LEADER) && !isAdmin;
    const isMemberOnly = !isAdmin && !isLeader;

    // Auto select first team for Admin to prevent empty screen
    useEffect(() => {
        if (isAdmin && !selectedTeamId && teams.length > 0) {
            setSelectedTeamId(teams[0].id);
        }
    }, [isAdmin, teams, selectedTeamId]);

    // Leader gets their own team (as leader, or as a member if not set as leader)
    const leaderTeamData =
        teams.find((t) => t.leader_id === user?.id) ||
        teams.find((t) => t.members.some((m) => m.user_id === user?.id)) ||
        null;

    // Selected team for Admin drill down
    const adminSelectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0] || null;

    const totalMembers = teams.reduce((acc, t) => acc + (t._count?.members ?? 0), 0);

    return (
        <div className="min-h-screen bg-gray-50 -m-6 pb-12">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold uppercase tracking-wider">
                                {isAdmin ? 'ADMIN PANEL' : isLeader ? `LEADER PANEL - ${leaderTeamData?.name ?? user?.team ?? ''}` : 'MEMBER PANEL'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mt-2">Tổng quan Tiện ích AI</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {isAdmin
                                ? 'Quản lý toàn bộ team và giọng nói clone trong hệ thống.'
                                : isLeader
                                ? `Xem danh sách thành viên trong ${leaderTeamData?.name ?? 'team của bạn'}.`
                                : 'Theo dõi các giọng nói bạn đã clone.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/ai/clone-voice"
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-violet-200 hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Plus className="w-4 h-4" />
                            Tạo giọng nói mới
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

                {/* ─────────────────────────── STATS CARDS ─────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Điểm âm thanh đã tiêu (usage_characters MiniMax tính phí) */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Điểm âm thanh đã tiêu</span>
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            {!usageLoaded ? (
                                <h3 className="text-lg font-semibold text-gray-400 italic">Đang tải...</h3>
                            ) : (
                                <>
                                    <div className="flex items-baseline gap-1">
                                        <h3 className="text-2xl font-bold text-gray-900">{(usageStats?.total.characters ?? 0).toLocaleString('vi-VN')}</h3>
                                        <span className="text-xs text-gray-400">điểm (tháng này)</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">= số ký tự MiniMax tính phí khi tạo giọng nói</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tiền đã tiêu (quy đổi từ điểm theo đơn giá gói MiniMax) */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Đã tiêu hết</span>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                <Coins className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            {!usageLoaded ? (
                                <h3 className="text-lg font-semibold text-gray-400 italic">Đang tải...</h3>
                            ) : (usageStats?.pricing?.vnd_per_1k_chars ?? 0) > 0 ? (
                                <>
                                    <div className="flex items-baseline gap-1">
                                        <h3 className="text-2xl font-bold text-gray-900">{(usageStats?.total.cost_vnd ?? 0).toLocaleString('vi-VN')}đ</h3>
                                        <span className="text-xs text-gray-400">(tháng này)</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Đơn giá {(usageStats?.pricing?.vnd_per_1k_chars ?? 0).toLocaleString('vi-VN')}đ / 1.000 ký tự
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-semibold text-gray-400">Chưa cấu hình giá</h3>
                                    <p className="text-xs text-gray-400 mt-2">Set MINIMAX_VND_PER_1K_CHARS ở BE để hiển thị tiền</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Lượt sử dụng */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Lượt sử dụng</span>
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                                <Coins className="w-5 h-5 text-violet-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            {!usageLoaded ? (
                                <h3 className="text-lg font-semibold text-gray-400 italic">Đang tải...</h3>
                            ) : (
                                <>
                                    <div className="flex items-baseline gap-1">
                                        <h3 className="text-2xl font-bold text-gray-900">{usageStats?.total.tts_count ?? 0}</h3>
                                        <span className="text-xs text-gray-400">lượt tạo giọng · {usageStats?.total.clone_count ?? 0} giọng clone (tháng này)</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Thống kê từ khi bật theo dõi tiêu dùng</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Voices Card - real data (system-wide, not attributable per team/member yet) */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Giọng nói đã clone</span>
                            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                                <Mic className="w-5 h-5 text-cyan-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-2xl font-bold text-gray-900">{voicesCount}</h3>
                                <span className="text-xs text-gray-400">giọng (toàn hệ thống)</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-3 text-xs text-cyan-600 font-medium">
                                <span>Thư viện MiniMax Audio</span>
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─────────────────────────── INTERACTIVE SECTIONS BY ROLE ─────────────────────────── */}

                {/* 1. ADMIN LAYOUT (Teams & Drill-down members) */}
                {isAdmin && (
                    <div className="space-y-6">
                        {/* Team overview List */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-950 text-base flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    Danh sách Team ({teams.length}) — {totalMembers} thành viên
                                </h3>
                                <span className="text-xs text-gray-400">Chọn một team bên dưới để xem chi tiết từng người</span>
                            </div>

                            {!teamsLoaded ? (
                                <p className="text-sm text-gray-400 py-6 text-center">Đang tải danh sách team...</p>
                            ) : teams.length === 0 ? (
                                <p className="text-sm text-gray-400 py-6 text-center">Chưa có team nào trong hệ thống</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {teams.map((team) => {
                                        const isSelected = selectedTeamId === team.id;
                                        return (
                                            <button
                                                key={team.id}
                                                onClick={() => setSelectedTeamId(team.id)}
                                                className={`p-5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between h-32
                                                    ${isSelected
                                                        ? 'bg-violet-50/50 border-violet-400 shadow-md shadow-violet-50'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50/50 hover:border-gray-300'}`}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`text-sm font-bold ${isSelected ? 'text-violet-800' : 'text-gray-900'}`}>{team.name}</h4>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase
                                                            ${isSelected ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {team._count?.members ?? team.members.length} người
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 mt-1">Leader: {team.leader?.full_name ?? 'Chưa có'}</p>
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-gray-100 w-full flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-400 uppercase font-semibold">{team.brand_type}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${team.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                        {team.is_active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Team Member Drill-down table */}
                        {adminSelectedTeam && (
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm transition-all duration-200">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-950 text-base">Thành viên {adminSelectedTeam.name}</h3>
                                            <span className="text-xs text-gray-400 font-medium">({adminSelectedTeam.leader?.full_name ?? 'Chưa có leader'} quản lý)</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">Danh sách các cá nhân thuộc nhóm</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-violet-700 bg-violet-50 px-3 py-1.5 rounded-xl border border-violet-100">
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Đang lọc theo: {adminSelectedTeam.name}</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto -mx-6">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                                <th className="pl-6 py-3">Tên thành viên</th>
                                                <th className="py-3">Email</th>
                                                <th className="py-3">Vai trò hệ thống</th>
                                                <th className="py-3 text-right">Điểm đã tiêu</th>
                                                <th className="py-3 text-right">Lượt TTS</th>
                                                <th className="py-3 text-right">Giọng clone</th>
                                                <th className="pr-6 py-3 text-right">Ngày tham gia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {adminSelectedTeam.members.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="py-6 text-center text-xs text-gray-400">Team chưa có thành viên</td>
                                                </tr>
                                            ) : adminSelectedTeam.members.map((member) => {
                                                const usage = usageByUserId.get(member.user_id);
                                                return (
                                                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="pl-6 py-4">
                                                        <p className="text-xs font-semibold text-gray-800">{member.user.full_name}</p>
                                                    </td>
                                                    <td className="py-4 text-xs text-gray-500">
                                                        {member.user.email}
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {member.user.roles.map((role) => (
                                                                <span key={role} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-semibold tracking-wider">
                                                                    {role}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-right text-xs font-bold text-green-700">
                                                        {(usage?.characters ?? 0).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td className="py-4 text-right text-xs font-semibold text-violet-700">
                                                        {usage?.tts_count ?? 0}
                                                    </td>
                                                    <td className="py-4 text-right text-xs font-semibold text-cyan-700">
                                                        {usage?.clone_count ?? 0}
                                                    </td>
                                                    <td className="pr-6 py-4 text-right text-xs text-gray-500">
                                                        {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. LEADER LAYOUT (members of leader's team) */}
                {isLeader && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        {!teamsLoaded ? (
                            <p className="text-sm text-gray-400 py-6 text-center">Đang tải dữ liệu team...</p>
                        ) : !leaderTeamData ? (
                            <p className="text-sm text-gray-400 py-6 text-center">Bạn chưa được gán vào team nào</p>
                        ) : (
                            <>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="font-bold text-gray-950 text-base">Thành viên trong {leaderTeamData.name}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Danh sách các thành viên trong nhóm bạn quản lý</p>
                                    </div>
                                    <div className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl bg-gray-50 font-medium">
                                        Tổng thành viên: {leaderTeamData.members.length} người
                                    </div>
                                </div>

                                <div className="overflow-x-auto -mx-6">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                                <th className="pl-6 py-3">Họ và tên</th>
                                                <th className="py-3">Email liên hệ</th>
                                                <th className="py-3">Vai trò hệ thống</th>
                                                <th className="py-3 text-right">Điểm đã tiêu</th>
                                                <th className="py-3 text-right">Lượt TTS</th>
                                                <th className="py-3 text-right">Giọng clone</th>
                                                <th className="pr-6 py-3 text-right">Ngày tham gia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {leaderTeamData.members.map((member) => {
                                                const usage = usageByUserId.get(member.user_id);
                                                return (
                                                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="pl-6 py-4">
                                                        <p className="text-xs font-semibold text-gray-800">{member.user.full_name}</p>
                                                    </td>
                                                    <td className="py-4 text-xs text-gray-500">
                                                        {member.user.email}
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {member.user.roles.map((role) => (
                                                                <span key={role} className="text-[9px] px-1.5 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-md font-semibold tracking-wide uppercase">
                                                                    {role}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-right text-xs font-bold text-green-700">
                                                        {(usage?.characters ?? 0).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td className="py-4 text-right text-xs font-semibold text-violet-700">
                                                        {usage?.tts_count ?? 0}
                                                    </td>
                                                    <td className="py-4 text-right text-xs font-semibold text-cyan-700">
                                                        {usage?.clone_count ?? 0}
                                                    </td>
                                                    <td className="pr-6 py-4 text-right text-xs text-gray-500">
                                                        {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 3. MEMBER LAYOUT (Tiêu dùng cá nhân tháng này) */}
                {isMemberOnly && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-950 text-base">Tiêu dùng của bạn (tháng này)</h3>
                            <span className="text-xs text-gray-400">Chỉ tính các tác vụ của bạn</span>
                        </div>

                        {(() => {
                            const mine = user?.id ? usageByUserId.get(user.id) : undefined;
                            if (!usageLoaded) {
                                return <p className="text-sm text-gray-400 py-6 text-center">Đang tải...</p>;
                            }
                            if (!mine) {
                                return (
                                    <div className="py-10 flex flex-col items-center justify-center text-center">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                                            <Volume2 className="w-5 h-5 text-gray-300" />
                                        </div>
                                        <p className="text-sm text-gray-400 italic">Bạn chưa dùng tính năng giọng nói tháng này</p>
                                    </div>
                                );
                            }
                            return (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center">
                                        <p className="text-xs text-green-700 font-semibold">Điểm đã tiêu</p>
                                        <p className="text-2xl font-black text-green-700 mt-1">{mine.characters.toLocaleString('vi-VN')}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 text-center">
                                        <p className="text-xs text-violet-700 font-semibold">Lượt tạo giọng (TTS)</p>
                                        <p className="text-2xl font-black text-violet-700 mt-1">{mine.tts_count}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100 text-center">
                                        <p className="text-xs text-cyan-700 font-semibold">Giọng đã clone</p>
                                        <p className="text-2xl font-black text-cyan-700 mt-1">{mine.clone_count}</p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

            </div>
        </div>
    );
}
