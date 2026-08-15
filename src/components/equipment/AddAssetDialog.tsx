'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  EquipmentCategory,
  EquipmentModel,
  StorageLocation,
  createAsset,
  createModel,
  uploadAssetPhoto,
  fetchCategories,
  fetchLocations,
  fetchModels,
} from '@/lib/equipment/api';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';
const labelClass = 'text-sm font-semibold text-slate-900 dark:text-white';
const hintClass = 'mt-0.5 block text-xs text-slate-400';

/** Giá trị đặc biệt của dropdown model, mở khối khai model mới ngay trong form. */
const NEW_MODEL = '__new__';

interface AddAssetDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Nhập kho một máy (NV-01).
 *
 * Mã thiết bị KHÔNG có ô nhập: BE tự sinh theo mã danh mục để không ai đặt trùng hay đặt lệch
 * quy ước. Máy mới luôn vào trạng thái Chờ kiểm tra (BR-05), không cho mượn ngay được — form
 * nói rõ điều đó để thủ kho không đợi máy xuất hiện ở danh sách sẵn sàng.
 */
export function AddAssetDialog({ onClose, onCreated }: AddAssetDialogProps) {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);

  const [modelId, setModelId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [locationId, setLocationId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // Khối khai model mới, chỉ hiện khi chọn "Khai model mới".
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newAccessories, setNewAccessories] = useState('');

  // Ảnh chọn trước, tải lên sau khi máy đã có mã — endpoint ảnh cần mã máy để gắn vào.
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  // Ảnh xem trước giữ trong bộ nhớ trình duyệt; không thu hồi thì mỗi lần mở hộp thoại lại rò một ít.
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  useEffect(() => {
    Promise.all([fetchModels(), fetchCategories(), fetchLocations()])
      .then(([m, c, l]) => {
        setModels(m);
        setCategories(c);
        setLocations(l);
      })
      .catch(() => setError('Không đọc được danh mục thiết bị.'));
  }, []);

  const creatingModel = modelId === NEW_MODEL;
  const canSubmit =
    serialNumber.trim() !== '' &&
    !saving &&
    (creatingModel ? newCategoryId !== '' && newModelName.trim() !== '' : modelId !== '');

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    setPhotos((prev) => [...prev, ...picked]);
    setPreviews((prev) => [...prev, ...picked.map((f) => URL.createObjectURL(f))]);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const dropPhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      let targetModelId = modelId;
      if (creatingModel) {
        setStage('Đang khai model…');
        const model = await createModel({
          categoryId: newCategoryId,
          name: newModelName.trim(),
          manufacturer: newManufacturer.trim() || undefined,
          referencePrice: newPrice ? Number(newPrice) : undefined,
          accessories: newAccessories
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        });
        targetModelId = model.id;
      }

      setStage('Đang nhập kho…');
      const asset = await createAsset({
        modelId: targetModelId,
        serialNumber: serialNumber.trim(),
        locationId: locationId || undefined,
        purchaseDate: purchaseDate || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      });

      // Máy đã vào kho rồi. Ảnh lỗi từ đây trở đi KHÔNG được huỷ máy — báo rõ tấm nào hỏng để
      // người dùng bổ sung sau ở màn chi tiết, còn hơn bắt họ nhập lại từ đầu.
      const failed: string[] = [];
      for (const [i, file] of photos.entries()) {
        setStage(`Đang tải ảnh ${i + 1}/${photos.length}…`);
        try {
          await uploadAssetPhoto(asset.asset_code, file);
        } catch {
          failed.push(file.name);
        }
      }

      onCreated();
      if (failed.length > 0) {
        setError(
          `Đã nhập kho ${asset.asset_code}, nhưng ${failed.length} ảnh không tải lên được: ` +
            `${failed.join(', ')}. Thêm lại ở màn chi tiết máy.`,
        );
        setSaving(false);
        setStage('');
        return;
      }
      onClose();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không nhập kho được thiết bị.',
      );
    } finally {
      setSaving(false);
      setStage('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/[0.1] dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/[0.06]">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Thêm thiết bị vào kho
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Mã thiết bị do hệ thống sinh theo danh mục, không nhập tay.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 dark:border-white/[0.1]"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <label className="block">
            <span className={labelClass}>
              Model <em className="not-italic text-red-600">*</em>
            </span>
            <select
              className={cn(inputClass, 'mt-2')}
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
            >
              <option value="">— Chọn model —</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.category.name} ({m._count.assets} máy)
                </option>
              ))}
              <option value={NEW_MODEL}>+ Khai model mới…</option>
            </select>
          </label>

          {creatingModel && (
            <div className="flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/[0.06]">
              <label className="block">
                <span className={labelClass}>
                  Danh mục <em className="not-italic text-red-600">*</em>
                </span>
                <span className={hintClass}>
                  Quyết định tiền tố mã máy và buffer kiểm tra sau khi trả.
                </span>
                <select
                  className={cn(inputClass, 'mt-2')}
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) · buffer {c.buffer_minutes} phút
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>
                  Tên model <em className="not-italic text-red-600">*</em>
                </span>
                <input
                  className={cn(inputClass, 'mt-2')}
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Ví dụ: Sony A7 IV"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Hãng</span>
                  <input
                    className={cn(inputClass, 'mt-2')}
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value)}
                    placeholder="Sony"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Giá tham chiếu</span>
                  <input
                    type="number"
                    min={0}
                    className={cn(inputClass, 'mt-2')}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="48000000"
                  />
                </label>
              </div>

              <label className="block">
                <span className={labelClass}>Phụ kiện đi kèm</span>
                <span className={hintClass}>
                  Ngăn cách bằng dấu phẩy. Đây là bảng đối chiếu lúc bàn giao và lúc nhận lại —
                  bỏ trống thì sau này không ai biết đáng lẽ phải trả về những gì.
                </span>
                <input
                  className={cn(inputClass, 'mt-2')}
                  value={newAccessories}
                  onChange={(e) => setNewAccessories(e.target.value)}
                  placeholder="Pin, Sạc, Dây đeo, Thẻ nhớ"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className={labelClass}>
              Số serial <em className="not-italic text-red-600">*</em>
            </span>
            <span className={hintClass}>Duy nhất toàn hệ thống, không sửa được sau khi tạo.</span>
            <input
              className={cn(inputClass, 'mt-2 font-mono')}
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="3821992-F"
            />
          </label>

          <label className="block">
            <span className={labelClass}>Vị trí trong kho</span>
            <select
              className={cn(inputClass, 'mt-2')}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">— Chưa xếp chỗ —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Ngày mua</span>
              <input
                type="date"
                className={cn(inputClass, 'mt-2')}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Nguyên giá</span>
              <input
                type="number"
                min={0}
                className={cn(inputClass, 'mt-2')}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="48000000"
              />
            </label>
          </div>

          <div>
            <span className={labelClass}>Ảnh thiết bị</span>
            <span className={hintClass}>
              Chọn được nhiều tấm. Tấm đầu tiên thành ảnh đại diện hiện ở bảng kho, đổi lại được
              sau ở màn chi tiết.
            </span>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addPhotos(e.target.files)}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => photoInputRef.current?.click()}
              className="mt-2 w-full rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-white/[0.15] dark:text-slate-400"
            >
              {photos.length === 0 ? 'Bấm để chọn ảnh' : '+ Chọn thêm ảnh'}
            </button>

            {photos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {previews.map((src, i) => (
                  <div
                    key={src}
                    className="group relative aspect-square overflow-hidden rounded-md border border-slate-200 dark:border-white/[0.08]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={photos[i].name} className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute inset-x-0 bottom-0 bg-blue-600/90 py-0.5 text-center text-[9px] font-bold text-white">
                        đại diện
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => dropPhoto(i)}
                      title="Bỏ ảnh này"
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-white/90 text-xs font-bold text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Máy mới vào trạng thái <b>Chờ kiểm tra</b>, chưa cho mượn được cho tới khi kho xác
            nhận đã kiểm tra xong.
          </p>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5 dark:border-white/[0.06]">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.12] dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            Huỷ
          </button>
          <button
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-white/[0.08]"
          >
            {saving ? stage || 'Đang nhập kho…' : photos.length > 0 ? `Nhập kho kèm ${photos.length} ảnh` : 'Nhập kho'}
          </button>
        </div>
      </div>
    </div>
  );
}
