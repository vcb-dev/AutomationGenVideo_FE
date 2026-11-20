'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { socialApi, type SocialAccount, type TikTokStatsResponse } from '@/lib/api/social';
import { useSocialLang } from '@/contexts/SocialLanguageContext';
import { usePublishErrorText } from '@/lib/social/use-publish-error-text';
import { FilterSelect } from '@/app/dashboard/internalChannels/components/FilterFields';
import { TikTokVideoSortKey, formatCompact, sortVideos } from '@/lib/social/tiktok-stats';

/** Cửa sổ số liệu TikTok của một kênh: tổng + bảng video (xem, thích, bình luận, chia sẻ), sắp xếp được */
export default function TikTokStatsModal({ account, onClose }: { account: SocialAccount; onClose: () => void }) {
  const { t } = useSocialLang();
  const ts = t.tiktokStats;
  const errText = usePublishErrorText();
  const [data, setData] = useState<TikTokStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<TikTokVideoSortKey>('views');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    socialApi.tiktok.stats(account.id)
      .then((r) => { if (!cancelled) setData(r); })
      .catch((err: any) => { if (!cancelled) setError(err?.response?.data?.message || err?.message || ''); });
    return () => { cancelled = true; };
  }, [account.id]);

  const videos = useMemo(() => (data ? sortVideos(data.videos, sortKey) : []), [data, sortKey]);
  const sortOptions = [
    { value: 'views', label: ts.views },
    { value: 'likes', label: ts.likes },
    { value: 'comments', label: ts.comments },
    { value: 'shares', label: ts.shares },
    { value: 'publishedAt', label: ts.publishedAt },
  ];
  const totals = data?.totals;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label={ts.modalTitle(account.name)}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-slate-900 truncate">{ts.modalTitle(account.name)}</h3>
          <button type="button" onClick={onClose} aria-label={ts.close} className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error !== null ? (
          <p className="m-6 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error ? errText(error) : ts.loadFailed}</p>
        ) : !data ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-500" /></div>
        ) : (
          <>
            <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-100" data-testid="tiktok-stats-totals">
              {[
                { label: ts.views, value: totals?.views },
                { label: ts.likes, value: totals?.likes },
                { label: ts.comments, value: totals?.comments },
                { label: ts.shares, value: totals?.shares },
              ].map((x) => (
                <div key={x.label} className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">{ts.totals} · {x.label}</p>
                  <p className="text-xl font-black text-slate-900">{formatCompact(x.value)}</p>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 flex items-center justify-end gap-2">
              <span className="text-xs font-semibold text-slate-500">{ts.sortBy}</span>
              <div className="w-44">
                <FilterSelect value={sortKey} onChange={(v) => setSortKey(v as TikTokVideoSortKey)} options={sortOptions} />
              </div>
            </div>

            <div className="px-6 pb-6 overflow-y-auto flex-1">
              {videos.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">{ts.empty}</p>
              ) : (
                <table className="w-full text-sm" data-testid="tiktok-stats-table">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-3 font-bold">{ts.videos}</th>
                      <th className="py-2 px-2 font-bold whitespace-nowrap">{ts.publishedAt}</th>
                      <th className="py-2 px-2 font-bold text-right">{ts.views}</th>
                      <th className="py-2 px-2 font-bold text-right">{ts.likes}</th>
                      <th className="py-2 px-2 font-bold text-right">{ts.comments}</th>
                      <th className="py-2 pl-2 font-bold text-right">{ts.shares}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((v) => (
                      <tr key={v.postId} className="border-t border-slate-100" data-post-id={v.postId}>
                        <td className="py-2.5 pr-3 max-w-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate text-slate-800" title={v.title || ''}>
                              {(v.title || v.postId).slice(0, 80)}
                            </span>
                            {v.url && (
                              <a href={v.url} target="_blank" rel="noopener noreferrer" title={ts.openOnTikTok} className="text-slate-400 hover:text-black shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-slate-500 whitespace-nowrap">
                          {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString(t.dateLocale) : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-slate-900">{formatCompact(v.views)}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatCompact(v.likes)}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatCompact(v.comments)}</td>
                        <td className="py-2.5 pl-2 text-right text-slate-700">{formatCompact(v.shares)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
