'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AssetPhoto,
  deleteAssetPhoto,
  photoSrc,
  setPrimaryPhoto,
  uploadAssetPhoto,
} from '@/lib/equipment/api';

interface AssetPhotoGalleryProps {
  assetCode: string;
  photos: AssetPhoto[];
  /** Chỉ người của kho mới thấy nút tải lên và xoá. */
  canEdit: boolean;
  onChanged: (photos: AssetPhoto[]) => void;
}

/**
 * Ảnh thiết bị ở màn chi tiết.
 *
 * Ảnh đại diện luôn đứng đầu và có nhãn, vì đó là tấm hiện ở bảng kho — người sửa cần thấy ngay
 * mình đang đổi cái gì. Xoá hỏi lại một lần: ảnh đã xoá thì không lấy lại được.
 */
export function AssetPhotoGallery({
  assetCode,
  photos,
  canEdit,
  onChanged,
}: AssetPhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoomed, setZoomed] = useState<AssetPhoto | null>(null);

  const run = async (task: () => Promise<AssetPhoto[]>) => {
    setBusy(true);
    setError('');
    try {
      onChanged(await task());
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không thao tác được với ảnh.',
      );
    } finally {
      setBusy(false);
    }
  };

  const onPick = async (files: FileList | null) => {
    if (!files?.length) return;
    await run(async () => {
      const added: AssetPhoto[] = [];
      for (const file of Array.from(files)) {
        added.push(await uploadAssetPhoto(assetCode, file));
      }
      return [...photos, ...added];
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const makePrimary = (photo: AssetPhoto) =>
    run(async () => {
      await setPrimaryPhoto(photo.id);
      return photos.map((p) => ({ ...p, is_primary: p.id === photo.id }));
    });

  const remove = (photo: AssetPhoto) => {
    if (!confirm(`Xoá ảnh này của ${assetCode}? Không lấy lại được.`)) return;
    return run(async () => {
      await deleteAssetPhoto(photo.id);
      const left = photos.filter((p) => p.id !== photo.id);
      // BE cho ảnh còn lại đầu tiên lên thay khi xoá ảnh đại diện — phản chiếu lại ở đây để
      // giao diện không hiện một khoảng trống trong lúc chờ tải lại.
      if (photo.is_primary && left.length > 0) left[0] = { ...left[0], is_primary: true };
      return left;
    });
  };

  const sorted = [...photos].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Ảnh thiết bị</h2>
        <span className="text-xs text-slate-400">
          {photos.length === 0 ? 'chưa có ảnh nào' : `${photos.length} ảnh`}
        </span>
        <span className="flex-1" />
        {canEdit && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />
            <button
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.12] dark:text-slate-200 dark:hover:bg-white/[0.05]"
            >
              {busy ? 'Đang tải…' : '+ Thêm ảnh'}
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-white/[0.12]">
          Máy này chưa có ảnh.
          {canEdit && ' Ảnh giúp đối chiếu khi bàn giao và khi nhận lại.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((photo) => (
            <figure
              key={photo.id}
              className={cn(
                'group relative overflow-hidden rounded-lg border bg-slate-50 dark:bg-white/[0.03]',
                photo.is_primary
                  ? 'border-blue-400 ring-1 ring-blue-400/40'
                  : 'border-slate-200 dark:border-white/[0.08]',
              )}
            >
              <button
                onClick={() => setZoomed(photo)}
                className="block aspect-[4/3] w-full"
                title="Xem lớn"
              >
                {/* Ảnh do người dùng tải lên, kích thước không biết trước — dùng thẻ img thường
                    thay vì next/image để khỏi phải khai báo trước từng tên miền lưu trữ. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc(photo.url)}
                  alt={photo.caption ?? `Ảnh của ${assetCode}`}
                  className="h-full w-full object-cover"
                />
              </button>

              {photo.is_primary && (
                <span className="absolute left-2 top-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Ảnh đại diện
                </span>
              )}

              {canEdit && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!photo.is_primary && (
                    <button
                      disabled={busy}
                      onClick={() => makePrimary(photo)}
                      title="Đặt làm ảnh đại diện"
                      className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white"
                    >
                      Đại diện
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => remove(photo)}
                    title="Xoá ảnh"
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-white"
                  >
                    Xoá
                  </button>
                </div>
              )}

              {photo.caption && (
                <figcaption className="truncate px-2 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {photo.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6"
          onClick={() => setZoomed(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc(zoomed.url)}
            alt={zoomed.caption ?? assetCode}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
