'use client';

import { useState } from 'react';
import { BorrowRequest, requestExtension } from '@/lib/equipment/request-api';
import { apiErrorMessage } from '@/lib/equipment/api-error';

interface ExtensionRequestModalProps {
  open: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  onSuccess: () => void;
}

export function ExtensionRequestModal({
  open,
  onClose,
  request,
  onSuccess,
}: ExtensionRequestModalProps) {
  // Mặc định đề xuất gia hạn thêm 4 tiếng so với to_time hiện tại
  const initialNewTime = request
    ? new Date(new Date(request.to_time).getTime() + 4 * 3600 * 1000)
        .toISOString()
        .slice(0, 16)
    : '';

  const [toTime, setToTime] = useState(initialNewTime);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open || !request) return null;

  const currentToStr = new Date(request.to_time).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toTime) {
      setError('Vui lòng chọn thời gian trả mới.');
      return;
    }
    const newDate = new Date(toTime);
    if (newDate <= new Date(request.to_time)) {
      setError('Thời gian trả mới phải sau thời gian trả hiện tại.');
      return;
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do xin gia hạn.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await requestExtension(request.id, {
        to_time: newDate.toISOString(),
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Không gửi được yêu cầu gia hạn.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Xin gia hạn thời gian mượn
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phiếu mượn: <strong className="font-mono text-blue-600 dark:text-blue-400">{request.request_code}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
          {/* THỜI GIAN HIỆN TẠI */}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 dark:bg-white/[0.04] dark:border-white/[0.08]">
            <span className="block text-xs text-slate-500 dark:text-slate-400">Hạn trả hiện tại:</span>
            <strong className="text-sm font-mono text-slate-900 dark:text-white">
              {currentToStr}
            </strong>
          </div>

          {/* HẠN TRẢ MỚI MONG MUỐN */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Thời gian trả mới mong muốn <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-white font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Hệ thống sẽ tự động kiểm tra xem thiết bị có bị trùng lịch với đoàn khác sau khung giờ này hay không.
            </p>
          </div>

          {/* LÝ DO GIA HẠN */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lý do xin gia hạn <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="VD: Đoàn quay phát sinh thêm cảnh đêm tại địa điểm, cần giữ máy đến 22:00…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/[0.12] dark:text-slate-300"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? 'Đang gửi…' : 'Gửi yêu cầu gia hạn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
