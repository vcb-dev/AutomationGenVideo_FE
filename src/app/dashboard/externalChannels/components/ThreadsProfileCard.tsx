'use client';

import { Users, BookmarkSimple, Timer, CircleNotch, SealCheck, UserCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { ThreadsProfile } from '@/services/scraperService';
import DeleteChannelButton from './DeleteChannelButton';

function proxyImg(url?: string): string {
  if (!url) return '';
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function formatNum(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n, 10) || 0 : n;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

interface Props {
  profile: ThreadsProfile;
  onScrape?: () => void;
  onToggleBookmark: () => void;
  onToggleTracked?: () => void;
  onViewDetail: () => void;
  onDelete?: () => void;
}

export default function ThreadsProfileCard({
  profile: p,
  onScrape,
  onToggleBookmark,
  onToggleTracked,
  onViewDetail,
  onDelete,
}: Props) {
  const isProcessing = p.scraping_status === 'processing';

  return (
    <div
      onClick={onViewDetail}
      className={`bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.01] cursor-pointer flex flex-col justify-between ${
        p.is_bookmarked
          ? 'border-amber-200 dark:border-amber-700 ring-1 ring-amber-100 dark:ring-amber-900'
          : 'border-border'
      }`}
    >
      <div>
        {/* Badges */}
        {(p.is_tracked || isProcessing) && (
          <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-0">
            {p.is_tracked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-medium">
                <Timer size={10} weight="fill" /> Kênh chú ý
              </span>
            )}
            {isProcessing && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-xs font-medium animate-pulse">
                <CircleNotch size={10} className="animate-spin" /> Đang cào...
              </span>
            )}
          </div>
        )}

        {/* Header: Avatar + Info */}
        <div className="p-3.5 flex items-start gap-3">
          <div className="relative flex-shrink-0">
            {p.avatar_url ? (
              <img
                src={proxyImg(p.avatar_url)}
                alt={p.username}
                className="w-11 h-11 rounded-full object-cover border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <UserCircle size={24} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-semibold text-foreground truncate">{p.name || p.username}</h3>
              {p.is_verified && <SealCheck size={13} weight="fill" className="text-blue-500 flex-shrink-0" />}
            </div>
            <p className="text-xs text-slate-400 truncate">@{p.username}</p>
            {p.biography && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{p.biography}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 px-3.5 py-2 bg-slate-50/60 dark:bg-slate-800/30 border-y border-border text-center">
          <div>
            <span className="text-xs text-slate-400 block">Người theo dõi</span>
            <span className="text-xs font-bold text-foreground">{formatNum(p.followers_count)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Bài viết cào được</span>
            <span className="text-xs font-bold text-foreground">{p.posts_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <span>
          {p.last_scraped_at
            ? `Cập nhật ${new Date(p.last_scraped_at).toLocaleDateString('vi-VN')}`
            : 'Chưa cào'}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {onScrape && (
            <button
              onClick={onScrape}
              disabled={isProcessing}
              title="Cào lại kênh"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-foreground transition-colors disabled:opacity-50"
            >
              <ArrowsClockwise size={15} className={isProcessing ? 'animate-spin' : ''} />
            </button>
          )}

          {onToggleTracked && (
            <button
              onClick={onToggleTracked}
              title={p.is_tracked ? 'Bỏ chú ý' : 'Theo dõi định kỳ'}
              className={`p-1.5 rounded transition-colors ${
                p.is_tracked
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600'
              }`}
            >
              <Timer size={15} weight={p.is_tracked ? 'fill' : 'regular'} />
            </button>
          )}

          <button
            onClick={onToggleBookmark}
            title={p.is_bookmarked ? 'Bỏ lưu' : 'Lưu kênh'}
            className={`p-1.5 rounded transition-colors ${
              p.is_bookmarked
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600'
            }`}
          >
            <BookmarkSimple size={15} weight={p.is_bookmarked ? 'fill' : 'regular'} />
          </button>

          {onDelete && <DeleteChannelButton onDelete={onDelete} />}
        </div>
      </div>
    </div>
  );
}
