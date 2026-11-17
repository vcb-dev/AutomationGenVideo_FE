'use client';

import { useState } from 'react';
import { AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { socialApi, type SocialAccount, type TikTokChannelStats as Stats } from '@/lib/api/social';
import { useSocialLang } from '@/contexts/SocialLanguageContext';
import { usePublishErrorText } from '@/lib/social/use-publish-error-text';
import { formatCompact, hasStatsScope } from '@/lib/social/tiktok-stats';

/** Dải số liệu trên thẻ kênh TikTok: người theo dõi, lượt thích, số video, lần đồng bộ + nút Đồng bộ / Xem video */
export default function TikTokChannelStats({
  account,
  onSynced,
  onOpenVideos,
}: {
  account: SocialAccount;
  onSynced: () => void;
  onOpenVideos: (account: SocialAccount) => void;
}) {
  const { t } = useSocialLang();
  const ts = t.tiktokStats;
  const errText = usePublishErrorText();
  const [syncing, setSyncing] = useState(false);
  const extra = (account.extra_data as Record<string, unknown> | undefined) || {};
  const stats = (extra.stats as Stats | undefined) ?? null;

  if (!hasStatsScope(extra.scope)) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {ts.needReconnect}
      </p>
    );
  }

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await socialApi.tiktok.syncStats(account.id);
      toast.success(ts.syncDone(r.videos.length));
      onSynced();
    } catch (err: any) {
      toast.error(errText(err?.response?.data?.message || err?.message) || ts.syncFailed);
    } finally {
      setSyncing(false);
    }
  };

  const tiles = [
    { label: ts.followers, value: stats?.followers },
    { label: ts.likes, value: stats?.likes },
    { label: ts.videos, value: stats?.videoCount },
  ];

  return (
    <div className="space-y-2" data-testid="tiktok-channel-stats">
      <div className="grid grid-cols-3 gap-1.5">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 text-center">
            <p className="text-sm font-black text-slate-900">{stats ? formatCompact(x.value) : '—'}</p>
            <p className="text-[10px] text-slate-500 truncate">{x.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400">
        {stats?.syncedAt ? ts.lastSynced(new Date(stats.syncedAt).toLocaleString(t.dateLocale)) : ts.neverSynced}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-black text-white text-[11px] font-bold px-2 py-1.5 hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? ts.syncing : ts.syncNow}
        </button>
        <button
          type="button"
          onClick={() => onOpenVideos(account)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-slate-700 text-[11px] font-bold px-2 py-1.5 hover:bg-slate-50"
        >
          <BarChart3 className="w-3.5 h-3.5" /> {ts.viewVideos}
        </button>
      </div>
    </div>
  );
}
