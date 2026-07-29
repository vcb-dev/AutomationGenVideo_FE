'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Activity, TrendingUp, Layout, CheckSquare, Users, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';
import UserActivityCard from './UserActivityCard';
import { Card } from '@/components/ui/card';

interface PersonalChartsProps {
    history: any[];
    teamStats: {
        teamName: string;
        userVideo: number;
        teamVideo: number;
        userTraffic: number;
        teamTraffic: number;
        userRevenue: number;
        teamRevenue: number;
        teamChannels?: number;
    } | null;
    companyStats?: {
        totalVideo: number;
        totalTraffic: number;
        totalRevenue: number;
        totalChannels: number;
    } | null;
    userActivity?: any;
    members?: any[];
    allReports?: any[];
    setSearchName?: (name: string) => void;
    isDetailedMode: boolean;
    setIsDetailedMode: (val: boolean) => void;
    userRole?: string | null;
    userTeam?: string | null;
    currentUserName?: string | null;
    currentUserEmail?: string | null;
    loading?: boolean;
}

const normalize = (str: any) => (str || '').toString().toLowerCase().trim().replace(/\s+/g, '');

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartTooltip,
    ResponsiveContainer,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    LineChart,
    Line,
    AreaChart,
    Area,
    Legend
} from 'recharts';
import { CardSkeleton } from './Cardskeleton';

