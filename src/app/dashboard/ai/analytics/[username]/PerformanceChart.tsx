'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Heart, MessageCircle, Share2, Video } from 'lucide-react';

interface PerformanceChartProps {
  videos: any[];
}

export default function PerformanceChart({ videos }: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState('views');

  const metrics = [
    { key: 'views', label: 'Daily Views', icon: Eye, color: '#3b82f6' },
    { key: 'likes', label: 'Daily Likes', icon: Heart, color: '#ec4899' },
    { key: 'comments', label: 'Daily Comments', icon: MessageCircle, color: '#8b5cf6' },
    { key: 'shares', label: 'Daily Shares', icon: Share2, color: '#10b981' },
    { key: 'videos', label: 'Daily Videos Posted', icon: Video, color: '#f59e0b' },
  ];

  // Process video data by date
  const processChartData = () => {
    if (!videos || videos.length === 0) return [];
0
    const dataByDate: any = {};
    
    videos.forEach((video) => {
      if (!video.published_at) return;
      
      const date = new Date(video.published_at);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = {
          date: dateKey,
          displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          videos: 0,
        };
      }
      
      dataByDate[dateKey].views += Number(video.views_count) || 0;
      dataByDate[dateKey].likes += Number(video.likes_count) || 0;
      dataByDate[dateKey].comments += Number(video.comments_count) || 0;
      dataByDate[dateKey].shares += Number(video.shares_count) || 0;
      dataByDate[dateKey].videos += 1;
    });

    return Object.values(dataByDate).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ).slice(-30); // Last 30 days
  };

  const chartData = processChartData();
  const activeMetricData = metrics.find(m => m.key === activeMetric);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">📊 Performance Overview</h3>
      </div>

      {/* Metric Tabs */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (  
            <button
              key={metric.key}
              onClick={() => setActiveMetric(metric.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                activeMetric === metric.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{metric.label}</span>
              <span className="sm:hidden">
                {metric.key === 'views' && 'Views'}
                {metric.key === 'likes' && 'Likes'}
                {metric.key === 'comments' && 'Comments'}
                {metric.key === 'shares' && 'Shares'}
                {metric.key === 'videos' && 'Videos'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-64">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayDate" 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: any) => new Intl.NumberFormat('en-US').format(value)}
              />
              <Line 
                type="monotone" 
                dataKey={activeMetric} 
                stroke={activeMetricData?.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
