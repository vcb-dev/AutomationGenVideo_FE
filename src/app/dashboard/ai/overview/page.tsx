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

export default function OverviewPage() {
    const { user } = useAuthStore();
    const [voicesCount, setVoicesCount] = useState(0);
    const [teams, setTeams] = useState<TeamApi[]>([]);
    const [teamsLoaded, setTeamsLoaded] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Spent Card - not tracked yet */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Chi tiêu đã dùng</span>
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold text-gray-400 italic">Chưa có dữ liệu</h3>
                            <p className="text-xs text-gray-400 mt-2">Tính năng theo dõi chi tiêu đang được phát triển</p>
                        </div>
                    </div>

                    {/* Tokens Card - not tracked yet */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Token tiêu thụ</span>
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                                <Coins className="w-5 h-5 text-violet-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold text-gray-400 italic">Chưa có dữ liệu</h3>
                            <p className="text-xs text-gray-400 mt-2">Tính năng theo dõi token đang được phát triển</p>
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
                                                <th className="pr-6 py-3 text-right">Ngày tham gia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {adminSelectedTeam.members.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-6 text-center text-xs text-gray-400">Team chưa có thành viên</td>
                                                </tr>
                                            ) : adminSelectedTeam.members.map((member) => (
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
                                                    <td className="pr-6 py-4 text-right text-xs text-gray-500">
                                                        {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                                                    </td>
                                                </tr>
                                            ))}
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
                                                <th className="pr-6 py-3 text-right">Ngày tham gia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {leaderTeamData.members.map((member) => (
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
                                                    <td className="pr-6 py-4 text-right text-xs text-gray-500">
                                                        {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 3. MEMBER LAYOUT (Personal activity log - not tracked yet) */}
                {isMemberOnly && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-950 text-base">Nhật ký tác vụ gần nhất</h3>
                            <span className="text-xs text-gray-400">Chỉ hiển thị các tác vụ của bạn</span>
                        </div>

                        <div className="py-10 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                                <Volume2 className="w-5 h-5 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400 italic">Chưa có dữ liệu</p>
                            <p className="text-xs text-gray-400 mt-1">Tính năng ghi nhật ký hoạt động đang được phát triển</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
