'use client';

import { useState } from 'react';
import { Asset, deleteAsset } from '@/lib/equipment/api';
import { deleteBlockReason } from '@/lib/equipment/asset-edit';

interface DeleteAssetDialogProps {
  asset: Asset;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Xác nhận trước khi ngừng dùng một máy.
 *
 * Nói rõ đây là xoá MỀM: người dùng nghe "xoá" thường tưởng mất sạch lịch sử và hoặc là không
 * dám bấm, hoặc bấm xong đi tìm cách khôi phục. Máy vẫn còn hồ sơ, chỉ ra khỏi danh sách dùng được.
 *
 * Trạng thái không cho xoá thì hiện lý do thay vì nút — bấm rồi mới ăn 409 là bắt người dùng
 * đoán xem mình làm sai gì.
 */
export function DeleteAssetDialog({ asset, onClose, onDeleted }: DeleteAssetDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const blocked = deleteBlockReason(asset);

  const confirm = async () => {
    setDeleting(true);
    setError('');
    try {
      await deleteAsset(asset.asset_code);
      onDeleted();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Không xoá được. Kiểm tra kết nối rồi thử lại.';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {blocked ? 'Chưa xoá được thiết bị' : 'Xoá thiết bị khỏi kho?'}
        </h2>

        <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {asset.asset_code}
            </span>{' '}
            — {asset.model.name}
          </p>

          {blocked ? (
            <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
              {blocked}
            </p>
          ) : (
            <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 dark:bg-white/[0.04]">
              Máy sẽ chuyển sang <strong>Đã thanh lý</strong> và biến khỏi danh sách dùng được.
              Toàn bộ lịch sử mượn trả, biên bản và sự cố vẫn giữ nguyên — đây là xoá mềm.
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <footer className="mt-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.12] dark:text-slate-200 dark:hover:bg-white/[0.05]"
          >
            {blocked ? 'Đóng' : 'Huỷ'}
          </button>
          {!blocked && (
            <button
              onClick={confirm}
              disabled={deleting}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Đang xoá…' : 'Xoá thiết bị'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
