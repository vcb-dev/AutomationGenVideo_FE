'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Calendar, Clock, BarChart3, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

interface PostingStatsProps {
  videos: any[];
}

export default function PostingStats({ videos }: PostingStatsProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const platform = searchParams.get('platform') || 'tiktok';
  
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const now = new Date();
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  // Day before yesterday
  const dayBeforeYesterday = new Date(now);
  dayBeforeYesterday.setDate(now.getDate() - 2);

  // Start of Week (Monday as start)
  const startOfWeek = new Date(now);
  const day = now.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Previous week
  const startOfPreviousWeek = new Date(startOfWeek);
  startOfPreviousWeek.setDate(startOfWeek.getDate() - 7);
  const endOfPreviousWeek = new Date(startOfWeek);
  endOfPreviousWeek.setMilliseconds(-1);

  // Start of Month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Previous month
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Counts
  let countYesterday = 0;
  let countDayBeforeYesterday = 0;
  let countThisWeek = 0;
  let countPreviousWeek = 0;
  let countThisMonth = 0;
  let countPreviousMonth = 0;

  videos.forEach(v => {
    if (!v.published_at) return;
    const pubDate = new Date(v.published_at);

    // Yesterday
    if (isSameDay(pubDate, yesterday)) {
      countYesterday++;
    }
    
    // Day before yesterday
    if (isSameDay(pubDate, dayBeforeYesterday)) {
      countDayBeforeYesterday++;
    }

    // This Week
    if (pubDate >= startOfWeek) {
      countThisWeek++;
    }
    
    // Previous Week
    if (pubDate >= startOfPreviousWeek && pubDate <= endOfPreviousWeek) {
      countPreviousWeek++;
    }

    // This Month
    if (pubDate >= startOfMonth) {
      countThisMonth++;
    }
    
    // Previous Month
    if (pubDate >= startOfPreviousMonth && pubDate <= endOfPreviousMonth) {
      countPreviousMonth++;
    }
  });
  
  // Calculate growth percentages
  const yesterdayGrowth = countDayBeforeYesterday > 0 
    ? ((countYesterday - countDayBeforeYesterday) / countDayBeforeYesterday) * 100 
    : null;
  
  const weekGrowth = countPreviousWeek > 0 
    ? ((countThisWeek - countPreviousWeek) / countPreviousWeek) * 100 
    : null;
  
  const monthGrowth = countPreviousMonth > 0 
    ? ((countThisMonth - countPreviousMonth) / countPreviousMonth) * 100 
    : null;

  const handleNavigate = (period: string) => {
      // Navigate to /dashboard/ai/analytics/[username]/activity?period=...&platform=...
      const currentPath = window.location.pathname; // Should be /dashboard/ai/analytics/[username]
      router.push(`${currentPath}/activity?period=${period}&platform=${platform}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-bold text-slate-900">Posting Activity</h3>
      </div>

      <div className="space-y-4">
        {/* Yesterday */}
        <div 
            onClick={() => handleNavigate('yesterday')}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 hover:border-slate-300 hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-200 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Yesterday</p>
              <p className="text-xs text-slate-500">Posts published</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{countYesterday}</span>
        </div>

        {/* This Week */}
        <div 
            onClick={() => handleNavigate('week')}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 hover:border-slate-300 hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">This Week</p>
              <p className="text-xs text-slate-500">Since Monday</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{countThisWeek}</span>
        </div>

        {/* This Month */}
        <div 
            onClick={() => handleNavigate('month')}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 hover:border-slate-300 hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">This Month</p>
              <p className="text-xs text-slate-500">Current month</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{countThisMonth}</span>
        </div>
      </div>
    </div>
  );
}
