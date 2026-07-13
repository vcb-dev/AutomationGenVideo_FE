'use client';

import Image from "next/image";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Video, Activity } from 'lucide-react';

interface DashboardAnalyticsProps {
    /** ISO date strings — stable references prevent spurious refetches */
    startDate: string;
    endDate: string;
    activeTeam: string;
}

const DashboardAnalytics = ({ startDate, endDate, activeTeam }: DashboardAnalyticsProps) => {
    const startStr = startDate ? startDate.slice(0, 10) : '';
    const endStr = endDate ? endDate.slice(0, 10) : '';

    const { data, isLoading: loading } = useQuery({
        queryKey: ['dashboardAnalytics', startStr, endStr, activeTeam],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (startStr) params.append('startDate', startStr);
            if (endStr)   params.append('endDate',   endStr);
            if (activeTeam !== 'All') params.append('team', activeTeam);

            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/lark/dashboard-analytics?${params.toString()}`;
            const response = await fetch(url, { signal });
            if (!response.ok) throw new Error('Failed to fetch dashboard analytics');
            return await response.json();
        },
        staleTime: 60 * 1000, // 1 minute stale time
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!data || !data.chartData) return null;

    const { chartData, summary, regionalStats } = data;
    const diff = summary.totalVideos - (summary.prevVideos || 0);
    const pctChange = !summary.prevVideos ? 100 : Math.round((diff / summary.prevVideos) * 100);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString('vi-VN');
    };

    const RegionTable = ({ title, stats }: { title: string, stats: any }) => {
        if (!stats || !stats.teams || stats.teams.length === 0) return null;

        return (
            <div className="space-y-6 mt-10">
                {/* Region Summary Bar */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-5 divide-x divide-slate-100">
                        <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-col justify-center">
                            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                {title}
                            </h3>
                        </div>
                        <div className="px-2 py-2 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số video</p>
                            <p className="text-lg font-black text-rose-600 leading-none">{formatNumber(stats.summary.videos)}</p>
                        </div>
                        <div className="px-2 py-2 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số traffic</p>
                            <p className="text-lg font-black text-blue-600 leading-none">{formatNumber(stats.summary.traffic)}</p>
                        </div>
                        <div className="px-2 py-2 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số doanh thu</p>
                            <p className="text-lg font-black text-emerald-600 font-mono italic leading-none">{formatNumber(stats.summary.revenue)}</p>
                        </div>
                        <div className="px-2 py-2 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số kênh</p>
                            <p className="text-lg font-black text-amber-500 leading-none">{formatNumber(stats.summary.channels)}</p>
                        </div>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
                    <div className="overflow-auto max-h-[400px] custom-scrollbar">
                        <table className="w-full text-left border-collapse relative">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Tên nv</th>
                                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Team</th>
                                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center">Số vd</th>
                                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center">Số traffic</th>
                                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center">Số doanh thu</th>
                                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center">Số kênh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.teams.map((team: any) => (
                                    <React.Fragment key={team.name}>
                                        {team.members.map((member: any, idx: number) => (
                                            <tr key={member.email} className={`hover:bg-blue-50/30 transition-colors ${member.isLeader ? 'bg-amber-50/20' : ''}`}>
                                                <td className="px-3 py-1.5 border-b border-slate-50">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-sm font-bold ${member.isLeader ? 'text-amber-700' : 'text-slate-700'}`}>
                                                            {member.name}
                                                            {member.isLeader && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded-full uppercase tracking-tighter">Leader</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 border-b border-slate-50">
                                                    <div className="flex items-center gap-1.5">
                                                        {member.team?.toLowerCase().includes('global - indo') && (
                                                            <Image src="/indo-flag.png" alt="INDO" className="w-4 h-3 object-contain rounded-sm filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={16} height={12} unoptimized />
                                                        )}
                                                        {member.team?.toLowerCase().includes('thái lan') && (
                                                            <Image src="/thailand-flag.png" alt="TH" className="w-4 h-3 object-contain rounded-sm filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={16} height={12} unoptimized />
                                                        )}
                                                        {(member.team?.toLowerCase().includes('jp') || member.team?.toLowerCase().includes('nhật bản')) && (
                                                            <Image src="/japan-flag.png" alt="JP" className="w-4 h-3 object-contain rounded-sm border border-gray-100 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={16} height={12} unoptimized />
                                                        )}
                                                        {member.team?.toLowerCase().includes('đài loan') && (
                                                            <Image src="/taiwan-flag.png" alt="TW" className="w-4 h-3 object-contain rounded-sm filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={16} height={12} unoptimized />
                                                        )}
                                                        {member.team?.toLowerCase().includes('việt nam') && (
                                                            <Image src="/vn-flag.png" alt="VN" className="w-4 h-3 object-contain rounded-sm filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" width={16} height={12} unoptimized />
                                                        )}
                                                        <span className="text-[11px] font-black text-blue-600 italic uppercase">{member.team}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-center border-b border-slate-50">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-black text-slate-900 leading-none">{member.videoCount}</span>
                                                        <span className="text-[10px] font-bold text-rose-500 italic mt-0.5">({member.contribution} đóng góp)</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-center border-b border-slate-50">
                                                    <span className="text-sm font-bold text-slate-600">{formatNumber(member.traffic)}</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center border-b border-slate-50">
                                                    <span className="text-sm font-mono text-emerald-600 font-bold">{formatNumber(member.revenue)}</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center border-b border-slate-50">
                                                    <span className="text-sm font-bold text-slate-600">{member.channels}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Overview */}
                <Card className="lg:col-span-1 bg-gradient-to-br from-white to-slate-50 border-blue-100 shadow-xl shadow-blue-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Hiệu suất sản xuất</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-blue-100/50">
                                    <Video className="w-5 h-5 text-blue-600" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-700">Số video sản xuất</h4>
                            </div>
                            <div className="flex items-baseline gap-3 mt-2">
                                <span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">
                                    {summary.totalVideos}
                                </span>
                                {/* Temporarily removed percentage change as requested */}
                                {/* <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black uppercase ${diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {diff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(pctChange)}%
                                </div> */}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Tổng Traffic</span>
                                </div>
                                <span className="text-sm font-black text-slate-900">{summary.totalTraffic.toLocaleString('vi-VN')}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Tổng Doanh thu</span>
                                </div>
                                <span className="text-sm font-black text-emerald-600 italic">{(summary.totalRevenue || 0).toLocaleString('vi-VN')}</span>
                            </div>

                            {/* List of Content Lines */}
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 scrollbar-thin">
                                {chartData.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.name === 'A4' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-blue-500'}`} />
                                            <span className="font-bold text-slate-600 uppercase">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400 font-medium">{item.videoCount} VD</span>
                                            <span className="font-black text-slate-800">{formatNumber(item.traffic)} View</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Bar Chart */}
                <Card className="lg:col-span-2 bg-white border-blue-50 shadow-xl shadow-blue-900/5 rounded-3xl overflow-hidden p-6 relative">
                    <div className="absolute top-6 left-6 z-10">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Thống kê theo Tuyến ND</h3>
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Video</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Traffic</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-[350px] mt-12">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                barGap={8}
                            >
                                <defs>
                                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
                                    </linearGradient>
                                    <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#e11d48" stopOpacity={0.9} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                                    dx={-5}
                                    tickFormatter={(val) => formatNumber(val)}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                                        padding: '12px',
                                        backgroundColor: '#ffffff'
                                    }}
                                    itemStyle={{
                                        fontSize: '12px',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        color: '#0f172a',
                                        padding: '2px 0'
                                    }}
                                    labelStyle={{
                                        fontSize: '14px',
                                        fontWeight: 900,
                                        marginBottom: '8px',
                                        color: '#1e293b',
                                        borderBottom: '1px solid #f1f5f9',
                                        paddingBottom: '4px'
                                    }}
                                />
                                <Bar
                                    dataKey="videoCount"
                                    name="Số video"
                                    fill="url(#blueGradient)"
                                    radius={[4, 4, 0, 0]}
                                    barSize={16}
                                />
                                <Bar
                                    dataKey="traffic"
                                    name="Traffic"
                                    fill="url(#roseGradient)"
                                    radius={[4, 4, 0, 0]}
                                    barSize={16}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Regional Tables Section */}
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <RegionTable title="Báo cáo Tổng hợp Việt Nam" stats={regionalStats.vn} />
                <RegionTable title="Báo cáo Tổng hợp Global" stats={regionalStats.global} />
            </div>
        </div>
    );
};

export default DashboardAnalytics;
