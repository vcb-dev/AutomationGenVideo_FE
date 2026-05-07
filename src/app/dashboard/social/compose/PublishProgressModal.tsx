'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { SocialPlatform, PLATFORM_META } from '@/lib/api/social';

interface Channel {
  id: string;
  name: string;
  platform: string;
  status: 'pending' | 'posting' | 'success' | 'fail';
  error?: string;
  queuePosition?: number | null;
}

interface PublishProgress {
  show: boolean;
  phase: 'idle' | 'uploading' | 'publishing' | 'done';
  uploadPct: number;
  channels: Channel[];
}

interface Props {
  publishProgress: PublishProgress;
  postingPcts: Record<string, number>;
  elapsedSeconds: number;
  onClose: () => void;
}

const PLATFORM_AVG: Record<string, number> = {
  FACEBOOK: 25, INSTAGRAM: 65, TIKTOK: 50, YOUTUBE: 100, THREADS: 20, ZALO: 30,
};
const PLATFORM_SLOTS: Record<string, number> = {
  FACEBOOK: 6, INSTAGRAM: 3, TIKTOK: 2, YOUTUBE: 2, THREADS: 4, ZALO: 5,
};

function fmtTime(s: number) {
  if (s <= 0) return '< 1s';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return sec === 0 ? `${m}p` : `${m}p ${sec}s`;
}

export default function PublishProgressModal({ publishProgress, postingPcts, elapsedSeconds, onClose }: Props) {
  const { channels, phase } = publishProgress;
  const doneCount  = channels.filter(c => c.status === 'success' || c.status === 'fail').length;
  const totalCount = channels.length;
  const overallPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  let etaSec: number | null = null;
  if (phase !== 'done') {
    const remainingCount = totalCount - doneCount;
    if (doneCount > 0 && elapsedSeconds > 0) {
      const avgPerJob   = elapsedSeconds / doneCount;
      const concurrency = Math.max(1, Math.min(15, remainingCount));
      etaSec = Math.round((avgPerJob * remainingCount) / concurrency);
    } else if (totalCount > 0) {
      const byPlatform: Record<string, number> = {};
      channels.forEach(ch => { byPlatform[ch.platform] = (byPlatform[ch.platform] || 0) + 1; });
      etaSec = Math.max(
        ...Object.entries(byPlatform).map(([p, n]) =>
          Math.ceil(n / (PLATFORM_SLOTS[p] || 3)) * (PLATFORM_AVG[p] || 30),
        ),
      );
    }
  }

  return (
    <AnimatePresence>
      {publishProgress.show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-[500px] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {phase === 'done' ? 'Kết quả hoàn tất' : 'Đang xử lý đăng bài'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {phase === 'done'
                      ? `${channels.filter(c => c.status === 'success').length} thành công, ${channels.filter(c => c.status === 'fail').length} lỗi`
                      : 'Vui lòng không đóng trình duyệt lúc này'}
                  </p>
                </div>
                {phase === 'done' && (
                  <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Overall progress bar */}
              {phase !== 'done' && totalCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px] font-bold text-slate-500">
                    <span>{doneCount}/{totalCount} kênh</span>
                    <div className="flex items-center gap-3">
                      {elapsedSeconds > 0 && (
                        <span className="text-slate-400">⏱ {fmtTime(elapsedSeconds)}</span>
                      )}
                      {etaSec !== null && (
                        <span className="text-slate-400">ETA ~{fmtTime(etaSec)}</span>
                      )}
                      <motion.span key={overallPct} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-blue-600">
                        {overallPct}%
                      </motion.span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                      initial={{ width: '0%' }}
                      animate={{ width: `${overallPct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {/* Per-channel list */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {channels.map(ch => {
                  const meta = PLATFORM_META[ch.platform as SocialPlatform] || PLATFORM_META.FACEBOOK;
                  const pct = Math.round(postingPcts[ch.id] ?? 0);
                  const isActive = ch.status === 'posting' || ch.status === 'success' || ch.status === 'fail';
                  return (
                    <div
                      key={ch.id}
                      className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all ${
                        ch.status === 'success' ? 'bg-green-50 border-green-100'
                        : ch.status === 'fail'  ? 'bg-red-50 border-red-100'
                        : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${meta.color} shadow-sm flex-shrink-0`}>
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{ch.name}</p>
                          <p className={`text-[10px] font-black uppercase tracking-wider ${
                            ch.status === 'success' ? 'text-green-600'
                            : ch.status === 'fail'  ? 'text-red-600'
                            : ch.status === 'posting' ? 'text-blue-600'
                            : 'text-slate-400'
                          }`}>
                            {ch.status === 'posting'  ? `Đang xử lý... ${pct}%`
                              : ch.status === 'success' ? 'Thành công'
                              : ch.status === 'fail'    ? 'Thất bại'
                              : ch.queuePosition        ? `Hàng chờ #${ch.queuePosition}`
                              : 'Đang chờ xử lý'}
                          </p>
                          {ch.error && <p className="text-[9px] text-red-400 mt-0.5 italic">{ch.error}</p>}
                        </div>
                        <div className="flex-shrink-0">
                          {ch.status === 'posting' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                          {ch.status === 'success' && <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</div>}
                          {ch.status === 'fail'    && <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">!</div>}
                        </div>
                      </div>
                      {isActive && (
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${ch.status === 'success' ? 'bg-green-500' : ch.status === 'fail' ? 'bg-red-400' : 'bg-blue-500'}`}
                            initial={{ width: '0%' }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: ch.status === 'posting' ? 0.3 : 0.4, ease: 'easeOut' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {phase === 'done' && (
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all"
                >
                  Xác nhận
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
