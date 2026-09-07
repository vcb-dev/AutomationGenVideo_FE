'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  EquipmentCategory,
  EquipmentModel,
  StorageLocation,
  createAsset,
  createCategory,
  createLocation,
  createModel,
  uploadAssetPhoto,
  fetchCategories,
  fetchLocations,
  fetchModels,
} from '@/lib/equipment/api';
import { apiErrorMessage } from '@/lib/equipment/api-error';
import { CONDITION_OPTIONS } from '@/lib/equipment/status-label';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';
const labelClass = 'text-sm font-semibold text-slate-900 dark:text-white';
const hintClass = 'mt-0.5 block text-xs text-slate-500 dark:text-slate-400';

const NEW_CATEGORY = '__new_category__';
const NEW_MODEL = '__new_model__';
const NEW_LOCATION = '__new_location__';

export function formatCategoryName(cat: EquipmentCategory) {
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

export function suggestCode(name: string) {
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
  const [newLocationName, setNewLocationName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [intakeNote, setIntakeNote] = useState('');
  // Mặc định Tốt vì đó là phần lớn máy nhập về, nhưng phải KHAI được: hàng đổi trả hay máy cũ
  // mua lại thường đã có vết, ghi sai ngay từ đầu thì mọi lần đối chiếu về sau đều lệch.
  const [condition, setCondition] = useState('GOOD');

  // Tạo danh mục mới
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');

  // Khai model mới
  const [newModelName, setNewModelName] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newAccessories, setNewAccessories] = useState('');

  // Ảnh tải lên từ thư viện
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  /**
   * Những gì lần bấm Lưu trước đã kịp tạo ra.
   *
   * Nhập kho là bốn lời gọi nối nhau (danh mục → model → vị trí → thiết bị) và KHÔNG nằm trong
   * một giao dịch nào. Hỏng ở bước cuối — trùng serial chẳng hạn — thì ba thứ đầu vẫn ở lại
   * trên máy chủ. Không nhớ chúng thì lần thử lại đi tạo tiếp lần nữa và ăn "Model X đã có
   * trong danh mục này", tức là người dùng bị chặn bởi chính rác mình vừa tạo.
   */
  const created = useRef<{
    category?: EquipmentCategory;
    model?: EquipmentModel;
    location?: StorageLocation;
  }>({});

  /**
   * Thu hồi các blob URL khi ĐÓNG dialog, không phải mỗi lần danh sách ảnh đổi.
   *
   * Bản trước để `[previews]` làm phụ thuộc: mỗi lần chọn thêm ảnh, React chạy hàm dọn của lượt
   * trước và thu hồi TOÀN BỘ url của lượt đó — mà những url ấy vẫn đang nằm trong danh sách mới
   * và đang hiển thị. Hậu quả nhìn thấy được: chọn ảnh thứ hai là ảnh thứ nhất thành ô vỡ.
   *
   * Giữ danh sách mới nhất trong ref để hàm dọn (chạy một lần lúc gỡ) vẫn thấy đủ.
   */
  const previewsRef = useRef<string[]>([]);
  previewsRef.current = previews;
  useEffect(() => () => previewsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

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
      .catch((e: unknown) => setError(apiErrorMessage(e, 'Không đọc được danh mục thiết bị.')));
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
  const isCreatingLocation = locationId === NEW_LOCATION;

  const canSubmit =
    serialNumber.trim() !== '' &&
    !saving &&
    (isCreatingCategory ? newCatName.trim() !== '' : selectedCategoryId !== '') &&
    (isCreatingModel ? newModelName.trim() !== '' : modelId !== '') &&
    // Chọn "thêm vị trí mới" mà bỏ trống tên thì `NEW_LOCATION` sẽ bị gửi lên như một uuid.
    (!isCreatingLocation || newLocationName.trim() !== '');

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    setPhotos((prev) => [...prev, ...picked]);
    setPreviews((prev) => [...prev, ...picked.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        const cat =
          created.current.category ??
          (await createCategory({
            name: newCatName.trim(),
            code: code.toUpperCase(),
            bufferMinutes: 0,
          }));
        created.current.category = cat;
        targetCategoryId = cat.id;
      }

      // 2. Tạo model mới nếu được chọn
      let targetModelId = modelId;
      if (isCreatingModel) {
        setStage('Đang tạo model thiết bị…');
        const model =
          created.current.model ??
          (await createModel({
            categoryId: targetCategoryId,
            name: newModelName.trim(),
            manufacturer: newManufacturer.trim() || undefined,
            accessories: newAccessories
              .split(/[,;\n]+/)
              .map((s) => s.trim())
              .filter(Boolean),
          }));
        created.current.model = model;
        targetModelId = model.id;
      }

      // 3. Tạo vị trí kho mới nếu được chọn
      let targetLocationId = locationId;
      if (isCreatingLocation) {
        setStage('Đang tạo vị trí kho mới…');
        const loc =
          created.current.location ??
          (await createLocation({ name: newLocationName.trim() }));
        created.current.location = loc;
        targetLocationId = loc.id;
      }

      // 4. Nhập kho thiết bị
      setStage('Đang nhập kho thiết bị…');
      const rawPrice = purchasePrice.replace(/\D/g, '');
      const asset = await createAsset({
        modelId: targetModelId,
        serialNumber: serialNumber.trim(),
        locationId: targetLocationId || undefined,
        purchaseDate: purchaseDate || undefined,
        purchasePrice: rawPrice ? Number(rawPrice) : undefined,
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
        apiErrorMessage(e, 'Không nhập kho được thiết bị.'),
      );
    } finally {
      setSaving(false);
      setStage('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/[0.1] dark:bg-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER (Sticky) */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3.5 sm:px-5 sm:py-4 backdrop-blur dark:border-white/[0.06] dark:bg-slate-900/95">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Thêm thiết bị vào kho
            </h2>
            <p className="text-xs text-slate-400">
              Chọn danh mục và model để hệ thống tự động sinh mã máy chuẩn.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-300"
          >
            ✕
          </button>
        </div>

        {/* BODY (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* BƯỚC 1: CHỌN HOẶC TẠO DANH MỤC */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
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
              <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 dark:border-blue-500/30 dark:bg-blue-500/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Khai báo danh mục mới
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(categories[0]?.id || '')}
                    className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
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

                  <label className="block sm:col-span-2">
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
                </div>
              </div>
            )}
          </div>

          {/* BƯỚC 2: CHỌN HOẶC KHAI BÁO MODEL THIẾT BỊ */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            {!isCreatingModel ? (
              <label className="block">
                <span className={labelClass}>
                  2. Tên Model / Thiết bị <em className="not-italic text-red-600">*</em>
                </span>
                <select
                  className={cn(inputClass, 'mt-2')}
                  value={modelId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModelId(val);
                    if (val === NEW_MODEL) {
                      setNewModelName('');
                      setNewManufacturer('');
                      setNewAccessories('');
                    }
                  }}
                >
                  {filteredModels.length > 0 && <option value="">— Chọn model có sẵn —</option>}
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.manufacturer ? `(${m.manufacturer})` : ''} — {m._count.assets} máy trong kho
                    </option>
                  ))}
                  <option value={NEW_MODEL}>+ Khai báo model thiết bị mới…</option>
                </select>
                {(() => {
                  const selectedModel = filteredModels.find((m) => m.id === modelId);
                  if (!selectedModel) return null;
                  return (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white/70 p-2.5 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        🎁 Phụ kiện tiêu chuẩn:
                      </span>
                      {selectedModel.accessories && selectedModel.accessories.length > 0 ? (
                        selectedModel.accessories.map((acc, idx) => (
                          <span
                            key={acc.id || idx}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-xs dark:border-white/[0.08] dark:bg-slate-800 dark:text-slate-200"
                          >
                            ✓ {acc.name}
                          </span>
                        ))
                      ) : (
                        <span className="italic text-slate-400">Không có phụ kiện tiêu chuẩn khai báo</span>
                      )}
                    </div>
                  );
                })()}
              </label>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    2. Khai báo model / thiết bị mới
                  </span>
                  {filteredModels.length > 0 && !isCreatingCategory && (
                    <button
                      type="button"
                      onClick={() => setModelId(filteredModels[0]?.id || '')}
                      className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      ← Chọn model có sẵn
                    </button>
                  )}
                </div>

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
              <span className={hintClass}>Số serial vật lý in trên thân máy.</span>
              <input
                className={cn(inputClass, 'mt-2 font-mono font-medium')}
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
                <option value={NEW_LOCATION}>+ Thêm vị trí kho mới…</option>
              </select>
              {isCreatingLocation && (
                <input
                  className={cn(inputClass, 'mt-2')}
                  placeholder="Tên vị trí: Kệ A-05, Tủ D-02, Xưởng sửa…"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                />
              )}
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
                  type="text"
                  inputMode="numeric"
                  className={cn(inputClass, 'mt-2 font-mono')}
                  value={purchasePrice}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setPurchasePrice(digits ? Number(digits).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="48.000.000"
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Tình trạng lúc nhập kho</span>
              <span className={hintClass}>
                Khai đúng ngay từ đầu, vì đây là mốc đối chiếu cho mọi lần bàn giao và nhận trả
                về sau. Máy không ở mức Tốt sẽ vào Chờ kiểm tra thay vì lên kệ ngay.
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
              <span className={labelClass}>Ghi chú thiết bị</span>
              <span className={hintClass}>
                Mô tả thêm nếu máy có vết — ghi chú này vào thẳng nhật ký vòng đời của máy.
              </span>
              <input
                className={cn(inputClass, 'mt-2')}
                value={intakeNote}
                onChange={(e) => setIntakeNote(e.target.value)}
                placeholder="Ví dụ: máy mới 100%, nguyên seal, xước nhẹ góc đáy..."
              />
            </label>

            {/* KHỐI ẢNH THIẾT BỊ (CHỌN TỪ THƯ VIỆN) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div>
                  <span className={labelClass}>Ảnh thiết bị</span>
                  <span className={hintClass}>
                    Tải ảnh từ thư viện thiết bị. Tấm đầu tiên sẽ là ảnh đại diện.
                  </span>
                </div>
                {photos.length > 0 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    + Thêm ảnh
                  </button>
                )}
              </div>

              {/* INPUT FILE CHỌN TỪ THƯ VIỆN */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addPhotos(e.target.files)}
              />

              {photos.length === 0 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center shadow-sm hover:border-blue-400 hover:bg-blue-50/40 active:scale-[0.99] transition-all dark:border-white/[0.12] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Bấm để chọn ảnh từ thư viện
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hỗ trợ JPG, PNG, WEBP (có thể chọn nhiều ảnh)
                  </span>
                </button>
              ) : (
                <div className="mt-3.5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                  {previews.map((src, i) => (
                    <div
                      key={src}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-sm bg-black/5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={photos[i].name} className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute inset-x-0 bottom-0 bg-blue-600/90 py-0.5 text-center text-[9px] font-bold text-white tracking-wider uppercase">
                          Ảnh đại diện
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => dropPhoto(i)}
                        title="Bỏ ảnh này"
                        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-slate-900/80 text-xs font-bold text-white shadow-md active:scale-90 transition-transform"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        {/* FOOTER (Sticky) */}
        <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2.5 border-t border-slate-100 bg-white/95 px-4 py-3 sm:px-5 sm:py-3.5 backdrop-blur dark:border-white/[0.06] dark:bg-slate-900/95">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all dark:border-white/[0.12] dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            Huỷ
          </button>
          <button
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-white/[0.08]"
          >
            {saving ? stage || 'Đang nhập kho…' : photos.length > 0 ? `Nhập kho (${photos.length} ảnh)` : 'Nhập kho'}
          </button>
        </div>
      </div>
    </div>
  );
}
