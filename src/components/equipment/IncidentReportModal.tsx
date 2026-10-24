'use client';

import { useState } from 'react';
import { BorrowRequest, reportIncident } from '@/lib/equipment/request-api';
import { apiErrorMessage } from '@/lib/equipment/api-error';

interface IncidentReportModalProps {
  open: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  onSuccess: () => void;
}

export function IncidentReportModal({
  open,
  onClose,
  request,
  onSuccess,
}: IncidentReportModalProps) {
  const [assetId, setAssetId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open || !request) return null;

  // Thu thập danh sách thiết bị có trong phiếu
  const assignedAssets: Array<{ id: string; label: string }> = [];
  request.lines?.forEach((line) => {
    if (line.reservations && line.reservations.length > 0) {
      line.reservations.forEach((res) => {
        if (res.asset) {
          assignedAssets.push({
            id: res.asset.id,
            label: `${line.model.name} — [Mã: ${res.asset.asset_code}${res.asset.serial_number ? ` / SN: ${res.asset.serial_number}` : ''}]`,
          });
        }
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề sự cố.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await reportIncident(request.id, {
        asset_id: assetId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        photos: photoUrl.trim() ? [photoUrl.trim()] : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Không gửi được báo cáo sự cố.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Báo cáo sự cố thiết bị tại hiện trường
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
          {/* THIẾT BỊ GẶP SỰ CỐ */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Thiết bị gặp sự cố
            </label>
            {assignedAssets.length > 0 ? (
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Sự cố chung / Toàn bộ máy trong phiếu --</option>
                {assignedAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Phiếu chưa gán cụ thể thiết bị hoặc ghi nhận sự cố chung cho cả đợt mượn.
              </p>
            )}
          </div>

          {/* MỨC ĐỘ NGHIÊM TRỌNG */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mức độ nghiêm trọng
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'LOW', label: 'Thấp', desc: 'Trầy nhẹ, bụi bẩn' },
                { value: 'MEDIUM', label: 'Vừa', desc: 'Lỗi nút, chập chờn' },
                { value: 'HIGH', label: 'Nặng', desc: 'Rơi vỡ, nứt thấu kính' },
                { value: 'CRITICAL', label: 'Khẩn cấp', desc: 'Cháy nổ, mất máy' },
              ].map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setSeverity(lvl.value as never)}
                  className={`rounded-xl border p-2 text-center transition-all ${
                    severity === lvl.value
                      ? 'border-red-500 bg-red-50 text-red-700 font-bold dark:bg-red-500/20 dark:text-red-300'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 dark:border-white/[0.1] dark:text-slate-300'
                  }`}
                >
                  <div className="text-xs">{lvl.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5 hidden sm:block">{lvl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* TIÊU ĐỀ SỰ CỐ */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tiêu đề sự cố <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Rơi máy xước vỏ ngoài, Pin máy quay bị phồng…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* MÔ TẢ CHI TIẾT */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mô tả chi tiết & Hoàn cảnh xảy ra
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả cụ thể thời điểm xảy ra sự cố, nguyên nhân và tình trạng hiện tại của máy…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* LINK ẢNH HIỆN TRƯỜNG */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ảnh chụp hiện trường / bằng chứng (URL)
            </label>
            <input
              type="url"
              placeholder="https://example.com/anh-su-co.jpg"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Dán liên kết ảnh bằng chứng hư hại tại hiện trường để thủ kho tiện đối chiếu khi hoàn trả.
            </p>
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
              className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? 'Đang gửi…' : 'Gửi báo cáo sự cố'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
