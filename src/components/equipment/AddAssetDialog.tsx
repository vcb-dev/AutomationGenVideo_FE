'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CONDITION_OPTIONS } from '@/lib/equipment/status-label';
import {
  EquipmentCategory,
  EquipmentModel,
  StorageLocation,
  createAsset,
  createCategory,
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

const NEW_CATEGORY = '__new_category__';
const NEW_MODEL = '__new_model__';

function formatCategoryName(cat: EquipmentCategory) {
  const map: Record<string, string> = {
    CAM: 'Máy ảnh (Camera)',
    LEN: 'Ống kính (Lens)',
    LIG: 'Đèn Flash & Ánh sáng (Lighting)',
    AUD: 'Microphone & Âm thanh (Audio)',
    GIM: 'Gimbal & Chống rung',
    TRP: 'Chân máy (Tripod)',
  };
  return map[cat.code] || `${cat.name} (${cat.code})`;
}

function suggestCode(name: string) {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return clean.slice(0, 4) || 'EQP';
}

interface AddAssetDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

export function AddAssetDialog({ onClose, onCreated }: AddAssetDialogProps) {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [modelId, setModelId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [locationId, setLocationId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [intakeNote, setIntakeNote] = useState('');

  // Tạo danh mục mới
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatBuffer, setNewCatBuffer] = useState('60');

  // Khai model mới
  const [newModelName, setNewModelName] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newAccessories, setNewAccessories] = useState('');

  // Ảnh tải lên
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const loadData = () => {
    Promise.all([fetchModels(), fetchCategories(), fetchLocations()])
      .then(([m, c, l]) => {
        setModels(m);
        setCategories(c);
        setLocations(l);
        if (c.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(c[0].id);
        }
      })
      .catch(() => setError('Không đọc được danh mục thiết bị.'));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCreatingCategory = selectedCategoryId === NEW_CATEGORY;

  // Lọc models theo danh mục đã chọn
  const filteredModels = useMemo(() => {
    if (!selectedCategoryId || isCreatingCategory) return [];
    return models.filter((m) => m.category?.id === selectedCategoryId);
  }, [models, selectedCategoryId, isCreatingCategory]);

  // Nếu chuyển danh mục mà model không khớp hoặc chưa có model nào thì chuyển sang khai model mới
  useEffect(() => {
    if (isCreatingCategory) {
      setModelId(NEW_MODEL);
    } else if (filteredModels.length > 0) {
      if (!filteredModels.some((m) => m.id === modelId) && modelId !== NEW_MODEL) {
        setModelId(filteredModels[0].id);
      }
    } else {
      setModelId(NEW_MODEL);
    }
  }, [selectedCategoryId, filteredModels, isCreatingCategory, modelId]);

  const isCreatingModel = isCreatingCategory || modelId === NEW_MODEL;

  const canSubmit =
    serialNumber.trim() !== '' &&
    !saving &&
    (isCreatingCategory ? newCatName.trim() !== '' : selectedCategoryId !== '') &&
    (isCreatingModel ? newModelName.trim() !== '' : modelId !== '');

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
      let targetCategoryId = selectedCategoryId;

      // 1. Tạo danh mục mới nếu được chọn
      if (isCreatingCategory) {
        setStage('Đang tạo danh mục mới…');
        const code = newCatCode.trim() || suggestCode(newCatName);
        const cat = await createCategory({
          name: newCatName.trim(),
          code: code.toUpperCase(),
          bufferMinutes: Number(newCatBuffer) || 60,
        });
        targetCategoryId = cat.id;
      }

      // 2. Tạo model mới nếu được chọn
      let targetModelId = modelId;
      if (isCreatingModel) {
        setStage('Đang tạo model thiết bị…');
        const model = await createModel({
          categoryId: targetCategoryId,
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

      // 3. Nhập kho thiết bị
      setStage('Đang nhập kho thiết bị…');
      const asset = await createAsset({
        modelId: targetModelId,
        serialNumber: serialNumber.trim(),
        locationId: locationId || undefined,
        purchaseDate: purchaseDate || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        condition,
        intakeNote: intakeNote.trim() || undefined,
      });

      // 4. Tải ảnh thiết bị lên
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
              Chọn danh mục và model để hệ thống tự động sinh mã thiết bị theo chuẩn.
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
          {/* BƯỚC 1: CHỌN HOẶC TẠO DANH MỤC */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <label className="block">
              <span className={labelClass}>
                1. Danh mục thiết bị <em className="not-italic text-red-600">*</em>
              </span>
              <span className={hintClass}>
                Ví dụ: Máy ảnh, Lens, Đèn Flash, Microphone, Gimbal, Phụ kiện...
              </span>
              <select
                className={cn(inputClass, 'mt-2')}
                value={selectedCategoryId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategoryId(val);
                  if (val === NEW_CATEGORY) {
                    setNewCatName('');
                    setNewCatCode('');
                  }
                }}
              >
                <option value="">— Chọn danh mục —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatCategoryName(c)}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ Tạo danh mục mới…</option>
              </select>
            </label>

            {isCreatingCategory && (
              <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-500/30 dark:bg-blue-500/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Khai báo danh mục mới
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(categories[0]?.id || '')}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    ← Chọn danh mục có sẵn
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className={labelClass}>
                      Tên danh mục <em className="not-italic text-red-600">*</em>
                    </span>
                    <input
                      className={cn(inputClass, 'mt-1.5')}
                      value={newCatName}
                      onChange={(e) => {
                        setNewCatName(e.target.value);
                        if (!newCatCode || newCatCode === suggestCode(newCatName)) {
                          setNewCatCode(suggestCode(e.target.value));
                        }
                      }}
                      placeholder="Ví dụ: Flycam / Drone, Pin & Sạc, Thẻ nhớ..."
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>
                      Mã tiền tố (Prefix) <em className="not-italic text-red-600">*</em>
                    </span>
                    <span className={hintClass}>Dùng sinh mã: FLY-001, SD-001...</span>
                    <input
                      className={cn(inputClass, 'mt-1.5 font-mono uppercase')}
                      value={newCatCode}
                      onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                      placeholder="FLY"
                      maxLength={6}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Thời gian kiểm tra (phút)</span>
                    <span className={hintClass}>Buffer kiểm tra sau khi trả máy</span>
                    <input
                      type="number"
                      min={0}
                      className={cn(inputClass, 'mt-1.5')}
                      value={newCatBuffer}
                      onChange={(e) => setNewCatBuffer(e.target.value)}
                      placeholder="60"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* BƯỚC 2: CHỌN HOẶC KHAI BÁO MODEL THIẾT BỊ */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            {!isCreatingCategory && (
              <label className="block">
                <span className={labelClass}>
                  2. Tên Model / Thiết bị <em className="not-italic text-red-600">*</em>
                </span>
                <select
                  className={cn(inputClass, 'mt-2')}
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                >
                  {filteredModels.length > 0 && <option value="">— Chọn model có sẵn —</option>}
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.manufacturer ? `(${m.manufacturer})` : ''} — {m._count.assets} máy trong kho
                    </option>
                  ))}
                  <option value={NEW_MODEL}>+ Khai báo model thiết bị mới…</option>
                </select>
              </label>
            )}

            {isCreatingModel && (
              <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/[0.08]">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Thông tin model thiết bị mới
                </span>

                <label className="block">
                  <span className={labelClass}>
                    Tên Model / Thiết bị <em className="not-italic text-red-600">*</em>
                  </span>
                  <input
                    className={cn(inputClass, 'mt-1.5')}
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Ví dụ: Sony A7 IV, Canon R6 Mark II, Godox V860III..."
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Hãng sản xuất</span>
                    <input
                      className={cn(inputClass, 'mt-1.5')}
                      value={newManufacturer}
                      onChange={(e) => setNewManufacturer(e.target.value)}
                      placeholder="Sony, Canon, DJI, Godox..."
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Giá tham chiếu (VNĐ)</span>
                    <input
                      type="number"
                      min={0}
                      className={cn(inputClass, 'mt-1.5')}
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="48000000"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Phụ kiện đi kèm chuẩn</span>
                  <span className={hintClass}>
                    Ngăn cách bằng dấu phẩy. Dùng để đối chiếu lúc bàn giao và nhận lại máy.
                  </span>
                  <input
                    className={cn(inputClass, 'mt-1.5')}
                    value={newAccessories}
                    onChange={(e) => setNewAccessories(e.target.value)}
                    placeholder="Pin, Sạc, Cáp type-C, Túi đựng, Nắp đậy..."
                  />
                </label>
              </div>
            )}
          </div>

          {/* BƯỚC 3: THÔNG TIN MÁY VẬT LÝ */}
          <div className="space-y-4 pt-1">
            <label className="block">
              <span className={labelClass}>
                Số serial máy <em className="not-italic text-red-600">*</em>
              </span>
              <span className={hintClass}>Số serial vật lý duy nhất in trên thân máy.</span>
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
                <span className={labelClass}>Nguyên giá (VNĐ)</span>
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

            <label className="block">
              <span className={labelClass}>
                Tình trạng lúc nhập <em className="not-italic text-red-600">*</em>
              </span>
              <span className={hintClass}>
                Ghi đúng thực tế lúc mở hộp để đối chiếu khi bàn giao/nhận lại.
              </span>
              <select
                className={cn(inputClass, 'mt-2')}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Ghi chú lúc nhập</span>
              <span className={hintClass}>Nhật ký vòng đời thiết bị.</span>
              <input
                className={cn(inputClass, 'mt-2')}
                value={intakeNote}
                onChange={(e) => setIntakeNote(e.target.value)}
                placeholder="Ví dụ: máy mới 100%, nguyên seal hộp..."
              />
            </label>

            <div>
              <span className={labelClass}>Ảnh thiết bị</span>
              <span className={hintClass}>
                Tấm đầu tiên sẽ là ảnh đại diện hiển thị ở danh sách kho thiết bị.
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
                {photos.length === 0 ? 'Bấm để chọn ảnh từ máy' : '+ Chọn thêm ảnh'}
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
          </div>

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Máy mới luôn vào trạng thái <b>Chờ kiểm tra</b> để bảo đảm quy trình kiểm kê trước khi sẵn sàng cho mượn.
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
