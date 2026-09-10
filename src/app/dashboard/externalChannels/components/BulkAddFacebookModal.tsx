'use client';

import { useState, useMemo } from 'react';
import { X, Loader2, ListPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { FacebookLogo } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { scraperService } from '@/services/scraperService';
import { useAuthStore } from '@/store/auth-store';

interface BulkAddFacebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkAddFacebookModal({ isOpen, onClose, onSuccess }: BulkAddFacebookModalProps) {
  const { token } = useAuthStore();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    added_count: number;
    skipped_count: number;
    skipped_urls: { url: string; reason: string }[];
  } | null>(null);

  // Phân tách các dòng link
  const rawLines = useMemo(() => {
    return text
      .split(/[\r\n,]+/)
      .map(l => l.trim())
      .filter(Boolean);
  }, [text]);

  const validUrls = useMemo(() => {
    return rawLines.filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com');
    });
  }, [rawLines]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!token) {
      toast.error('Chưa đăng nhập');
      return;
    }
    if (validUrls.length === 0) {
      toast.error('Vui lòng nhập ít nhất một đường link Facebook hợp lệ');
      return;
    }

    setIsLoading(true);
    setResultSummary(null);

    try {
      const res = await scraperService.bulkAddFanpages(token, validUrls);
      setResultSummary({
        added_count: res.added_count,
        skipped_count: res.skipped_count,
        skipped_urls: res.skipped_urls || [],
      });

      if (res.added_count > 0) {
        toast.success(`Đã thêm thành công ${res.added_count} Fanpage mới!`);
        onSuccess();
      } else {
        toast('Không có trang nào mới được thêm (tất cả đã tồn tại hoặc trùng lặp).', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thêm hàng loạt');
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
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600">
              <FacebookLogo size={20} weight="fill" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Thêm hàng loạt Fanpage Facebook
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  Chưa cào video
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lưu sẵn danh sách Page đối thủ vào hệ thống. Bạn có thể bấm cào từng page bất kỳ lúc nào.
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">
                Danh sách đường link Fanpage (mỗi dòng 1 link):
              </label>
              <span className="text-xs text-slate-500">
                Nhận diện: <strong className="text-primary font-bold">{validUrls.length}</strong> / {rawLines.length} link
              </span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={isLoading}
              rows={8}
              placeholder={`https://www.facebook.com/thienmochuongvn
https://www.facebook.com/hapasglobal
https://www.facebook.com/kazan.jewelry
...`}
              className="w-full p-3.5 text-xs font-mono border border-border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-foreground placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed"
            />
          </div>

          {/* Results feedback banner */}
          {resultSummary && (
            <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 space-y-2 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 size={16} />
                  <span>Đã thêm: {resultSummary.added_count}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                  <AlertCircle size={16} />
                  <span>Bỏ qua: {resultSummary.skipped_count}</span>
                </div>
              </div>

              {resultSummary.skipped_urls.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 text-[11px] text-slate-500 border-t border-border/50 pt-2">
                  {resultSummary.skipped_urls.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="truncate max-w-xs">{item.url}</span>
                      <span className="text-amber-600 shrink-0">({item.reason})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <div className="space-y-1">
              <p className="font-semibold">Lưu ý về chi phí:</p>
              <p className="text-blue-600 dark:text-blue-400">
                Thao tác này chỉ ghi danh sách Fanpage vào cơ sở dữ liệu và <strong>hoàn toàn KHÔNG tiêu tốn credit Apify</strong>. Khi nào bạn muốn cào reels của Page nào, chỉ cần bấm nút "Cào Reels" trên thẻ của Page đó.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Đóng
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={isLoading || validUrls.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Đang lưu danh sách...
                </>
              ) : (
                <>
                  <ListPlus size={15} />
                  Lưu vào danh sách ({validUrls.length} Page)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
