'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChannelMetrics {
    charts?: {
        avg_engagement_by_day?: any[];
        posting_frequency?: any[];
    };
}

export default function ChannelMetricsCharts({ channelMetrics }: { channelMetrics: ChannelMetrics }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p className="text-sm font-bold text-slate-800 mb-2">Tương tác trung bình theo ngày</p>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={channelMetrics?.charts?.avg_engagement_by_day || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="avgLikes" stroke="#4f46e5" fill="#c7d2fe" name="Like TB" />
                            <Area type="monotone" dataKey="avgComments" stroke="#059669" fill="#bbf7d0" name="Comment TB" />
                            <Area type="monotone" dataKey="avgShares" stroke="#f59e0b" fill="#fde68a" name="Share TB" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div>
                <p className="text-sm font-bold text-slate-800 mb-2">Tần suất đăng bài</p>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={channelMetrics?.charts?.posting_frequency || []}>
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
