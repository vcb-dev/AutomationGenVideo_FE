'use client';

import { Eye, Heart, ChatCircle, ShareNetwork, BookmarkSimple, SealCheck, FilmReel } from '@phosphor-icons/react';
import { TikTokVideo } from '@/services/scraperService';

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const posted = new Date(dateStr).getTime();
  const diffMs = now - posted;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} ngày trước`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 5) return `${diffW} tuần trước`;
  const diffM = Math.floor(diffD / 30);
  if (diffM < 12) return `${diffM} tháng trước`;
  return `${Math.floor(diffD / 365)} năm trước`;
}

function renderCaption(text: string) {
  if (!text) return null;
  return text.split(/(#\S+)/g).map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className="text-blue-500 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function TikTokVideoCard({ video }: { video: TikTokVideo }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 overflow-hidden max-h-[320px]">
        {video.preview_image ? (
          <img
            src={video.preview_image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
            <FilmReel size={32} />
          </div>
        )}

        {/* Metrics overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-2.5 pt-8">
          <div className="flex items-center gap-2.5 text-white text-xs">
            {(video.play_count ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Eye size={12} weight="fill" />
                {formatNum(video.play_count!)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Heart size={12} weight="fill" />
              {formatNum(video.digg_count)}
            </span>
            <span className="flex items-center gap-1">
              <ChatCircle size={12} weight="fill" />
              {formatNum(video.comment_count)}
            </span>
            {video.share_count > 0 && (
              <span className="flex items-center gap-1">
                <ShareNetwork size={12} weight="fill" />
                {formatNum(video.share_count)}
              </span>
            )}
            {video.collect_count > 0 && (
              <span className="flex items-center gap-1">
                <BookmarkSimple size={12} weight="fill" />
                {formatNum(video.collect_count)}
              </span>
            )}
          </div>
        </div>

        {/* Duration badge */}
        {video.video_duration > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-white text-xs font-medium">
            {Math.floor(video.video_duration / 60)}:{String(video.video_duration % 60).padStart(2, '0')}
          </div>
        )}

        {/* Keyword badge */}
        {video.search_keyword && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-600/80 backdrop-blur-sm rounded text-white text-xs truncate max-w-[70%]">
            {video.search_keyword}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Caption */}
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
          {renderCaption(video.description)}
        </p>

        {/* Author */}
        {video.author && (
          <div className="flex items-center gap-2 mt-auto pt-1.5">
            {video.author.avatar_url ? (
              <img src={video.author.avatar_url} alt="" className="w-5 h-5 rounded-full ring-1 ring-slate-200 dark:ring-slate-600" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600" />
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {video.author.display_name || video.author.username}
            </span>
            {video.author.is_verified && (
              <SealCheck size={12} weight="fill" className="text-blue-500 flex-shrink-0" />
            )}
          </div>
        )}

        {/* Relative time */}
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {relativeTime(video.date_posted)}
        </p>
      </div>
    </a>
  );
}
