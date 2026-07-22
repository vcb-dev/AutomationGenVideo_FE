'use client';

import { SocialPlatform, PLATFORM_META } from '@/lib/api/social';
import { useSocialLang } from '@/contexts/SocialLanguageContext';

interface Props {
  platform: SocialPlatform;
  message: string;
  mediaUrls: string[];
  accountName?: string;
  accountAvatar?: string;
  mediaThumbs?: Record<string, string>;
}

function resolveSrc(url: string, mediaThumbs?: Record<string, string>): string {
  if (mediaThumbs?.[url]) return mediaThumbs[url];
  const driveId = url.includes('drive.google.com')
    ? (url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/))?.[1]
    : null;
  return driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w400` : url;
}

function MediaGrid({ urls, platform, mediaThumbs }: { urls: string[]; platform: SocialPlatform; mediaThumbs?: Record<string, string> }) {
  if (!urls.length) return (
    <div className="w-full aspect-square bg-slate-100 rounded-xl flex items-center justify-center">
      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );

  const isVertical = platform === 'YOUTUBE';
  const isVideo = (url: string) => /\.mp4(\?|$)/i.test(url) || url.includes('drive.google.com');

  if (urls.length === 1) {
    const url = urls[0];
    const src = resolveSrc(url, mediaThumbs);
    return isVideo(url) && !url.includes('drive.google.com') ? (
      <video src={url} controls className={`w-full rounded-xl object-cover bg-black ${isVertical ? 'aspect-[9/16]' : 'aspect-square'}`} muted />
    ) : (
      <img src={src} alt="" className={`w-full rounded-xl object-cover ${isVertical ? 'aspect-[9/16]' : 'aspect-square'}`} onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
    );
  }

  // Carousel for multiple
  return (
    <div className="grid gap-1 rounded-xl overflow-hidden grid-cols-2">
      {urls.slice(0, 4).map((url, i) => (
        <div key={i} className={`relative ${urls.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
          {isVideo(url) && !url.includes('drive.google.com') ? (
            <video src={url} className="w-full h-32 object-cover" muted />
          ) : (
            <img src={resolveSrc(url, mediaThumbs)} alt="" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
          )}
          {i === 3 && urls.length > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-black text-xl">+{urls.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function truncate(text: string, max: number) {
  return text.length <= max ? text : text.slice(0, max) + '...';
}

// ── Facebook Preview ──────────────────────────────────────────────────────────
function FacebookPreview({ message, mediaUrls, accountName, accountAvatar, mediaThumbs }: Props) {
  const { t } = useSocialLang();
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-w-[400px] mx-auto">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
          {accountAvatar ? <img src={accountAvatar} alt="" className="w-full h-full object-cover" /> : (accountName?.[0] || 'V')}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{accountName || 'Viện Chí Bảo'}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{t.platformPreview.justNow}</span>
            <span>·</span>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
          </div>
        </div>
        <div className="ml-auto text-slate-400">···</div>
      </div>

      {message && <p className="px-4 pb-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{truncate(message, 300)}</p>}

      {mediaUrls.length > 0 && (
        <div className="mx-0">
          <MediaGrid urls={mediaUrls} platform="FACEBOOK" mediaThumbs={mediaThumbs} />
        </div>
      )}

      <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
          <span>👍</span><span>0</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
          <span>{t.platformPreview.commentsCount(0)}</span>
          <span>{t.platformPreview.sharesCount(0)}</span>
        </div>
      </div>

      <div className="px-2 py-1 border-t border-slate-100 flex items-center justify-around">
        {[`👍 ${t.platformPreview.like}`, `💬 ${t.platformPreview.comment}`, `↗ ${t.platformPreview.share}`].map(a => (
          <button key={a} className="flex-1 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50 rounded-lg">{a}</button>
        ))}
      </div>
    </div>
  );
}

// ── Instagram Preview ─────────────────────────────────────────────────────────
function InstagramPreview({ message, mediaUrls, accountName, accountAvatar, mediaThumbs }: Props) {
  const { t } = useSocialLang();
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-w-[380px] mx-auto">
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5 flex-shrink-0">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
            {accountAvatar ? <img src={accountAvatar} alt="" className="w-full h-full object-cover rounded-full" /> : <span className="text-xs font-bold text-pink-600">{accountName?.[0] || 'V'}</span>}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-900">{accountName || 'vienchibao'}</p>
        </div>
        <div className="text-slate-400">···</div>
      </div>

      {mediaUrls.length > 0 ? (
        <MediaGrid urls={mediaUrls} platform="INSTAGRAM" mediaThumbs={mediaThumbs} />
      ) : (
        <div className="aspect-square bg-slate-100 flex items-center justify-center">
          <span className="text-4xl">📷</span>
        </div>
      )}

      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-xl">
            <span title={t.platformPreview.like}>🤍</span>
            <span title={t.platformPreview.comment}>💬</span>
            <span title={t.platformPreview.share}>📤</span>
          </div>
          <span className="text-xl" title={t.platformPreview.save}>🔖</span>
        </div>
        <p className="text-xs font-bold text-slate-800 mb-1">{t.platformPreview.likesCount(0)}</p>
        {message && (
          <p className="text-xs text-slate-700 leading-relaxed">
            <span className="font-bold mr-1">{accountName || 'vienchibao'}</span>
            {truncate(message, 150)}
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">{t.platformPreview.justNow}</p>
      </div>
    </div>
  );
}

// ── YouTube Preview ───────────────────────────────────────────────────────────
function YouTubePreview({ message, mediaUrls, accountName, accountAvatar }: Props) {
  const { t } = useSocialLang();
  const title = message ? truncate(message.split('\n')[0], 80) : t.platformPreview.videoTitlePlaceholder;
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm max-w-[380px] mx-auto">
      {mediaUrls.length > 0 ? (
        <div className="aspect-video bg-black">
          <video src={mediaUrls[0]} className="w-full h-full object-cover" muted />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
          <span className="text-6xl">▶️</span>
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-bold text-slate-900 leading-snug mb-1">{title}</p>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>{t.platformPreview.viewsCount(0)}</span>
          <span>·</span>
          <span>{t.platformPreview.justNow}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
            {accountAvatar ? <img src={accountAvatar} alt="" className="w-full h-full object-cover" /> : (accountName?.[0] || 'V')}
          </div>
          <p className="text-[11px] font-semibold text-slate-700">{accountName || 'Viện Chí Bảo'}</p>
        </div>
      </div>
    </div>
  );
}

// ── Threads Preview ───────────────────────────────────────────────────────────
function ThreadsPreview({ message, mediaUrls, accountName, mediaThumbs }: Props) {
  const { t } = useSocialLang();
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-w-[380px] mx-auto p-4">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {accountName?.[0] || 'V'}
          </div>
          {(message || mediaUrls.length > 0) && <div className="w-0.5 flex-1 bg-slate-200 min-h-[20px]" />}
        </div>
        <div className="flex-1 min-w-0 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-slate-900">{accountName?.toLowerCase().replace(/\s+/g, '_') || 'vienchibao'}</p>
            <span className="text-[10px] text-slate-400">• {t.platformPreview.justNow}</span>
          </div>
          {message && <p className="text-sm text-slate-700 leading-relaxed mb-2">{truncate(message, 200)}</p>}
          {mediaUrls.length > 0 && <MediaGrid urls={mediaUrls} platform="THREADS" mediaThumbs={mediaThumbs} />}
          <div className="flex items-center gap-4 mt-3 text-slate-400">
            {['🤍', '💬', '🔁', '📤'].map(i => <button key={i} className="text-xl hover:scale-110 transition-transform">{i}</button>)}
          </div>
        </div>
        <div className="text-slate-400 text-lg">···</div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PlatformPreview(props: Props) {
  switch (props.platform) {
    case 'FACEBOOK':  return <FacebookPreview  {...props} />;
    case 'INSTAGRAM': return <InstagramPreview {...props} />;
    case 'YOUTUBE':   return <YouTubePreview   {...props} />;
    case 'THREADS':   return <ThreadsPreview   {...props} />;
    default:          return <FacebookPreview  {...props} />;
  }
}
