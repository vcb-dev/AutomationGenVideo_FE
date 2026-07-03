'use client';

import { Eye, ThumbsUp, ChatCircle, ShareNetwork } from '@phosphor-icons/react';
import { ScrapedReel } from '@/services/scraperService';

interface ReelCardProps {
  reel: ScrapedReel;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function renderCaption(text: string) {
  if (!text) return null;
  return text.split(/(#\S+)/g).map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className="text-blue-500 font-medium">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function ReelCard({ reel }: ReelCardProps) {
  return (
    <a
      href={reel.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-slate-100 overflow-hidden max-h-[280px]">
        {reel.thumbnail_url ? (
          <img
            src={reel.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 -z-10">
          <Eye size={32} />
        </div>

        {/* Metrics overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1">
              <Eye size={12} weight="fill" />
              {formatNum(reel.views_count)}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp size={12} weight="fill" />
              {formatNum(reel.likes_count)}
            </span>
            <span className="flex items-center gap-1">
              <ChatCircle size={12} weight="fill" />
              {formatNum(reel.comments_count)}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Caption */}
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
          {renderCaption(reel.content)}
        </p>

        {/* Fanpage info */}
        {reel.fanpage && (
          <div className="flex items-center gap-1.5 mt-auto pt-1.5">
            <img
              src={`https://graph.facebook.com/${reel.fanpage.id}/picture?type=small`}
              alt=""
              className="w-4 h-4 rounded-full"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-xs text-slate-500 truncate">{reel.fanpage.name}</span>
          </div>
        )}

        {/* Date */}
        <p className="text-xs text-slate-400">
          {new Date(reel.date_posted).toLocaleDateString('vi-VN')}
        </p>
      </div>
    </a>
  );
}
