'use client';

import { SocialPlatform, PLATFORM_META } from '@/lib/api/social';

interface Props {
  platform: SocialPlatform;
  message: string;
  mediaUrls: string[];
  accountName?: string;
  accountAvatar?: string;
}

function MediaGrid({ urls, platform }: { urls: string[]; platform: SocialPlatform }) {
  if (!urls.length) return (
    <div className="w-full aspect-square bg-slate-100 rounded-xl flex items-center justify-center">
      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );

  const isVertical = platform === 'TIKTOK' || platform === 'YOUTUBE';
  const isVideo = (url: string) => /\.mp4(\?|$)/i.test(url);

  if (urls.length === 1) {
    const url = urls[0];
    return isVideo(url) ? (
      <video src={url} controls className={`w-full rounded-xl object-cover bg-black ${isVertical ? 'aspect-[9/16]' : 'aspect-square'}`} muted />
    ) : (
      <img src={url} alt="" className={`w-full rounded-xl object-cover ${isVertical ? 'aspect-[9/16]' : 'aspect-square'}`} />
    );
  }

  // Carousel for multiple
  return (
    <div className="grid gap-1 rounded-xl overflow-hidden grid-cols-2">
      {urls.slice(0, 4).map((url, i) => (
        <div key={i} className={`relative ${urls.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
          {isVideo(url) ? (
            <video src={url} className="w-full h-32 object-cover" muted />
          ) : (
            <img src={url} alt="" className="w-full h-32 object-cover" />
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
function FacebookPreview({ message, mediaUrls, accountName, accountAvatar }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-w-[400px] mx-auto">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
          {accountAvatar ? <img src={accountAvatar} alt="" className="w-full h-full object-cover" /> : (accountName?.[0] || 'V')}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{accountName || 'Viện Chí Bảo'}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Vừa xong</span>
            <span>·</span>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
          </div>
        </div>
        <div className="ml-auto text-slate-400">···</div>
      </div>

      {message && <p className="px-4 pb-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{truncate(message, 300)}</p>}

      {mediaUrls.length > 0 && (
        <div className="mx-0">
          <MediaGrid urls={mediaUrls} platform="FACEBOOK" />
        </div>
      )}

      <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
          <span>👍</span><span>0</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
          <span>0 bình luận</span>
          <span>0 lượt chia sẻ</span>
        </div>
      </div>

      <div className="px-2 py-1 border-t border-slate-100 flex items-center justify-around">
        {['👍 Thích', '💬 Bình luận', '↗ Chia sẻ'].map(a => (
          <button key={a} className="flex-1 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50 rounded-lg">{a}</button>
        ))}
      </div>
    </div>
  );
}

// ── Instagram Preview ─────────────────────────────────────────────────────────
function InstagramPreview({ message, mediaUrls, accountName, accountAvatar }: Props) {
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
        <MediaGrid urls={mediaUrls} platform="INSTAGRAM" />
      ) : (
        <div className="aspect-square bg-slate-100 flex items-center justify-center">
          <span className="text-4xl">📷</span>
        </div>
      )}

      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-xl">
            <span title="Thích">🤍</span>
            <span title="Bình luận">💬</span>
            <span title="Chia sẻ">📤</span>
          </div>
          <span className="text-xl" title="Lưu">🔖</span>
        </div>
        <p className="text-xs font-bold text-slate-800 mb-1">0 lượt thích</p>
        {message && (
          <p className="text-xs text-slate-700 leading-relaxed">
            <span className="font-bold mr-1">{accountName || 'vienchibao'}</span>
            {truncate(message, 150)}
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">Vừa xong</p>
      </div>
    </div>
  );
}

// ── TikTok Preview ────────────────────────────────────────────────────────────
function TikTokPreview({ message, mediaUrls, accountName }: Props) {
  return (
    <div className="bg-black rounded-2xl overflow-hidden shadow-sm max-w-[240px] mx-auto aspect-[9/16] relative flex items-end">
      {mediaUrls.length > 0 ? (
        <video src={mediaUrls[0]} className="absolute inset-0 w-full h-full object-cover" muted loop />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
          <span className="text-5xl">🎵</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Right sidebar */}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 text-white">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-sm font-bold border-2 border-white">
          {accountName?.[0] || 'V'}
        </div>
        {[['❤️', '0'], ['💬', '0'], ['↗', '0']].map(([icon, count]) => (
          <div key={icon} className="flex flex-col items-center">
            <span className="text-xl">{icon}</span>
            <span className="text-[9px] font-bold">{count}</span>
          </div>
        ))}
      </div>

      {/* Bottom info */}
      <div className="relative z-10 p-3 pb-4 w-full">
        <p className="text-white text-xs font-bold mb-1">@{accountName?.toLowerCase().replace(/\s+/g, '') || 'vienchibao'}</p>
        {message && <p className="text-white text-[11px] leading-relaxed line-clamp-2">{truncate(message, 100)}</p>}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-4 h-4 rounded-full bg-slate-600 animate-spin" style={{ animationDuration: '3s' }} />
          <p className="text-white/80 text-[10px]">Nhạc nền · {accountName || 'Viện Chí Bảo'}</p>
        </div>
      </div>
    </div>
  );
}

// ── YouTube Preview ───────────────────────────────────────────────────────────
function YouTubePreview({ message, mediaUrls, accountName, accountAvatar }: Props) {
  const title = message ? truncate(message.split('\n')[0], 80) : 'Tiêu đề video';
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
          <span>0 lượt xem</span>
          <span>·</span>
          <span>Vừa xong</span>
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
function ThreadsPreview({ message, mediaUrls, accountName }: Props) {
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
            <span className="text-[10px] text-slate-400">• Vừa xong</span>
          </div>
          {message && <p className="text-sm text-slate-700 leading-relaxed mb-2">{truncate(message, 200)}</p>}
          {mediaUrls.length > 0 && <MediaGrid urls={mediaUrls} platform="THREADS" />}
          <div className="flex items-center gap-4 mt-3 text-slate-400">
            {['🤍', '💬', '🔁', '📤'].map(i => <button key={i} className="text-xl hover:scale-110 transition-transform">{i}</button>)}
          </div>
        </div>
        <div className="text-slate-400 text-lg">···</div>
      </div>
    </div>
  );
}

// ── Zalo Preview ──────────────────────────────────────────────────────────────
function ZaloPreview({ message, mediaUrls, accountName }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-w-[380px] mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {accountName?.[0] || 'V'}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{accountName || 'Viện Chí Bảo OA'}</p>
          <p className="text-[10px] text-sky-500 font-semibold">Official Account</p>
        </div>
      </div>
      {mediaUrls.length > 0 && <MediaGrid urls={mediaUrls} platform="ZALO" />}
      {message && <p className="px-4 py-3 text-sm text-slate-800 leading-relaxed">{truncate(message, 300)}</p>}
      <div className="px-4 py-2 border-t border-slate-100 flex gap-3">
        <button className="text-xs font-semibold text-sky-600 hover:underline">Thích</button>
        <button className="text-xs font-semibold text-slate-500 hover:underline">Bình luận</button>
        <button className="text-xs font-semibold text-slate-500 hover:underline">Chia sẻ</button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PlatformPreview(props: Props) {
  switch (props.platform) {
    case 'FACEBOOK':  return <FacebookPreview  {...props} />;
    case 'INSTAGRAM': return <InstagramPreview {...props} />;
    case 'TIKTOK':    return <TikTokPreview    {...props} />;
    case 'YOUTUBE':   return <YouTubePreview   {...props} />;
    case 'THREADS':   return <ThreadsPreview   {...props} />;
    case 'ZALO':      return <ZaloPreview      {...props} />;
    default:          return <FacebookPreview  {...props} />;
  }
}
