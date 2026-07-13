import React, { useMemo, useState } from 'react';
import { Video, Share2, ThumbsUp, MessageCircle, TrendingUp, BarChart3, LayoutGrid, Users } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line 
} from 'recharts';
import { FacebookPost, ImageWithFallback } from './common';

interface ReelsAnalyticsProps {
  data: FacebookPost[];
  loading: boolean;
}

export const ReelsAnalytics: React.FC<ReelsAnalyticsProps> = ({ data, loading }) => {
  const [showAllContent, setShowAllContent] = useState(false);
  const [visibleCount, setVisibleCount] = useState(1000);

  // Filter only videos (Reels)
  const filteredData = useMemo(() => {
    return data.filter(item => item.isVideo);
  }, [data]);

  // Stats specific to Reels
  const stats = useMemo(() => {
    const totalLikes = filteredData.reduce((sum, item) => sum + item.likes, 0);
    const totalComments = filteredData.reduce((sum, item) => sum + item.comments, 0);
    const totalViews = filteredData.reduce((sum, item) => sum + item.views, 0);
    const totalShares = filteredData.reduce((sum, item) => sum + item.shares, 0);
    const totalItems = filteredData.length;
    
    const engagementRate = totalViews > 0 
      ? ((totalLikes + totalComments + totalShares) / totalViews) * 100 
      : 0;
    
    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagement = totalItems > 0 ? totalEngagement / totalItems : 0;

    return {
      totalLikes,
      totalComments,
      totalViews,
      totalShares,
      totalItems,
      totalEngagement,
      avgEngagement: avgEngagement.toFixed(1),
      engagementRate: engagementRate.toFixed(2)
    };
  }, [filteredData]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredData
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(item => ({
        date: new Date(item.timestamp * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        likes: item.likes,
        comments: item.comments,
        shares: item.shares,
        views: item.views,
        engagement: item.likes + item.comments + item.shares
      }));
  }, [filteredData]);

  if (loading) return null; // Parent handles loading spinner, but just in case
  if (filteredData.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="p-4 bg-slate-50 rounded-full mb-3">
                  <Video className="w-8 h-8 opacity-50" />
              </div>
              <p>Chưa có dữ liệu Reels/Videos trong khoảng thời gian này</p>
          </div>
      )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5" /></div>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng Video</span>
                </div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalItems.toLocaleString()}</div>
                 <div className="text-[10px] text-slate-400 mt-1">Video trong khoảng thời gian này</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                     <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><ThumbsUp className="w-5 h-5" /></div>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                        Tổng Likes
                    </span>
                </div>
                <div className="text-3xl font-black text-rose-600 tracking-tight">
                    {stats.totalLikes.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                    Tổng like video
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex items-center gap-3 mb-3">
                     <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng Tương tác</span>
                </div>
                <div className="text-3xl font-black text-amber-600 tracking-tight">{stats.totalEngagement.toLocaleString()}</div>
                 <div className="text-[10px] text-slate-400 mt-1">Tổng Likes+Cmt+Share video</div>
            </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex items-center gap-3 mb-3">
                     <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><BarChart3 className="w-5 h-5" /></div>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tương tác / Video</span>
                </div>
                <div className="text-3xl font-black text-indigo-600 tracking-tight">{stats.avgEngagement}</div>
                 <div className="text-[10px] text-slate-400 mt-1">Trung bình tương tác mỗi video</div>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Biểu đồ tương tác Video
                    </h3>
                    <p className="text-sm text-slate-500">Xu hướng Likes & Comments trên Reels</p>
                </div>
            </div>
            
            <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorLikesVideo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#94a3b8', fontSize: 11}} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#94a3b8', fontSize: 11}} 
                            />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)'}}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="views" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                fillOpacity={0.05} 
                                fill="#10b981" 
                                name="Lượt xem"
                            />
                            <Area 
                                type="monotone" 
                                dataKey="likes" 
                                stroke="#2563eb" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorLikesVideo)" 
                                name="Lượt thích"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="comments" 
                                stroke="#f59e0b" 
                                strokeWidth={2} 
                                dot={{fill: '#f59e0b', strokeWidth: 2, r: 4}}
                                activeDot={{r: 6}}
                                name="Bình luận"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <BarChart3 className="w-8 h-8 opacity-50 mb-2" />
                        <p>Chưa có dữ liệu biểu đồ</p>
                    </div>
                )}
            </div>
        </div>

        {/* Content List */}
        <div>
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <Video className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                        Danh sách Reels <span className="text-slate-400 text-lg font-normal ml-1">({stats.totalItems})</span>
                    </h3>
                </div>
                
                {!showAllContent && stats.totalItems > 0 && (
                    <button 
                        onClick={() => setShowAllContent(true)}
                        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Hiển thị chi tiết
                    </button>
                )}
            </div>

            <div className="space-y-6">
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                    {filteredData.slice(0, showAllContent ? visibleCount : 8).map((item, idx) => (
                            <div key={item.id || idx} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group relative">
                                <div className="bg-slate-100 relative overflow-hidden aspect-[9/16]">
                                    <ImageWithFallback 
                                        src={item.thumbnail} 
                                        alt={item.text} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        isVideo={true}
                                    />
                                    
                                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[1px]">
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-xl">
                                            Xem ngay <Share2 className="w-3 h-3" />
                                        </a>
                                    </div>

                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[10px] font-bold z-10 drop-shadow-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded-md"><Video className="w-3 h-3" /> {item.views.toLocaleString()}</span>
                                            <span className="flex items-center gap-1 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded-md"><ThumbsUp className="w-3 h-3" /> {item.likes}</span>
                                            <span className="flex items-center gap-1 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded-md"><MessageCircle className="w-3 h-3" /> {item.comments}</span>
                                        </div>
                                    </div>

                                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1">
                                            <Video className="w-3 h-3" />
                                    </div>
                                </div>

                                <div className="p-3">
                                    <p className="text-xs font-medium text-slate-700 line-clamp-2 h-8 leading-relaxed">
                                        {item.text || 'Không có mô tả'}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                        <span className="text-[10px] text-slate-400 font-medium">{new Date(item.timestamp * 1000).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
                
                {/* See More Button */}
                {!showAllContent && filteredData.length > 8 && (
                    <div className="flex justify-center pt-4">
                        <button 
                            onClick={() => setShowAllContent(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/30 hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Xem thêm ({filteredData.length - 8} nội dung)
                        </button>
                    </div>
                )}
                
                {showAllContent && visibleCount < filteredData.length && (
                    <div className="flex justify-center pt-4">
                        <button 
                            onClick={() => setVisibleCount(prev => prev + 20)}
                            className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                        >
                            Tải thêm ({filteredData.length - visibleCount} nội dung)
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
