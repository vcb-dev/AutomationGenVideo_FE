'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Eye, Heart, MessageCircle, Share2, Users, ExternalLink } from 'lucide-react';
import { FacebookVideo } from '@/types/facebook';

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function renderCaptionWithHashtags(text: string) {
  if (!text) return <span className="text-slate-400 italic">Không có mô tả</span>;
  return text.split(/(#\S+)/g).map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className="text-blue-500 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

interface VideoCardProps {
  video: FacebookVideo;
  isPlaying: boolean;
  onPlay: (postId: string) => void;
}

export default function VideoCard({ video, isPlaying, onPlay }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!isPlaying) {
      el.pause();
    }
  }, [isPlaying]);

  const handlePlay = () => {
    const el = videoRef.current;
    if (el) {
      el.muted = false;
      el.volume = 1.0;
      el.currentTime = 0;
      el.play().catch(() => {
        el.muted = true;
        el.play();
      });
    }
    onPlay(video.post_id);
  };

  const handlePause = () => {
    videoRef.current?.pause();
    onPlay('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="relative aspect-[9/16] bg-slate-900 overflow-hidden">

        {/* Video element — luôn tồn tại trong DOM */}
        {video.video_url && (
          <video
            ref={videoRef}
            src={video.video_url}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isPlaying ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            controls={isPlaying}
            playsInline
            preload="none"
            onEnded={() => onPlay('')}
          />
        )}

        {/* Thumbnail overlay — ẩn khi đang play */}
        <div className={`absolute inset-0 transition-opacity duration-200 ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 -z-10">
            <Play size={40} className="text-slate-600" />
          </div>

          {/* Glassmorphism Play Button */}
          {video.video_url && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 shadow-lg group-hover:scale-110 group-hover:bg-white/30 transition-all duration-200">
                <Play size={22} className="text-white ml-0.5" fill="white" />
              </div>
            </button>
          )}

          {/* Views badge */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md">
            <Eye size={12} className="text-white/90" />
            <span className="text-xs font-semibold text-white/90">{formatNumber(video.view_count)}</span>
          </div>

          {/* Open permalink in new tab */}
          {video.permalink_url && (
            <a
              href={video.permalink_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 bg-black/40 backdrop-blur-sm rounded-lg hover:bg-black/60 transition-colors"
              title="Xem trên Facebook"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={13} className="text-white/90" />
            </a>
          )}
        </div>

        {/* Pause button khi đang play */}
        {isPlaying && (
          <button
            onClick={handlePause}
            className="absolute top-2 left-2 z-20 flex items-center justify-center w-8 h-8 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-colors"
          >
            <Pause size={14} className="text-white" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
          {renderCaptionWithHashtags(video.caption || '')}
        </p>
        <p className="text-xs text-slate-400">{formatDate(video.published_at)}</p>

        <div className="flex items-center gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1" title="Likes">
            <Heart size={13} className="text-pink-500" />
            <span className="text-xs font-medium text-slate-600">{formatNumber(video.like_count)}</span>
          </div>
          <div className="flex items-center gap-1" title="Comments">
            <MessageCircle size={13} className="text-blue-500" />
            <span className="text-xs font-medium text-slate-600">{formatNumber(video.comment_count)}</span>
          </div>
          <div className="flex items-center gap-1" title="Shares">
            <Share2 size={13} className="text-emerald-500" />
            <span className="text-xs font-medium text-slate-600">{formatNumber(video.share_count)}</span>
          </div>
          <div className="flex items-center gap-1 ml-auto" title="Reach">
            <Users size={13} className="text-purple-500" />
            <span className="text-xs font-medium text-slate-600">{formatNumber(video.reach_count)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
