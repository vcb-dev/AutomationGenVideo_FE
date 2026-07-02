'use client';

import { Users, Heart, VideoCamera, ArrowsClockwise, BookmarkSimple, Timer, CircleNotch, SealCheck, Buildings, UserCircle } from '@phosphor-icons/react';
import { InstagramProfile } from '@/services/scraperService';
import { ChannelInfo } from '@/services/channelsService';

function proxyImg(url: string): string {
  if (!url) return '';
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

interface Props {
  profile: InstagramProfile;
  channelInfo?: ChannelInfo;
  onScrape: () => void;
  onToggleBookmark: () => void;
  onToggleTracked: () => void;
  onViewDetail: () => void;
}

export default function InstagramProfileCard({ profile: p, channelInfo, onScrape, onToggleBookmark, onToggleTracked, onViewDetail }: Props) {
  const isProcessing = p.scraping_status === 'processing';

  return (
    <div
      onClick={onViewDetail}
      className={`bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.01] cursor-pointer ${
        p.is_bookmarked
          ? 'border-amber-200 dark:border-amber-700 ring-1 ring-amber-100 dark:ring-amber-900'
          : 'border-border'
      }`}
    >
      {/* Badges */}
      {(p.is_tracked || isProcessing) && (
        <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-0">
          {p.is_tracked && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-medium">
              <Timer size={10} weight="fill" /> Theo dõi
            </span>
          )}
          {isProcessing && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-xs font-medium">
              <CircleNotch size={10} weight="bold" className="animate-spin" /> Đang cào
            </span>
          )}
        </div>
      )}

      {/* Avatar + Info */}
      <div className="flex items-center gap-3 p-3.5 pb-2">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-600">
          {p.avatar_url ? (
            <img src={proxyImg(p.avatar_url)} alt={p.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 text-pink-400">
              <Users size={22} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold text-foreground truncate">@{p.username}</p>
            {p.is_verified && <SealCheck size={14} weight="fill" className="text-blue-500 flex-shrink-0" />}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-blue-500" />
          <span className="text-sm font-bold text-foreground">{formatNum(p.followers_count)}</span>
        </div>
        {p.posts_count > 0 && (
          <div className="flex items-center gap-1.5">
            <Heart size={13} className="text-pink-500" />
            <span className="text-xs text-slate-500">{formatNum(p.posts_count)} bài</span>
          </div>
        )}
        {p.reels_in_db > 0 && (
          <div className="flex items-center gap-1.5">
            <VideoCamera size={13} className="text-purple-500" />
            <span className="text-xs text-slate-500">{p.reels_in_db}</span>
          </div>
        )}
      </div>

      {/* Team / Owner */}
      {channelInfo !== undefined && (
        <div className="grid grid-cols-2 gap-x-3 px-3.5 py-2 border-t border-border/50 bg-slate-50/30 dark:bg-slate-800/20">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-slate-400 mb-0.5">
              <Buildings size={10} />
              <span className="text-[10px] uppercase tracking-wide">Team</span>
            </div>
            <p className={`text-xs truncate ${channelInfo.team_name ? 'font-medium text-foreground' : 'italic text-slate-400'}`}>
              {channelInfo.team_name ?? 'Chưa có dữ liệu'}
            </p>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-slate-400 mb-0.5">
              <UserCircle size={10} />
              <span className="text-[10px] uppercase tracking-wide">Chủ kênh</span>
            </div>
            <p className={`text-xs truncate ${channelInfo.owner_name ? 'font-medium text-foreground' : 'italic text-slate-400'}`}>
              {channelInfo.owner_name ?? 'Chưa có dữ liệu'}
            </p>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center border-t border-border bg-slate-50/50 dark:bg-slate-800/30" onClick={e => e.stopPropagation()}>
        <button
          onClick={onScrape}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-r border-border disabled:opacity-40 ${
            isProcessing
              ? 'text-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
              : p.is_initial_scraped
                ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          }`}
        >
          {isProcessing ? (
            <CircleNotch size={13} weight="bold" className="animate-spin" />
          ) : (
            <ArrowsClockwise size={13} weight="bold" />
          )}
          {isProcessing ? 'Đang cào...' : p.is_initial_scraped ? 'Cập nhật' : 'Cào lượt đầu'}
        </button>
        <button
          onClick={onToggleBookmark}
          className={`flex items-center gap-1 px-3 py-2.5 text-xs transition-colors border-r border-border ${
            p.is_bookmarked
              ? 'text-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
              : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50/50'
          }`}
          title={p.is_bookmarked ? 'Bỏ lưu' : 'Lưu'}
        >
          <BookmarkSimple size={14} weight={p.is_bookmarked ? 'fill' : 'regular'} />
        </button>
        <button
          onClick={onToggleTracked}
          className={`flex items-center gap-1 px-3 py-2.5 text-xs transition-colors ${
            p.is_tracked
              ? 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'
              : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/50'
          }`}
          title={p.is_tracked ? 'Tắt theo dõi' : 'Bật theo dõi'}
        >
          <Timer size={14} weight={p.is_tracked ? 'fill' : 'regular'} />
        </button>
      </div>
    </div>
  );
}
