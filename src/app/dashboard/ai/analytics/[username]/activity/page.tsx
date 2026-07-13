'use client';



import Image from "next/image";
import { useEffect, useState } from 'react';

import { useParams, useSearchParams, useRouter } from 'next/navigation';

import { ArrowLeft, Calendar, Play } from 'lucide-react';



export default function ActivityPage() {

  const params = useParams();

  const searchParams = useSearchParams();

  const router = useRouter();

  const username = decodeURIComponent(params.username as string).replace('@', '');

  const period = searchParams.get('period') || 'all'; // yesterday, week, month
  const platform = searchParams.get('platform') || 'TIKTOK';



  const [videos, setVideos] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    const fetchVideos = async () => {

      try {

        setLoading(true);

        // Use the optimized DB search endpoint

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${baseUrl}/ai/videos/by-channel?platform=${platform}&username=${username}&period=${period}&limit=50`, {

          method: 'GET',

          headers: {

            'Authorization': 'Bearer ' // Add token if needed, or leave empty if public

          }

        });



        if (response.ok) {

          const data = await response.json();

          console.log('API Debug:', data.debug_info); // Check this in Browser Console

          const allVideos = data.results || [];



          // Server-side filtering is now done, but we can double check or just set

          setVideos(allVideos);

        }

      } catch (error) {

        console.error('Failed to fetch videos:', error);

      } finally {

        setLoading(false);

      }

    };



    fetchVideos();

  }, [username, period]);







  const getTitle = () => {

    switch (period) {

      case 'yesterday': return 'Posts from Yesterday';

      case 'week': return 'Posts from This Week';

      case 'month': return 'Posts from This Month';

      default: return 'All Activities';

    }

  };



  return (

    <div className="p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            sessionStorage.setItem('analytics_from_activity', '1');
            router.push(`/dashboard/ai/analytics/${encodeURIComponent(username)}?platform=${platform}`);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Analytics
        </button>
      </div>

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">{getTitle()}</h1>

          <p className="text-slate-500">@{username} • {videos.length} items</p>

        </div>

      </div>



      {loading ? (

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">

          {[...Array(10)].map((_, i) => (

            <div key={i} className="bg-slate-100 rounded-xl overflow-hidden aspect-[9/16] animate-pulse relative">

              <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-slate-100" />

              <div className="absolute bottom-4 left-4 right-4 space-y-2">

                <div className="h-4 bg-slate-300 rounded w-3/4"></div>

                <div className="h-3 bg-slate-300 rounded w-1/2"></div>

              </div>

            </div>

          ))}

        </div>

      ) : (

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">

          {videos.map((video, idx) => (

            <div

              key={idx}

              className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all cursor-pointer"

              onClick={() => window.open(video.video_url, '_blank')}

            >

              {/* Thumbnail */}

              <div className="aspect-[9/16] relative bg-black/5">

                <Image

                  src={video.thumbnail_url || '/placeholder-video.jpg'}

                  alt={video.title}

                  className="w-full h-full object-cover"

                  loading="lazy"

                  referrerPolicy="no-referrer"

                  onError={(e) => {

                    const target = e.target as HTMLImageElement;

                    target.src = '/placeholder-video.jpg';

                  }}

                 width={0} height={0} sizes="100vw" unoptimized/>

                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">

                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">

                    <Play className="w-5 h-5 text-white fill-current" />

                  </div>

                </div>

              </div>



              {/* Info */}

              <div className="p-4">

                <p className="text-sm font-medium text-slate-900 line-clamp-2 mb-2 min-h-[40px]">

                  {video.title || video.description || 'No Caption'}

                </p>

                <div className="flex items-center gap-2 text-xs text-slate-500">

                  <Calendar className="w-3 h-3" />

                  {video.published_at ? new Date(video.published_at).toLocaleDateString() : 'Unknown date'}

                </div>

                <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100">

                  <div>

                    <p className="text-[10px] uppercase font-bold text-slate-400">Views</p>

                    <p className="font-semibold text-slate-900">

                      {Number(video.views_count).toLocaleString()}

                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-[10px] uppercase font-bold text-slate-400">Likes</p>

                    <p className="font-semibold text-slate-900">

                      {Number(video.likes_count).toLocaleString()}

                    </p>

                  </div>

                </div>

              </div>

            </div>

          ))}



          {videos.length === 0 && (

            <div className="col-span-full text-center py-20 text-slate-500">

              No videos found for this period.

            </div>

          )}

        </div>

      )}

    </div>

  );

}