const PersonalCharts = ({
    history,
    teamStats,
    companyStats,
    userActivity,
    members = [],
    allReports = [],
    setSearchName,
    isDetailedMode,
    setIsDetailedMode,
    userRole,
    userTeam,
    currentUserName,
    currentUserEmail,
    loading = false,
}: PersonalChartsProps) => {

    const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'video', direction: 'desc' });

    // Auto-enter detailed mode if a specific user is selected (e.g. from cards)
    React.useEffect(() => {
        if (userActivity?.name && !isDetailedMode && history.length > 0) {
            // Uncomment if you want auto-switch on every select: setIsDetailedMode(true);
        }
    }, [userActivity?.name, history.length]);

    // Calculate "Ý tưởng mới" count for current userActivity
    const userIdeasCount = React.useMemo(() => {
        if (!allReports || !userActivity?.name) return 0;
        const userReps = allReports.filter(r => r.name === userActivity.name);
        let count = 0;
        userReps.forEach(r => {
            const hasIdea = r.questions?.some((q: any) =>
                (q.question.includes('Ý TƯỞNG') || q.question.includes('ĐỔI MỚI')) &&
                q.answer && q.answer.toLowerCase() !== 'không có' && q.answer.toLowerCase() !== 'không'
            );
            if (hasIdea) count++;
        });
        return count;
    }, [allReports, userActivity?.name]);

    const contributionData = React.useMemo(() => {
        if (!teamStats) return [];
        return [
            { subject: 'Video', user: teamStats.userVideo, teamAvg: Math.round(teamStats.teamVideo / (members.length || 1)), fullMark: Math.max(teamStats.userVideo, teamStats.teamVideo / (members.length || 1)) * 1.2 },
            { subject: 'Traffic', user: teamStats.userTraffic, teamAvg: Math.round(teamStats.teamTraffic / (members.length || 1)), fullMark: Math.max(teamStats.userTraffic, teamStats.teamTraffic / (members.length || 1)) * 1.2 },
            { subject: 'Revenue', user: teamStats.userRevenue, teamAvg: Math.round(teamStats.teamRevenue / (members.length || 1)), fullMark: Math.max(teamStats.userRevenue, teamStats.teamRevenue / (members.length || 1)) * 1.2 },
            { subject: 'Ý tưởng', user: userIdeasCount, teamAvg: 1, fullMark: Math.max(userIdeasCount, 2) * 1.2 },
        ];
    }, [teamStats, members.length, userIdeasCount]);

    const sortedMembers = React.useMemo(() => {
        // Only show members who have a team name
        let sortableMembers = members.filter(m => m.team && m.team.trim() !== '');
        if (sortConfig !== null) {
            sortableMembers.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];

                // Special handling for formatted strings
                if (sortConfig.key === 'video') {
                    aValue = parseInt(a.video?.split(' ')[0] || '0');
                    bValue = parseInt(b.video?.split(' ')[0] || '0');
                } else if (sortConfig.key === 'traffic' || sortConfig.key === 'revenue') {
                    aValue = parseInt((a[sortConfig.key] || '0').toString().replace(/\./g, '').replace(/,/g, ''));
                    bValue = parseInt((b[sortConfig.key] || '0').toString().replace(/\./g, '').replace(/,/g, ''));
                } else if (sortConfig.key === 'channels') {
                    aValue = parseInt(a.channels || '0');
                    bValue = parseInt(b.channels || '0');
                } else if (sortConfig.key === 'checklist') {
                    aValue = parseInt(a.checklist?.split('/')[0] || '0');
                    bValue = parseInt(b.checklist?.split('/')[0] || '0');
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableMembers;
    }, [members, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        const isActive = sortConfig?.key === key;
        if (!isActive) return <ChevronDown className="w-3 h-3 opacity-20 group-hover:opacity-50 transition-all" />;

        return sortConfig?.direction === 'desc'
            ? <ChevronDown className="w-3.5 h-3.5 text-white animate-bounce-subtle" />
            : <ChevronUp className="w-3.5 h-3.5 text-white animate-bounce-subtle" />;
    };

    return (
        <div className="w-full space-y-6">
            <AnimatePresence mode="wait">
                {isDetailedMode && userActivity ? (

                    /* ─────────────── DETAILED VIEW ─────────────── */
                    <motion.div
                        key="detailed-view"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setIsDetailedMode(false)}
                                className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm font-medium text-slate-500 hover:text-blue-700 shadow-sm"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                Quay lại danh sách
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-base font-semibold text-slate-800 leading-tight">{userActivity.name}</p>
                                    <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">{userActivity.team || 'Cá nhân'}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Personal Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Video đóng góp', value: teamStats?.userVideo || 0, icon: Video, pill: 'bg-blue-50 text-blue-600 border border-blue-100', num: 'text-blue-700' },
                                { label: 'Traffic cá nhân', value: (teamStats?.userTraffic || 0).toLocaleString('vi-VN'), icon: Activity, pill: 'bg-indigo-50 text-indigo-600 border border-indigo-100', num: 'text-indigo-700' },
                                { label: 'Doanh thu', value: (teamStats?.userRevenue || 0).toLocaleString('vi-VN'), icon: TrendingUp, pill: 'bg-emerald-50 text-emerald-600 border border-emerald-100', num: 'text-emerald-700' },
                                { label: 'Ý tưởng mới', value: userIdeasCount, icon: Layout, pill: 'bg-violet-50 text-violet-600 border border-violet-100', num: 'text-violet-700' },
                            ].map((s, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${s.pill}`}>
                                        <s.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                                        <p className={`text-lg font-semibold leading-none ${s.num}`}>{s.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Radar */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-50">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Cân bằng đóng góp</p>
                                    <p className="text-[13px] font-semibold text-slate-800">{userActivity.name}</p>
                                </div>
                                <div className="h-[240px] p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="78%" data={contributionData}>
                                            <PolarGrid stroke="#f1f5f9" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} />
                                            <Radar name={userActivity.name} dataKey="user" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                                            <Radar name="TB Team" dataKey="teamAvg" stroke="#e2e8f0" fill="#e2e8f0" fillOpacity={0.2} strokeWidth={1.5} />
                                            <RechartTooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #f1f5f9', boxShadow: 'none' }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Line Chart */}
                            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Xu hướng hiệu suất</p>
                                        <p className="text-[13px] font-semibold text-slate-800">Số video & Doanh thu theo tháng</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Video</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Doanh thu</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[240px] p-5">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={history}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} />
                                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                            <RechartTooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #f1f5f9', boxShadow: 'none' }} />
                                            <Line yAxisId="left" type="monotone" dataKey="video" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Area Chart */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                                        <Activity className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Xu hướng traffic</p>
                                        <p className="text-[13px] font-semibold text-slate-800">Tăng trưởng view & mục tiêu tháng</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="text-[10px] font-medium text-slate-400 uppercase">Thực tế</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-[1.5px] bg-slate-300" style={{ borderTop: '1.5px dashed #cbd5e1' }} />
                                        <span className="text-[10px] font-medium text-slate-400 uppercase">Mục tiêu</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[240px] p-5">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} dx={-4} />
                                        <RechartTooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #f1f5f9', boxShadow: 'none' }} />
                                        <Area type="monotone" dataKey="traffic" name="Thực tế" stroke="#3b82f6" fill="url(#trafficFill)" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 0 }} />
                                        <Area type="monotone" dataKey="trafficTarget" name="Mục tiêu" stroke="#cbd5e1" fill="none" strokeDasharray="5 4" strokeWidth={1.5} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>

                ) : (

                    /* ─────────────── LIST VIEW ─────────────── */
                    <motion.div
                        key="list-view"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {/* Company Stats */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-50">
                                <div className="p-2 bg-blue-600 rounded-xl">
                                    <Layout className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">VCB Report</p>
                                    <p className="text-[13px] font-semibold text-slate-800 leading-tight">Toàn công ty</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-50">
                                {[
                                    { label: 'Số video', icon: Video, value: (companyStats?.totalVideo || 0).toLocaleString('vi-VN'), unit: 'Tổng video', pill: 'bg-blue-50 text-blue-600 border-blue-100', num: 'text-blue-700' },
                                    { label: 'Tổng traffic', icon: Activity, value: (companyStats?.totalTraffic || 0).toLocaleString('vi-VN'), unit: 'Tổng lượt xem', pill: 'bg-indigo-50 text-indigo-600 border-indigo-100', num: 'text-indigo-700' },
                                    { label: 'Doanh thu', icon: TrendingUp, value: (companyStats?.totalRevenue || 0).toLocaleString('vi-VN'), unit: 'VNĐ', pill: 'bg-emerald-50 text-emerald-600 border-emerald-100', num: 'text-emerald-700' },
                                    { label: 'Số kênh', icon: Layout, value: (companyStats?.totalChannels || 0).toString(), unit: 'Tổng kênh', pill: 'bg-violet-50 text-violet-600 border-violet-100', num: 'text-violet-700' },
                                ].map((item, idx) => (
                                    <div key={idx} className="px-6 py-5 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                                        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${item.pill}`}>
                                            <item.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                                            <p className={`text-xl font-semibold leading-none tracking-tight tabular-nums ${item.num}`}>{item.value}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium">{item.unit}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Member Performance Table */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                                        <Users className="w-3.5 h-3.5 text-blue-600" />
                                    </div>
                                    <p className="text-[12px] font-semibold text-slate-700 uppercase tracking-widest">Chi tiết hiệu suất nhân viên</p>
                                </div>
                                <p className="text-[11px] text-slate-400 italic">Click tiêu đề cột để sắp xếp</p>
                            </div>

                            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-12 text-center">STT</th>
                                            <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Họ tên</th>
                                            <th onClick={() => requestSort('video')} className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 hover:bg-blue-50/50 transition-colors select-none">
                                                <div className="flex items-center gap-1.5">Số video {getSortIcon('video')}</div>
                                            </th>
                                            <th onClick={() => requestSort('traffic')} className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 hover:bg-blue-50/50 transition-colors select-none">
                                                <div className="flex items-center gap-1.5">Traffic {getSortIcon('traffic')}</div>
                                            </th>
                                            <th onClick={() => requestSort('revenue')} className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 hover:bg-blue-50/50 transition-colors select-none">
                                                <div className="flex items-center gap-1.5">Doanh thu {getSortIcon('revenue')}</div>
                                            </th>
                                            <th onClick={() => requestSort('channels')} className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 hover:bg-blue-50/50 transition-colors select-none">
                                                <div className="flex items-center gap-1.5">Kênh {getSortIcon('channels')}</div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sortedMembers.map((member, idx) => (
                                            <tr key={idx} className={`hover:bg-blue-50/20 transition-colors ${member.isLeader ? 'bg-amber-50/30' : ''}`}>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className="text-[12px] font-medium text-slate-400">{idx + 1}</span>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        {member.isLeader && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-semibold uppercase tracking-wide border border-amber-200">Leader</span>
                                                        )}
                                                        <span className={`text-[13px] font-medium ${member.isLeader ? 'text-amber-700' : 'text-slate-700'}`}>
                                                            {member.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`text-[13px] font-semibold ${member.isLeader ? 'text-amber-600' : 'text-blue-600'}`}>{member.video}</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-[13px] font-medium text-slate-600">{member.traffic}</td>
                                                <td className="px-6 py-3.5 text-[13px] font-medium text-slate-600">{member.revenue}</td>
                                                <td className="px-6 py-3.5 text-[13px] font-medium text-slate-600">{member.channels}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Member Cards */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                    </div>
                                    <p className="text-[12px] font-semibold text-slate-700 uppercase tracking-widest">Thẻ chi tiết nhân viên</p>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium">{allReports.length} thành viên</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-8">
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <CardSkeleton key={i} />
                                    ))
                                ) : (
                                    <>
                                        {allReports.map((report, idx) => (
                                            <UserActivityCard
                                                key={report.id || idx}
                                                data={{ ...report, reportStatus: report.status }}
                                                isActive={userActivity?.name === report.name}
                                                canClick={
                                                    userRole === 'admin' ||
                                                    userRole === 'manager' ||
                                                    (userRole === 'leader' && report.team && userTeam && normalize(report.team) === normalize(userTeam)) ||
                                                    (report.name && currentUserName && normalize(report.name) === normalize(currentUserName)) ||
                                                    (report.email && currentUserEmail && normalize(report.email) === normalize(currentUserEmail))
                                                }
                                                onClick={() => {
                                                    if (setSearchName) setSearchName(report.name);
                                                    setIsDetailedMode(true);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                            />
                                        ))}
                                        {allReports.length === 0 && (
                                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
                                                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                                                    <Users className="w-5 h-5 text-slate-300" />
                                                </div>
                                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Không có dữ liệu</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default PersonalCharts;
