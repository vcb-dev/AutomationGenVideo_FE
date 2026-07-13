'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VideoDurationAnalysisProps {
  videos?: any[];
}

export default function VideoDurationAnalysis({ videos = [] }: VideoDurationAnalysisProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  const durationRanges = [
    { label: '0-30s', min: 0, max: 30 },
    { label: '31-60s', min: 31, max: 60 },
    { label: '61-90s', min: 61, max: 90 },
    { label: '91-120s', min: 91, max: 120 },
    { label: '121s+', min: 121, max: Infinity },
  ];

  useEffect(() => {
    if (videos && videos.length > 0) {
      const data = durationRanges.map((range) => {
        const videosInRange = videos.filter((video) => {
          const duration = video.duration || 0;
          return duration >= range.min && duration <= range.max;
        });

        const avgViews = videosInRange.length > 0
          ? videosInRange.reduce((sum, v) => sum + (Number(v.views_count) || 0), 0) / videosInRange.length
          : 0;

        const totalEngagement = videosInRange.reduce((sum, v) => 
          sum + (Number(v.likes_count) || 0) + (Number(v.comments_count) || 0) + (Number(v.shares_count) || 0), 0
        );

        const avgEngagement = videosInRange.length > 0
          ? (totalEngagement / videosInRange.reduce((sum, v) => sum + (Number(v.views_count) || 0), 0)) * 100
          : 0;

        return {
          range: range.label,
          avgViews: Math.round(avgViews),
          avgEngagement: avgEngagement > 0 ? Number(avgEngagement.toFixed(2)) : 0,
        };
      });

      setChartData(data);
      setChartData(data);
    } else {
      setChartData([]);
    }
  }, [videos]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs">
          <p className="font-semibold mb-2">{payload[0]?.payload?.range}</p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-pink-500" />
            Avg Views: <span className="font-bold">{new Intl.NumberFormat('en-US').format(payload[0]?.value || 0)}</span>
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="w-3 h-3 rounded bg-cyan-500" />
            Avg Engagement: <span className="font-bold">{payload[1]?.value?.toFixed(2)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <h3 className="text-lg font-bold text-slate-900">Video Duration Analysis</h3>
        </div>

        {/* Legend */}
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-pink-500" />
            <span className="text-xs text-slate-600 font-medium">Avg Views</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-cyan-500" />
            <span className="text-xs text-slate-600 font-medium">Avg Engagement</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={8} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="range" 
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              width={60}
              label={{ 
                value: 'Avg Views', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#64748b' }
              }}
              tickFormatter={(value) => {
                if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                return value.toString();
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              width={60}
              label={{ 
                value: 'Avg Engagement', 
                angle: 90, 
                position: 'insideRight',
                style: { fontSize: 11, fill: '#64748b' }
              }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Bar 
              yAxisId="left"
              dataKey="avgViews" 
              fill="#ec4899"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
            />
            <Bar 
              yAxisId="right"
              dataKey="avgEngagement" 
              fill="#06b6d4"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
