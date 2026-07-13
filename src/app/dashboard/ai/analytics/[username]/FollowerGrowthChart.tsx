'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  history?: any[];
}

export default function FollowerGrowthChart({ history = [] }: Props) {
  // Use history directly - no need for state since it's already a prop
  const chartData = history && history.length > 0 ? history : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs">
          <p className="font-semibold mb-2">{payload[0]?.payload?.displayDate}</p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            Daily Growth: <span className="font-bold">{new Intl.NumberFormat('en-US').format(payload[0]?.value || 0)}</span>
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="w-3 h-3 rounded-full bg-blue-400" />
            Total Followers: <span className="font-bold">{new Intl.NumberFormat('en-US').format(payload[1]?.value || 0)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">📈 Follower Growth</h3>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span className="text-sm text-slate-600 font-medium">Daily Growth</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-sm text-slate-600 font-medium">Total Followers</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#10b981"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                width={50}
                tickFormatter={(value) => `+${value}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3b82f6"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                width={60}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="dailyGrowth"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="followers"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <span className="bg-slate-100 p-3 rounded-full mb-2">
              📈
            </span>
            <span className="font-medium text-sm">Đang thu thập dữ liệu lịch sử</span>
            <span className="text-xs text-slate-300">Biểu đồ sẽ hiển thị sau khi hệ thống ghi nhận sự thay đổi (24h+)</span>
          </div>
        )}
      </div>
    </div>
  );
}
