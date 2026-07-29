'use client';

import { Play, Users, Heart, Loader2, RefreshCw, Download } from 'lucide-react';
import { FacebookPage } from '@/types/facebook';
import { ChannelInfo } from '@/services/channelsService';

interface PageTableRowProps {
  page: FacebookPage;
  channelInfo?: ChannelInfo;
  onViewVideos: (page: FacebookPage) => void;
  onTriggerScrape: (page: FacebookPage) => void;
  onBackfill: (page: FacebookPage) => void;
  loadingVideos: boolean;
  selectedPageId?: string;
}

function getPageAvatar(page: FacebookPage): string {
  return `https://graph.facebook.com/${page.page_id}/picture?type=large`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

export default function PageTableRow({
  page,
  channelInfo,
  onViewVideos,
  onTriggerScrape,
  onBackfill,
  loadingVideos,
  selectedPageId,
}: PageTableRowProps) {
  const hasVideos = (page.video_count || 0) > 0;
  const needsBackfill = !hasVideos && !page.is_scraping;

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50/50 transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
        <img
          src={getPageAvatar(page)}
          alt={page.name}
          className="w-full h-full object-cover"
          onError={e => {
            const target = e.target as HTMLImageElement;
            if (page.avatar_url && target.src !== page.avatar_url) {
              target.src = page.avatar_url;
            } else {
              target.style.display = 'none';
            }
          }}
        />
      </div>

      {/* Name + Category */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{page.name}</p>
        <p className="text-xs text-slate-400 truncate">{page.category || 'Facebook Page'}</p>
      </div>

      {/* Followers */}
      <div className="w-28 flex items-center justify-center gap-1.5">
        <Users size={14} className="text-blue-500" />
        <span className="text-sm font-semibold text-slate-700">{formatNumber(page.followers_count)}</span>
      </div>

      {/* Likes */}
      <div className="w-20 flex items-center justify-center gap-1.5">
        <Heart size={14} className="text-pink-500" />
        <span className="text-sm font-semibold text-slate-700">{formatNumber(page.likes_count)}</span>
      </div>

      {/* Team */}
      <div className="w-24 text-center">
        <p className={`text-xs truncate ${channelInfo?.team_name ? 'font-medium text-slate-700' : 'italic text-slate-400'}`}>
          {channelInfo?.team_name ?? '—'}
        </p>
      </div>

      {/* Owner */}
      <div className="w-40 text-center">
        <p className={`text-xs truncate ${channelInfo?.owner_name ? 'font-medium text-slate-700' : 'italic text-slate-400'}`}>
          {channelInfo?.owner_name ?? '—'}
        </p>
      </div>

      {/* Status */}
      <div className="w-28 flex justify-center">
        {page.is_scraping ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
            <Loader2 size={11} className="animate-spin" />
            Đang cào
          </span>
        ) : page.scrape_error ? (
          <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold truncate max-w-full" title={page.scrape_error}>
            Lỗi
          </span>
        ) : hasVideos ? (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
            {page.video_count} video
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold">
            Chưa cào
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="w-48 flex items-center justify-center gap-2">
        {hasVideos && (
          <button
            onClick={() => onViewVideos(page)}
            disabled={loadingVideos && selectedPageId === page.page_id}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingVideos && selectedPageId === page.page_id ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            Xem
          </button>
        )}

        {needsBackfill ? (
          <button
            onClick={() => onBackfill(page)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Download size={13} />
            Cào lượt đầu
          </button>
        ) : (
          <button
            onClick={() => onTriggerScrape(page)}
            disabled={page.is_scraping}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            title="Cào bài mới"
          >
            {page.is_scraping ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Cào mới
          </button>
        )}
      </div>
    </div>
  );
}
