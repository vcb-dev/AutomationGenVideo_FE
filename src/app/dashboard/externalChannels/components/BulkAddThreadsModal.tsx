'use client';

import { useState, useMemo } from 'react';
import {
  X,
  CircleNotch,
  CalendarCheck,
  VideoCamera,
  Timer,
  CheckCircle,
  WarningCircle,
  Plus,
} from '@phosphor-icons/react';
import { SiThreads } from 'react-icons/si';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';
import { parseMultipleUsernames } from '@/lib/scrape/threads-helpers';

interface BulkAddThreadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BulkAddThreadsModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkAddThreadsModalProps) {
  const { token } = useAuthStore();
  const [text, setText] = useState('');
  const [targetMode, setTargetMode] = useState<'days' | 'count'>('days');
  const [targetDays, setTargetDays] = useState('7');
  const [targetCount, setTargetCount] = useState('50');
  const [isLoading, setIsLoading] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    results: { username: string; status: string; error?: string }[];
  } | null>(null);

  const detectedUsernames = useMemo(() => {
    return parseMultipleUsernames(text);
  }, [text]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!token) {
      toast.error('Chưa đăng nhập');
      return;
    }
    if (detectedUsernames.length === 0) {
      toast.error('Vui lòng nhập ít nhất một username hoặc link Threads hợp lệ');
      return;
    }

    setIsLoading(true);
    setResultSummary(null);

    const count = targetMode === 'count' ? (parseInt(targetCount, 10) || 50) : 50;
    const days = targetMode === 'days' ? (parseInt(targetDays, 10) || 7) : undefined;

    try {
      const res = await scraperService.batchScrapeThreadsProfiles(
        token,
        detectedUsernames,
        count,
        {
          mode: targetMode,
          days,
        },
      );

      setResultSummary(res);

      if (res.succeeded > 0) {
        toast.success(`Đã cào và theo dõi thành công ${res.succeeded}/${res.total} kênh Threads!`);
        onSuccess?.();
      } else {
        toast.error('Không cào được kênh nào trong danh sách đã nhập.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Cào hàng loạt kênh thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setText('');
    setResultSummary(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-xl shadow-xs">
              <SiThreads />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Thêm Hàng Loạt Kênh Threads</h3>
              <p className="text-xs text-slate-500">
                Thêm nhiều tác giả hoặc link Threads vào danh sách <strong>Kênh chú ý</strong> và tiến hành cào nội dung.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-foreground rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Cấu hình cào: Chế độ cào & Số lượng/ngày */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-border rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-semibold text-foreground">
                Tiêu chí cào cho mỗi kênh:
              </span>

              {/* Mode switch */}
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setTargetMode('days')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      targetMode === 'days'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    <CalendarCheck size={14} weight={targetMode === 'days' ? 'bold' : 'regular'} />
                    <span>Theo ngày</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('count')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      targetMode === 'count'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    <VideoCamera size={14} weight={targetMode === 'count' ? 'bold' : 'regular'} />
                    <span>Số bài</span>
                  </button>
                </div>

                {/* Input for target value */}
                <div className="relative w-28 flex items-center">
                  {targetMode === 'days' ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={targetDays}
                        onChange={(e) => setTargetDays(e.target.value)}
                        placeholder="Số ngày"
                        className="w-full py-1.5 pl-3 pr-14 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                      <span className="absolute right-2 text-[11px] text-slate-400 pointer-events-none select-none">
                        ngày qua
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={targetCount}
                        onChange={(e) => setTargetCount(e.target.value)}
                        placeholder="Số bài"
                        className="w-full py-1.5 pl-3 pr-12 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                      <span className="absolute right-2 text-[11px] text-slate-400 pointer-events-none select-none">
                        bài viết
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Auto tracked info */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Timer size={15} weight="fill" />
              <span>Các kênh được thêm sẽ tự động đánh dấu là <strong>Kênh chú ý</strong> để đồng bộ định kỳ.</span>
            </div>
          </div>

          {/* Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">
                Danh sách username hoặc đường dẫn Threads (mỗi dòng 1 kênh, hoặc phân cách bằng dấu phẩy):
              </label>
              <span className="text-xs text-slate-500">
                Nhận diện: <strong className="text-primary font-bold">{detectedUsernames.length}</strong> kênh hợp lệ
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading}
              rows={6}
              placeholder={`@lilbieber
https://www.threads.net/@zuck
mixigaming
pnj_jewelry
...`}
              className="w-full p-3.5 text-xs font-mono border border-border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed"
            />
          </div>

          {/* Preview Tags */}
          {detectedUsernames.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                Các kênh sẽ được thêm ({detectedUsernames.length}):
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-100/50 dark:bg-slate-800/30 rounded-lg border border-border/50">
                {detectedUsernames.map((u) => (
                  <span
                    key={u}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-card border border-border text-foreground"
                  >
                    @{u}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Result summary banner */}
          {resultSummary && (
            <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 space-y-2 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle size={16} weight="fill" />
                  <span>Cào thành công: {resultSummary.succeeded}</span>
                </div>
                {resultSummary.failed > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                    <WarningCircle size={16} weight="fill" />
                    <span>Thất bại: {resultSummary.failed}</span>
                  </div>
                )}
              </div>

              {resultSummary.results.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 text-[11px] text-slate-500 border-t border-border/50 pt-2">
                  {resultSummary.results.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="font-mono font-medium truncate max-w-xs">@{item.username}</span>
                      <span
                        className={`shrink-0 font-medium ${
                          item.status === 'success' ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {item.status === 'success' ? 'Thành công' : item.error || 'Lỗi'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || detectedUsernames.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {isLoading ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                <span>Đang cào các kênh...</span>
              </>
            ) : (
              <>
                <Plus size={14} weight="bold" />
                <span>Cào & Thêm {detectedUsernames.length} Kênh chú ý</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
