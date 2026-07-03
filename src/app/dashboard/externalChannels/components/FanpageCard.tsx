'use client';

import { Users, Heart, VideoCamera, ArrowsClockwise, BookmarkSimple, Timer, ArrowSquareOut, CircleNotch } from '@phosphor-icons/react';
import { ScrapedFanpage } from '@/services/scraperService';

interface FanpageCardProps {
  fanpage: ScrapedFanpage;
  onScrapeReels: (fp: ScrapedFanpage) => void;
  onToggleBookmark: (fp: ScrapedFanpage) => void;
  onTogglePeriodic: (fp: ScrapedFanpage) => void;
  onViewDetail: (fp: ScrapedFanpage) => void;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export default function FanpageCard({
  fanpage: fp, onScrapeReels, onToggleBookmark, onTogglePeriodic, onViewDetail,
}: FanpageCardProps) {
  const isProcessing = fp.scraping_status === 'processing';

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.01] cursor-default ${
        fp.is_bookmarked
          ? 'border-amber-200 dark:border-amber-700 ring-1 ring-amber-100 dark:ring-amber-900'
          : 'border-border'
      }`}
    >
      {/* Bookmarked / Periodic badges */}
      {(fp.is_bookmarked || fp.is_periodic_crawl) && (
        <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-0">
          {/* {fp.is_bookmarked && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-xs font-medium">
              <BookmarkSimple size={10} weight="fill" /> Đã lưu
            </span>
          )} */}
          {fp.is_periodic_crawl && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-medium">
              <Timer size={10} weight="fill" /> Tự động
            </span>
          )}
        </div>
      )}

      {/* Header with avatar */}
      <div className="flex items-center gap-3 p-3.5 pb-2">
        <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-600">
          {fp.id ? (
            <img
              src={`https://graph.facebook.com/${fp.profile_id || fp.id}/picture?type=large`}
              alt={fp.name}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-400">
              <Users size={20} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{fp.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">@{fp.handle || fp.profile_id}</p>
        </div>
        {/* Processing badge */}
        {isProcessing && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
            <CircleNotch size={11} weight="bold" className="animate-spin" />
            Đang cào
          </span>
        )}
      </div>

      {/* Metrics — ẩn giá trị = 0 */}
      <div className="flex items-center gap-4 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-blue-500" />
          <span className="text-sm font-bold text-foreground">{formatNum(fp.followers_count)}</span>
        </div>
        {fp.likes_count > 0 && (
          <div className="flex items-center gap-1.5">
            <Heart size={14} className="text-pink-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{formatNum(fp.likes_count)}</span>
          </div>
        )}
        {fp.reels_count > 0 && (
          <div className="flex items-center gap-1.5">
            <VideoCamera size={14} className="text-purple-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{fp.reels_count}</span>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center border-t border-border bg-slate-50/50 dark:bg-slate-800/30">
        {/* Primary CTA */}
        <button
          onClick={() => onScrapeReels(fp)}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-r border-border disabled:opacity-40 ${
            isProcessing
              ? 'text-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
              : fp.is_initial_scraped
                ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          }`}
        >
          {isProcessing ? (
            <CircleNotch size={13} weight="bold" className="animate-spin" />
          ) : (
            <ArrowsClockwise size={13} weight="bold" />
          )}
          {isProcessing ? 'Đang cào...' : fp.is_initial_scraped ? 'Cào mới' : 'Cào lượt đầu'}
        </button>

        {/* Icon actions with labels */}
        <button
          onClick={() => onToggleBookmark(fp)}
          className={`flex items-center gap-1 px-3 py-2.5 text-xs transition-colors border-r border-border ${
            fp.is_bookmarked
              ? 'text-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
              : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
          }`}
          title={fp.is_bookmarked ? 'Bỏ lưu' : 'Lưu'}
        >
          <BookmarkSimple size={14} weight={fp.is_bookmarked ? 'fill' : 'regular'} />
        </button>
        <button
          onClick={() => onTogglePeriodic(fp)}
          className={`flex items-center gap-1 px-3 py-2.5 text-xs transition-colors border-r border-border ${
            fp.is_periodic_crawl
              ? 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'
              : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
          }`}
          title={fp.is_periodic_crawl ? 'Tắt cào định kỳ' : 'Bật cào định kỳ'}
        >
          <Timer size={14} weight={fp.is_periodic_crawl ? 'fill' : 'regular'} />
        </button>
        <button
          onClick={() => onViewDetail(fp)}
          className="flex items-center gap-1 px-3 py-2.5 text-xs text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
          title="Xem chi tiết"
        >
          <ArrowSquareOut size={14} />
        </button>
      </div>
    </div>
  );
}
