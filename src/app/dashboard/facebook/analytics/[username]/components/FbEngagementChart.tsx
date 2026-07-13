'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { BarChart3 } from 'lucide-react';

export function FbEngagementChart({ chartData }: { chartData: any[] }) {
    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <BarChart3 className="w-8 h-8 opacity-50 mb-2" />
                <p>Chưa có dữ liệu biểu đồ</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
                <defs>
                    <linearGradient id="colorLikesAll" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)' }} />
                <Area type="monotone" dataKey="likes" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorLikesAll)" name="Lượt thích" />
                <Line type="monotone" dataKey="engagement" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="Tổng tương tác" />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function FbChannelMetricsCharts({ channelMetrics }: { channelMetrics: any }) {
    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">Tương tác trung bình theo ngày</p>
                    <p className="text-xs text-slate-500">{channelMetrics?.meta?.posts_analyzed || 0} bài phân tích</p>
                </div>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={(channelMetrics.charts.avg_engagement_by_day || []).map((it: any) => ({ ...it, engagement: it.avgLikes + it.avgComments + it.avgShares }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="avgLikes" stroke="#4f46e5" fill="#c7d2fe" name="Like TB" />
                            <Area type="monotone" dataKey="engagement" stroke="#f59e0b" fill="#fde68a" name="Tương tác TB" opacity={0.6} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Tần suất đăng bài</p>
                <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={channelMetrics.charts.posting_frequency || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="#bae6fd" name="Bài/ngày" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
