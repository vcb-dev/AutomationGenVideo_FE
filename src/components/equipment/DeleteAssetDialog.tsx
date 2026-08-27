'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Asset, deleteAsset } from '@/lib/equipment/api';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

interface DeleteAssetDialogProps {
  asset: Asset;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAssetDialog({ asset, onClose, onDeleted }: DeleteAssetDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      await deleteAsset(asset.asset_code);
      toast.success(`Đã xóa thiết bị ${asset.asset_code} khỏi kho thành công!`);
      onDeleted();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Không thể xóa thiết bị này khỏi kho.';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const isOnLoan = asset.status === 'ON_LOAN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/[0.08] bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-red-900 dark:text-red-300">
                Xóa thiết bị khỏi kho
              </h2>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                Hành động này sẽ ngừng lưu hành thiết bị
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Bạn có chắc chắn muốn xóa thiết bị sau khỏi danh sách quản lý kho?
          </p>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 dark:bg-white/[0.03] dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Mã thiết bị:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {asset.asset_code}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Tên thiết bị:</span>
              <span className="font-semibold text-slate-800 dark:text-white">
                {asset.model?.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Số Serial:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {asset.serial_number}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Danh mục:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {asset.model?.category?.name}
              </span>
            </div>
          </div>

          {isOnLoan && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
              ⚠️ Thiết bị đang trong trạng thái <strong>ĐANG MƯỢN</strong>. Bạn cần thu hồi thiết bị về kho trước khi thực hiện xóa.
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06] transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || isOnLoan}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Xác nhận xóa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
