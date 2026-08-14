'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  EquipmentCategory,
  EquipmentModel,
  StorageLocation,
  createAsset,
  createModel,
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      let targetModelId = modelId;
      if (creatingModel) {
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

      await createAsset({
        modelId: targetModelId,
        serialNumber: serialNumber.trim(),
        locationId: locationId || undefined,
        purchaseDate: purchaseDate || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không nhập kho được thiết bị.',
      );
    } finally {
      setSaving(false);
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
            {saving ? 'Đang nhập kho…' : 'Nhập kho'}
          </button>
        </div>
      </div>
    </div>
  );
}
