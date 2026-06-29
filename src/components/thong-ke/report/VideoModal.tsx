import React from 'react';
import { X, Play, ExternalLink, XCircle } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
  platform?: string;
}

function parseVideoUrl(url: string) {
  if (!url) return { type: 'unknown', embedUrl: '' };

  // YouTube
  // Matches: youtube.com/watch?v=ID, youtube.com/embed/ID, youtu.be/ID, youtube.com/shorts/ID
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`
    };
  }

  // TikTok
  // Matches: tiktok.com/@user/video/ID, tiktok.com/@user/photo/ID, tiktok.com/v/ID
  const ttRegex = /tiktok\.com\/.*\/(?:video|photo)\/(\d+)/;
  const ttMatch = url.match(ttRegex);
  if (ttMatch && ttMatch[1]) {
    return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`
    };
  }

  // Direct MP4 / WebM / Ogg
  if (url.match(/\.(mp4|webm|ogg)$/i) || url.includes('drive.google.com') || url.includes('supabase.co')) {
    return {
      type: 'direct',
      embedUrl: url
    };
  }

  return {
    type: 'iframe',
    embedUrl: url
  };
}

export default function VideoModal({ isOpen, onClose, videoUrl, title, platform }: VideoModalProps) {
  const [resolvedVideoId, setResolvedVideoId] = React.useState<string | null>(null);
  const [resolving, setResolving] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isPhoto, setIsPhoto] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !videoUrl) return;

    setErrorMsg(null);
    setResolvedVideoId(null);
    setIsPhoto(false);

    const isTikTok = videoUrl.includes('tiktok.com');
    const hasVideoId = videoUrl.match(/tiktok\.com\/.*\/(?:video|photo)\/(\d+)/);

    // If it is standard TikTok URL, check if it's photo post
    if (isTikTok && hasVideoId) {
      setIsPhoto(videoUrl.includes('/photo/'));
    }

    // If it is a shortened TikTok URL, fetch real ID from backend
    if (isTikTok && !hasVideoId) {
      setResolving(true);
      apiClient.get<{ success: boolean; videoId?: string; message?: string }>(
        `/content-report/resolve-tiktok?url=${encodeURIComponent(videoUrl)}`
      )
        .then(res => {
          if (res.data?.success && res.data?.videoId) {
            setResolvedVideoId(res.data.videoId);
          } else {
            setErrorMsg(res.data?.message || 'Không thể giải mã liên kết TikTok này.');
          }
        })
        .catch(err => {
          console.error('Error resolving TikTok URL:', err);
          setErrorMsg('Lỗi máy chủ khi giải mã liên kết TikTok.');
        })
        .finally(() => {
          setResolving(false);
        });
    }
  }, [isOpen, videoUrl]);

  if (!isOpen || !videoUrl) return null;

  const { type, embedUrl } = parseVideoUrl(videoUrl);
  
  // Use resolved ID for vertical TikTok iframe
  const finalEmbedUrl = resolvedVideoId 
    ? `https://www.tiktok.com/embed/v2/${resolvedVideoId}` 
    : embedUrl;

  const isVertical = !isPhoto && (type === 'tiktok' || resolvedVideoId !== null || videoUrl.includes('/shorts/') || videoUrl.includes('/reel/') || videoUrl.includes('instagram.com'));

  return (
    <div 
      className="fixed inset-0 bg-[#060814]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 transition-all duration-300"
      onClick={onClose}
    >
      {/* Cinematic Floating Title (Top-Left) */}
      <div className="fixed top-6 left-6 text-left z-50 max-w-[calc(100%-250px)] pointer-events-none select-none">
        <span className="text-[9px] font-black uppercase text-blue-400 tracking-[0.2em]">{platform || 'Video Content'}</span>
        <h3 className="text-white font-extrabold text-xs md:text-base line-clamp-1 mt-1 drop-shadow-md">
          {title || 'Chi tiết video'}
        </h3>
      </div>

      {/* Cinematic Floating Controls (Top-Right) */}
      <div className="fixed top-6 right-6 flex items-center gap-3 z-50">
        <a 
          href={videoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-full text-slate-300 hover:text-white transition-all hover:scale-105 shadow-xl flex items-center justify-center"
          title="Mở link gốc"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button 
          onClick={onClose}
          className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-full text-slate-300 hover:text-white transition-all hover:scale-105 shadow-xl flex items-center justify-center"
          title="Đóng (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Video Frame Container */}
      <div 
        className={`bg-black border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-300 scale-100 ${
          isVertical 
            ? 'w-[325px] h-[583px] max-h-[85vh] rounded-[24px]' 
            : 'w-[960px] max-w-full aspect-video max-h-[80vh] rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video Player Area */}
        <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
          {resolving ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#090e18] p-6 text-center select-none">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-xs text-slate-400 font-medium">Đang giải mã liên kết TikTok...</p>
            </div>
          ) : errorMsg ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#090e18] p-6 text-center select-none">
              <XCircle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
              <h4 className="text-xs md:text-sm font-black text-slate-200 uppercase tracking-widest">
                Không thể tải video
              </h4>
              <p className="text-[10px] md:text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                {errorMsg}
              </p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Xem trực tiếp trên TikTok
              </a>
            </div>
          ) : isPhoto ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#090e18] p-6 text-center select-none">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-xs md:text-sm font-black text-slate-200 uppercase tracking-widest">
                Bài đăng dạng album ảnh (slideshow)
              </h4>
              <p className="text-[10px] md:text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                Nền tảng TikTok không hỗ trợ trình chiếu Album ảnh trực tiếp trên các website bên ngoài. Bạn hãy xem đầy đủ hình ảnh và nghe nhạc nền tại liên kết gốc.
              </p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Xem album ảnh trên TikTok
              </a>
            </div>
          ) : (
            <>
              {(type === 'youtube') && (
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0 overflow-hidden"
                  style={{ colorScheme: 'dark', backgroundColor: 'black' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {(type === 'tiktok' || resolvedVideoId !== null) && (
                <iframe
                  src={finalEmbedUrl}
                  className="w-full h-full border-0 overflow-hidden rounded-b-[24px]"
                  style={{ colorScheme: 'dark', backgroundColor: 'black' }}
                  scrolling="no"
                  allow="autoplay"
                />
              )}
              {type === 'direct' && (
                <video
                  src={embedUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
              {type === 'iframe' && resolvedVideoId === null && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#090e18] p-6 text-center select-none">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                    <Play className="w-6 h-6 text-blue-400 fill-current ml-0.5" />
                  </div>
                  <h4 className="text-xs md:text-sm font-black text-slate-200 uppercase tracking-widest">
                    Trình phát không hỗ trợ nhúng trực tiếp
                  </h4>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                    Nền tảng này không hỗ trợ nhúng trực tiếp. Bạn hãy bấm vào nút bên dưới để xem trực tiếp tại liên kết gốc.
                  </p>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Xem trực tiếp nguồn video
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
