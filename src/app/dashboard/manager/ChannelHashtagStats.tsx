'use client';



import { useEffect, useState } from 'react';

import { useAuthStore } from '@/store/auth-store';

import { Hash, TrendingUp, Video as VideoIcon, Loader2, RefreshCw, AlertCircle, Info } from 'lucide-react';



interface HashtagStats {

  hashtag: string;

  count: number;

  percentage: number;

}



interface ChannelHashtagStatsProps {

  channelId: string;

  channelUsername: string;

}



const COMPANY_HASHTAGS = ['a1', 'a2', 'a3', 'a4', 'a5'];



export default function ChannelHashtagStats({ channelId, channelUsername }: ChannelHashtagStatsProps) {

  const { token } = useAuthStore();

  const [stats, setStats] = useState<HashtagStats[]>([]);

  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [totalVideos, setTotalVideos] = useState(0);

  const [totalChannelVideos, setTotalChannelVideos] = useState(0);

  const [coveragePercentage, setCoveragePercentage] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [hasLoaded, setHasLoaded] = useState(false);



  // Remove auto-loading useEffect

  // useEffect(() => {

  //   fetchHashtagStats();

  // }, [channelId]);



  const fetchHashtagStats = async (forceRefresh = false) => {

    if (!token) return;



    if (forceRefresh) {

      setRefreshing(true);

    } else {

      setLoading(true);

      setHasLoaded(true); // Mark as loaded so UI switches to stats view

    }

    

    setError(null);

    setMessage(null);



    try {

      const method = forceRefresh ? 'POST' : 'GET';

      const response = await fetch(

        `${process.env.NEXT_PUBLIC_API_URL}/tracked-channels/manager/channel-hashtag-stats/${channelId}`,

        {

          method,

          headers: {

            'Authorization': `Bearer ${token}`,

          },

        }

      );



      if (!response.ok) {

        throw new Error('Failed to fetch hashtag stats');

      }



      const data = await response.json();

      setStats(data.hashtag_stats || []);

      setTotalVideos(data.total_videos || 0);

      // If we have total_channel_videos, use it, otherwise fallback to total_videos if it seems reasonable

      setTotalChannelVideos(data.total_channel_videos || data.total_videos || 0);

      setCoveragePercentage(data.coverage_percentage || 0); 

      

      if (data.message) {

        setMessage(data.message);

      }

    } catch (err: any) {

      console.error('Error fetching hashtag stats:', err);

      setError(err.message || 'An error occurred');

      // If error on first load, reset hasLoaded so user can try again

      if (!forceRefresh) {

         // keep hasLoaded true to show error UI

      }

      // Set empty stats on error

      setStats([]);

      setTotalVideos(0);

      setTotalChannelVideos(0);

      setCoveragePercentage(0);

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  };



  const handleRefresh = () => {

    fetchHashtagStats(true);

  };



  const getBarColor = (hashtag: string) => {

    const colors: Record<string, string> = {

      'a1': 'bg-blue-500',

      'a2': 'bg-green-500',

      'a3': 'bg-purple-500',

      'a4': 'bg-orange-500',

      'a5': 'bg-pink-500',

    };

    return colors[hashtag.toLowerCase()] || 'bg-slate-500';

  };



  const getTextColor = (hashtag: string) => {

    const colors: Record<string, string> = {

      'a1': 'text-blue-700',

      'a2': 'text-green-700',

      'a3': 'text-purple-700',

      'a4': 'text-orange-700',

      'a5': 'text-pink-700',

    };

    return colors[hashtag.toLowerCase()] || 'text-slate-700';

  };



  const getBgColor = (hashtag: string) => {

    const colors: Record<string, string> = {

      'a1': 'bg-blue-50',

      'a2': 'bg-green-50',

      'a3': 'bg-purple-50',

      'a4': 'bg-orange-50',

      'a5': 'bg-pink-50',

    };

    return colors[hashtag.toLowerCase()] || 'bg-slate-50';

  };



  if (!hasLoaded) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        <button
          onClick={() => fetchHashtagStats(false)}
          className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-200 border-dashed"
        >
          <Hash className="w-4 h-4" />
          Xem Thống kê Hashtag
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
          <p className="text-sm text-slate-600">Đang tải dữ liệu hashtag...</p>
          <p className="text-xs text-slate-500 mt-1">Sử dụng videos đã có trong database</p>
        </div>
      </div>
    );
  }



  const maxCount = Math.max(...stats.map(s => s.count), 1);



  return (

    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">

      {/* Header */}

      <div className="flex items-center justify-between mb-3">

        <div className="flex items-center gap-2">

          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">

            <Hash className="w-4 h-4 text-purple-600" />

          </div>

          <div>

            <h4 className="font-semibold text-slate-900 text-sm">Thống kê Hashtag</h4>

            <div className="flex items-center gap-2">

              <p className="text-xs text-slate-600">

                Phân tích: <span className="font-bold text-purple-700">{totalVideos}</span>

                {totalChannelVideos > 0 && (

                  <>

                    /<span className="text-slate-500">{totalChannelVideos}</span> videos

                  </>

                )}

              </p>

              {coveragePercentage > 0 && coveragePercentage < 100 && (

                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">

                  {coveragePercentage}% coverage

                </span>

              )}

            </div>

          </div>

        </div>

        <button

          onClick={handleRefresh}

          disabled={refreshing}

          className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50"

          title="Tải thêm videos mới"

        >

          <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />

        </button>

      </div>



      {/* Coverage Warning */}

      {totalChannelVideos > 0 && coveragePercentage < 50 && (

        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">

          <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />

          <div className="text-xs text-yellow-700">

            <p className="font-semibold mb-1">Dữ liệu chưa đầy đủ</p>

            <p>

              Chỉ phân tích được {totalVideos}/{totalChannelVideos} videos ({coveragePercentage}%). 

              Kết quả có thể không chính xác 100%.

            </p>

          </div>

        </div>

      )}



      {/* Error Message */}

      {error && (

        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">

          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />

          <p className="text-xs text-red-700">{error}</p>

        </div>

      )}



      {/* Info Message */}

      {message && !error && (

        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">

          <p className="text-xs text-blue-700 text-center">{message}</p>

        </div>

      )}



      {/* Hashtag Bars */}

      {stats.length === 0 || totalVideos === 0 ? (

        <div className="text-center py-6 bg-white rounded-lg border border-slate-200">

          <VideoIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />

          <p className="text-sm text-slate-500 mb-2">Chưa có dữ liệu hashtag</p>

          <p className="text-xs text-slate-400 mb-3">

            Videos sẽ được lưu khi bạn search ở trang Channel Overview

          </p>

          <button

            onClick={handleRefresh}

            disabled={refreshing}

            className="text-xs px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-slate-300"

          >

            {refreshing ? 'Đang tải...' : 'Tải videos ngay'}

          </button>

        </div>

      ) : (

        <div className="space-y-2">

          {stats.map((stat, index) => (

            <div key={stat.hashtag} className={`${getBgColor(stat.hashtag)} rounded-lg p-3 border border-slate-200`}>

              {/* Hashtag Label */}

              <div className="flex items-center justify-between text-xs mb-2">

                <div className="flex items-center gap-2">

                  <span className={`font-bold ${getTextColor(stat.hashtag)} text-sm`}>

                    #{stat.hashtag}

                  </span>

                  <span className="text-slate-500">

                    {stat.count} videos

                  </span>

                </div>

                <span className={`font-semibold ${getTextColor(stat.hashtag)}`}>

                  {stat.percentage.toFixed(1)}%

                </span>

              </div>

              

              {/* Progress Bar */}

              <div className="relative w-full h-6 bg-white rounded-md overflow-hidden border border-slate-200">

                <div

                  className={`h-full ${getBarColor(stat.hashtag)} transition-all duration-700 ease-out flex items-center justify-end pr-2`}

                  style={{ width: `${(stat.count / maxCount) * 100}%` }}

                >

                  {stat.count > 0 && (stat.count / maxCount) > 0.15 && (

                    <span className="text-white text-xs font-bold drop-shadow">

                      {stat.count}

                    </span>

                  )}

                </div>

                {stat.count > 0 && (stat.count / maxCount) <= 0.15 && (

                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold ${getTextColor(stat.hashtag)}`}>

                    {stat.count}

                  </span>

                )}

              </div>

            </div>

          ))}

        </div>

      )}



      {/* Footer Info */}

      {totalVideos > 0 && (

        <div className="mt-3 pt-3 border-t border-slate-200">

          <div className="flex items-center justify-between text-xs text-slate-500">

            <span>Dữ liệu từ videos trong database</span>

            {coveragePercentage >= 80 && (

              <span className="text-green-600 font-medium">✓ Coverage tốt</span>

            )}

          </div>

        </div>

      )}

    </div>

  );

}

