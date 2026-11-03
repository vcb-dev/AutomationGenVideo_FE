'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadRequestPhoto } from '@/lib/equipment/api';
import { apiErrorMessage } from '@/lib/equipment/api-error';
import {
  INCIDENT_KIND_LABEL,
  REPORTABLE_INCIDENT_KINDS,
  ReportableIncidentKind,
  handedOverAssets,
} from '@/lib/equipment/extension-incident-helpers';
import { BorrowRequest, fetchRequest, reportIncident } from '@/lib/equipment/request-api';

const MAX_PHOTOS = 3;

const KIND_HINT: Record<ReportableIncidentKind, string> = {
  CONDITION_WORSENED: 'Rơi, vỡ, xước, chập chờn…',
  MISSING_ACCESSORY: 'Mất sạc, pin, nắp, dây…',
};

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-slate-800 dark:text-white';

interface IncidentReportModalProps {
  open: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  onSuccess: () => void;
}

export function IncidentReportModal({ open, onClose, request, onSuccess }: IncidentReportModalProps) {
  const [detail, setDetail] = useState<BorrowRequest | null>(null);
  const [assetId, setAssetId] = useState('');
  const [kind, setKind] = useState<ReportableIncidentKind>('CONDITION_WORSENED');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !request) return;
    setDetail(null);
    setAssetId('');
    setKind('CONDITION_WORSENED');
    setDescription('');
    setFiles([]);
    setError('');
    // Danh sách phiếu không kèm máy đã ghim nên phải đọc chi tiết phiếu
    fetchRequest(request.id)
      .then(setDetail)
      .catch((e: unknown) => setError(apiErrorMessage(e, 'Không đọc được danh sách máy của phiếu.')));
  }, [open, request]);

  if (!open || !request) return null;

  const assets = handedOverAssets(detail);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    // Chép ra mảng ngay: FileList bị xoá khi reset ô chọn file, trước lúc React chạy hàm cập nhật
    const picked = Array.from(list);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) {
      setError('Chọn máy gặp sự cố.');
      return;
    }
    if (!description.trim()) {
      setError('Mô tả sự cố trước khi gửi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const photoIds: string[] = [];
      for (const file of files) {
        const saved = await uploadRequestPhoto(file);
        photoIds.push(saved.id);
      }
      await reportIncident(request.id, {
        assetId,
        kind,
        description: description.trim(),
        photoIds: photoIds.length > 0 ? photoIds : undefined,
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
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/[0.1] dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.08]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Báo sự cố thiết bị đang mượn</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Phiếu mượn: <strong className="font-mono text-blue-600 dark:text-blue-400">{request.request_code}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white">
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
          <div>
            <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
              Máy gặp sự cố <span className="text-red-500">*</span>
            </span>
            {!detail && !error ? (
              <p className="text-xs italic text-slate-500">Đang tải danh sách máy…</p>
            ) : assets.length === 0 ? (
              <p className="text-xs italic text-slate-500">Phiếu chưa có máy nào được giao.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setAssetId(asset.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                      assetId === asset.id
                        ? 'border-red-500 bg-red-50 font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-white/[0.1] dark:text-slate-300'
                    }`}
                  >
                    {asset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Loại sự cố</span>
            <div className="grid grid-cols-2 gap-2">
              {REPORTABLE_INCIDENT_KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={`rounded-xl border p-2 text-center transition-all ${
                    kind === value
                      ? 'border-red-500 bg-red-50 font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/[0.1] dark:text-slate-300'
                  }`}
                >
                  <div className="text-xs">{INCIDENT_KIND_LABEL[value]}</div>
                  <div className="mt-0.5 text-[10px] opacity-75">{KIND_HINT[value]}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
              Mô tả <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Chuyện gì xảy ra, lúc nào, tình trạng máy hiện giờ…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
              Ảnh hiện trường (tối đa {MAX_PHOTOS})
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {files.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.15] dark:text-slate-300"
              >
                + Chọn hoặc chụp ảnh
              </button>
            )}
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-xs dark:bg-white/[0.04]"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="ml-2 text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.08]">
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
              disabled={loading || assets.length === 0}
              className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Đang gửi…' : 'Gửi báo cáo sự cố'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
