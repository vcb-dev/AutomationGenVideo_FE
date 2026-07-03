'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    DollarSign,
    Coins,
    Mic,
    Users,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
    Plus,
    Volume2,
    Calendar,
    ChevronRight,
    Building2,
    UserCheck,
    ChevronDown,
    Filter,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import toast from 'react-hot-toast';

// Helper to get API URL
const getApiUrl = () => {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
};

// Format currency
const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function OverviewPage() {
    const { user } = useAuthStore();
    const [voicesCount, setVoicesCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    // Fetch real voices count from backend
    useEffect(() => {
        const fetchVoicesCount = async () => {
            try {
                const res = await fetch(`${getApiUrl()}/ai/voice/list`);
                if (!res.ok) throw new Error('Không thể lấy danh sách giọng nói');
                const data = await res.json();
                if (data.success && data.voices) {
                    const clonedCount = data.voices.filter((v: any) => v.is_cloned).length;
                    setVoicesCount(clonedCount);
                }
            } catch (error) {
                console.error('Lỗi khi tải số lượng voice:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchVoicesCount();
    }, []);

    // Determine primary role for viewing layout
    const isAdmin = user?.roles?.includes(UserRole.ADMIN);
    const isLeader = user?.roles?.includes(UserRole.LEADER) && !isAdmin;
    const isMemberOnly = !isAdmin && !isLeader;

    const userTeam = user?.team || 'Team Đồ Da';

    // Mock data for teams and members structure
    const teamsData = [
        {
            id: 'team-do-da',
            name: 'Team Đồ Da',
            leaderName: 'Nguyễn Công Toàn',
            spent: 1340000,
            tokens: 536000,
            voices: voicesCount + 5 || 8,
            members: [
                { name: 'Trần Văn Hưng', email: 'hung.tv@vienchibao.com', spent: 540000, tokens: 215000, voices: 4, role: 'EDITOR' },
                { name: 'Lê Thị Thu', email: 'thu.lt@vienchibao.com', spent: 480000, tokens: 190000, voices: 3, role: 'CONTENT' },
                { name: 'Phạm Minh Đức', email: 'duc.pm@vienchibao.com', spent: 320000, tokens: 131000, voices: 1, role: 'MEMBER' },
            ]
        },
        {
            id: 'team-trang-suc',
            name: 'Team Trang Sức',
            leaderName: 'Đặng Tuấn Anh',
            spent: 980000,
            tokens: 392000,
            voices: 6,
            members: [
                { name: 'Hoàng Quốc Bảo', email: 'bao.hq@vienchibao.com', spent: 500000, tokens: 200000, voices: 3, role: 'EDITOR' },
                { name: 'Nguyễn Thị Mai', email: 'mai.nt@vienchibao.com', spent: 480000, tokens: 192000, voices: 3, role: 'MEMBER' },
            ]
        },
        {
            id: 'team-marketing',
            name: 'Team Marketing',
            leaderName: 'Bùi Minh Trí',
            spent: 620000,
            tokens: 248000,
            voices: 3,
            members: [
                { name: 'Đỗ Huy Hoàng', email: 'hoang.dh@vienchibao.com', spent: 340000, tokens: 136000, voices: 2, role: 'MEMBER' },
                { name: 'Phùng Minh Tuấn', email: 'tuan.pm@vienchibao.com', spent: 280000, tokens: 112000, voices: 1, role: 'MEMBER' },
            ]
        }
    ];

    // Auto select first team for Admin to prevent empty screen
    useEffect(() => {
        if (isAdmin && !selectedTeamId && teamsData.length > 0) {
            setSelectedTeamId(teamsData[0].id);
        }
    }, [isAdmin]);

    // Leader gets their specific team data
    const leaderTeamData = teamsData.find(t => t.name === userTeam || t.leaderName === user?.full_name) || teamsData[0];

    // Total stats helper
    const totalSystemSpent = teamsData.reduce((acc, t) => acc + t.spent, 0);
    const totalSystemTokens = teamsData.reduce((acc, t) => acc + t.tokens, 0);
    const totalSystemVoices = teamsData.reduce((acc, t) => acc + t.voices, 0);

    // Selected team for Admin drill down
    const adminSelectedTeam = teamsData.find(t => t.id === selectedTeamId) || teamsData[0];

    // Personal member statistics
    const memberStats = {
        spent: 125000,
        tokensUsed: 42500,
        tokenLimit: 100000,
        voicesUsed: voicesCount || 3,
        voicesLimit: 10,
        recentLogs: [
            { id: 1, action: 'Text to Speech', target: 'Mô tả sản phẩm vòng bạc', tokens: 1200, time: '10 phút trước' },
            { id: 2, action: 'Clone Voice', target: 'Giọng KOC Anh Tú', tokens: 15000, time: '2 giờ trước' },
            { id: 3, action: 'Text to Speech', target: 'Dịch kịch bản video TikTok', tokens: 2800, time: 'Hôm qua' },
        ]
    };

    const tokenPercent = isMemberOnly
        ? (memberStats.tokensUsed / memberStats.tokenLimit) * 100
        : isLeader
        ? (leaderTeamData.tokens / 2000000) * 100
        : (totalSystemTokens / 2000000) * 100;

    return (
        <div className="min-h-screen bg-gray-50 -m-6 pb-12">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold uppercase tracking-wider">
                                {isAdmin ? 'ADMIN PANEL' : isLeader ? `LEADER PANEL - ${userTeam}` : 'MEMBER PANEL'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mt-2">Tổng quan Tiện ích AI</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {isAdmin 
                                ? 'Quản lý toàn bộ ngân sách, token tiêu thụ và giọng nói clone của tất cả các team.'
                                : isLeader 
                                ? `Xem thống kê lượng token, chi tiêu của các thành viên trong ${leaderTeamData.name}.`
                                : 'Theo dõi hạn mức, lượng token tiêu thụ và các giọng nói bạn đã clone.'}
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
                    {/* Spent Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Chi tiêu đã dùng</span>
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-2xl font-bold text-gray-900">
                                {isAdmin 
                                    ? formatVND(totalSystemSpent) 
                                    : isLeader 
                                    ? formatVND(leaderTeamData.spent) 
                                    : formatVND(memberStats.spent)}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-2">
                                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-xs text-green-600 font-medium">+12.5%</span>
                                <span className="text-xs text-gray-400">so với tháng trước</span>
                            </div>
                        </div>
                    </div>

                    {/* Tokens Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Token tiêu thụ</span>
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                                <Coins className="w-5 h-5 text-violet-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {isAdmin 
                                        ? totalSystemTokens.toLocaleString() 
                                        : isLeader 
                                        ? leaderTeamData.tokens.toLocaleString() 
                                        : memberStats.tokensUsed.toLocaleString()}
                                </h3>
                                <span className="text-xs text-gray-400">
                                    / {isMemberOnly ? memberStats.tokenLimit.toLocaleString() : '2,000,000'} điểm
                                </span>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                                <div 
                                    className="bg-violet-600 h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${tokenPercent}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2 text-right">Đã sử dụng {tokenPercent.toFixed(1)}% hạn mức</p>
                        </div>
                    </div>

                    {/* Voices Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500">Giọng nói đã clone</span>
                            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                                <Mic className="w-5 h-5 text-cyan-600" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {isAdmin 
                                        ? totalSystemVoices 
                                        : isLeader 
                                        ? leaderTeamData.voices 
                                        : memberStats.voicesUsed}
                                </h3>
                                <span className="text-xs text-gray-400">
                                    {isMemberOnly ? `/ ${memberStats.voicesLimit} slots` : ' giọng active'}
                                </span>
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
                                    Chỉ số tổng hợp các Team
                                </h3>
                                <span className="text-xs text-gray-400">Chọn một team bên dưới để xem chi tiết từng người</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {teamsData.map((team) => {
                                    const isSelected = selectedTeamId === team.id;
                                    return (
                                        <button
                                            key={team.id}
                                            onClick={() => setSelectedTeamId(team.id)}
                                            className={`p-5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between h-40
                                                ${isSelected
                                                    ? 'bg-violet-50/50 border-violet-400 shadow-md shadow-violet-50'
                                                    : 'bg-white border-gray-200 hover:bg-gray-50/50 hover:border-gray-300'}`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <h4 className={`text-sm font-bold ${isSelected ? 'text-violet-800' : 'text-gray-900'}`}>{team.name}</h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase
                                                        ${isSelected ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {team.members.length} người
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-1">Leader: {team.leaderName}</p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-gray-100 w-full grid grid-cols-2 gap-2">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Chi tiêu</p>
                                                    <p className="text-xs font-bold text-gray-800 mt-0.5">{formatVND(team.spent)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Tokens</p>
                                                    <p className="text-xs font-bold text-gray-800 mt-0.5">{team.tokens.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Team Member Drill-down table */}
                        {adminSelectedTeam && (
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm transition-all duration-200">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-950 text-base">Thành viên {adminSelectedTeam.name}</h3>
                                            <span className="text-xs text-gray-400 font-medium">({adminSelectedTeam.leaderName} quản lý)</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">Danh sách các cá nhân thuộc nhóm và thống kê tiêu dùng của họ</p>
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
                                                <th className="py-3">Vai trò hệ thống</th>
                                                <th className="py-3">Token tiêu hao</th>
                                                <th className="py-3">Số voice đã tạo</th>
                                                <th className="pr-6 py-3 text-right">Chi tiêu thực tế</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {adminSelectedTeam.members.map((member) => (
                                                <tr key={member.email} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="pl-6 py-4">
                                                        <p className="text-xs font-semibold text-gray-800">{member.name}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{member.email}</p>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-semibold tracking-wider">
                                                            {member.role}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-xs font-semibold text-gray-700">
                                                        {member.tokens.toLocaleString()} điểm
                                                    </td>
                                                    <td className="py-4 text-xs text-gray-500">
                                                        {member.voices} voices
                                                    </td>
                                                    <td className="pr-6 py-4 text-right text-xs font-bold text-gray-900">
                                                        {formatVND(member.spent)}
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

                {/* 2. LEADER LAYOUT (Team stats and specific members of leader's team) */}
                {isLeader && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="font-bold text-gray-950 text-base">Thành viên trong {leaderTeamData.name}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Báo cáo chi tiết lượng token tiêu thụ và số giọng nói đã tạo của mỗi thành viên trong nhóm bạn quản lý</p>
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
                                        <th className="py-3">Token tiêu thụ</th>
                                        <th className="py-3">Số voice đã tạo</th>
                                        <th className="pr-6 py-3 text-right">Chi tiêu lũy kế</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {leaderTeamData.members.map((member) => (
                                        <tr key={member.email} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="pl-6 py-4">
                                                <p className="text-xs font-semibold text-gray-800">{member.name}</p>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-md font-semibold tracking-wide uppercase mt-1 inline-block">
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="py-4 text-xs text-gray-500">
                                                {member.email}
                                            </td>
                                            <td className="py-4 text-xs font-semibold text-gray-700">
                                                {member.tokens.toLocaleString()} điểm
                                            </td>
                                            <td className="py-4 text-xs text-gray-500">
                                                {member.voices} / 10 slots
                                            </td>
                                            <td className="pr-6 py-4 text-right text-xs font-bold text-gray-900">
                                                {formatVND(member.spent)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. MEMBER LAYOUT (Personal actions log) */}
                {isMemberOnly && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-950 text-base">Nhật ký tác vụ gần nhất</h3>
                            <span className="text-xs text-gray-400">Chỉ hiển thị các tác vụ của bạn</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {memberStats.recentLogs.map((log) => (
                                <div key={log.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                                            <Volume2 className="w-4.5 h-4.5 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-800">{log.action}</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">{log.target}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-violet-600">-{log.tokens.toLocaleString()} điểm</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{log.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
