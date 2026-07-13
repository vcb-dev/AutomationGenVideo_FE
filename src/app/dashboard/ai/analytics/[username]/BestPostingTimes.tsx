'use client';

import { useState, useEffect } from 'react';

interface BestPostingTimesProps {
  videos?: any[];
}

export default function BestPostingTimes({ videos = [] }: BestPostingTimesProps) {
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    if (videos && videos.length > 0) {
      // Calculate engagement by day and hour
      const engagement: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
      const counts: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));

      videos.forEach((video) => {
        if (!video.published_at) return;
        
        const date = new Date(video.published_at);
        const day = (date.getDay() + 6) % 7; // Convert to Mon=0, Sun=6
        const hour = date.getHours();
        
        const videoEngagement = (Number(video.likes_count) || 0) + (Number(video.comments_count) || 0) + (Number(video.shares_count) || 0);
        
        engagement[day][hour] += videoEngagement;
        counts[day][hour] += 1;
      });

      // Calculate average engagement
      const avgEngagement = engagement.map((dayData, dayIdx) =>
        dayData.map((hourData, hourIdx) =>
          counts[dayIdx][hourIdx] > 0 ? hourData / counts[dayIdx][hourIdx] : 0
        )
      );

      setHeatmapData(avgEngagement);
      setHeatmapData(avgEngagement);
    } else {
      // Just set empty data
      setHeatmapData([]);
    }
  }, [videos]);

  const getColorClass = (value: number, maxValue: number) => {
    if (maxValue === 0) return 'bg-slate-50';
    
    const percentage = (value / maxValue) * 100;
    
    if (percentage === 0) return 'bg-slate-50';
    if (percentage < 20) return 'bg-pink-100';
    if (percentage < 40) return 'bg-pink-200';
    if (percentage < 60) return 'bg-pink-300';
    if (percentage < 80) return 'bg-pink-500';
    return 'bg-pink-600';
  };

  const getLabel = (value: number, maxValue: number) => {
    if (maxValue === 0) return 'Low';
    
    const percentage = (value / maxValue) * 100;
    
    if (percentage === 0) return 'Low';
    if (percentage < 20) return 'Low';
    if (percentage < 40) return 'Medium';
    if (percentage < 60) return 'Good';
    if (percentage < 80) return 'High';
    return 'Peak';
  };

  const maxValue = Math.max(...heatmapData.flat());

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🕐</span>
          <h3 className="text-lg font-bold text-slate-900">Best Posting Times</h3>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span>Low</span>
          <div className="flex gap-0.5">
            <div className="w-2.5 h-2.5 bg-pink-100 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-pink-200 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-pink-300 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-pink-500 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-pink-600 rounded-sm" />
          </div>
          <span>Peak</span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Day rows */}
          {days.map((day, dayIdx) => (
            <div key={day} className="flex items-center mb-1">
              {/* Day label */}
              <div className="w-10 pr-2 text-right">
                <span className="text-[10px] text-slate-500 font-medium">{day}</span>
              </div>
              
              {/* Hour cells */}
              <div className="flex gap-[3px]">
                {heatmapData[dayIdx]?.map((value, hourIdx) => (
                  <div
                    key={`${dayIdx}-${hourIdx}`}
                    className={`w-3 h-3 rounded-sm ${getColorClass(value, maxValue)} hover:ring-1 hover:ring-slate-400 transition-all cursor-pointer`}
                    title={`${day} ${hourIdx}:00 - ${getLabel(value, maxValue)}`}
                  />
                )) || Array(24).fill(0).map((_, hourIdx) => (
                  <div
                    key={`${dayIdx}-${hourIdx}`}
                    className="w-3 h-3 rounded-sm bg-slate-50"
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Hour labels */}
          <div className="flex mt-2 ml-10">
            {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
              <div key={hour} style={{ width: `${100 / 8}%` }}>
                <span className="text-[9px] text-slate-400">{hour}:00</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-1 ml-10">
            <span className="text-[9px] text-slate-400 font-medium">Hour of Day</span>
          </div>
        </div>
      </div>
    </div>
  );
}
