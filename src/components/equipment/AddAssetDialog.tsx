'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  EquipmentCategory,
  EquipmentModel,
  StorageLocation,
  createAsset,
  createCategory,
  createLocation,
  createModel,
  deleteCategory,
  deleteModel,
  uploadAssetPhoto,
  fetchCategories,
  fetchLocations,
  fetchModels,
} from '@/lib/equipment/api';
import { apiErrorMessage } from '@/lib/equipment/api-error';
import { canDeleteCatalog } from '@/lib/equipment/catalog-permissions';
import { useAuthStore } from '@/store/auth-store';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { CONDITION_OPTIONS } from '@/lib/equipment/status-label';
import { DatePicker } from '@/components/ui/DatePicker';

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

export function findExistingModel(
  models: EquipmentModel[],
  categoryId: string,
  modelName: string,
): EquipmentModel | undefined {
  const cleanName = modelName.trim().toLowerCase();
  if (!cleanName) return undefined;
  return models.find(
    (m) =>
      (!categoryId || m.category?.id === categoryId) &&
      m.name.trim().toLowerCase() === cleanName,
  );
}

interface AddAssetDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

export function AddAssetDialog({ onClose, onCreated }: AddAssetDialogProps) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = canDeleteCatalog(user?.roles);

  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    type: 'category' | 'model';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'model', id: '', name: '' });
  const [deletingItem, setDeletingItem] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [modelId, setModelId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
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
          const firstCatId = c[0].id;
          setSelectedCategoryId(firstCatId);
          const catModels = m.filter((mod) => mod.category?.id === firstCatId);
          if (catModels.length > 0) {
            setModelId(catModels[0].id);
          } else {
            setModelId(NEW_MODEL);
          }
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

  // Nhận diện xem tên model người dùng gõ vào đã tồn tại trong danh mục chưa
  const matchedExistingModel = useMemo(() => {
    if (!isCreatingModel || !newModelName.trim()) return null;
    return (
      findExistingModel(filteredModels, selectedCategoryId, newModelName) ||
      findExistingModel(models, selectedCategoryId, newModelName) ||
      null
    );
  }, [isCreatingModel, newModelName, filteredModels, models, selectedCategoryId]);

  const serialList = useMemo(() => {
    return serialNumber
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [serialNumber]);

  const canSubmit =
    (quantity === 1 ? serialNumber.trim() !== '' : (serialList.length > 0 || serialNumber.trim() !== '')) &&
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

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setDeletingItem(true);
    try {
      if (confirmDelete.type === 'model') {
        await deleteModel(confirmDelete.id);
        toast.success(`Đã xóa model "${confirmDelete.name}"`);
        const latestModels = await fetchModels(selectedCategoryId);
        setModels(latestModels);
        const remaining = latestModels.filter((m) => m.category?.id === selectedCategoryId);
        if (remaining.length > 0) {
          setModelId(remaining[0].id);
        } else {
          setModelId(NEW_MODEL);
        }
      } else {
        await deleteCategory(confirmDelete.id);
        toast.success(`Đã xóa danh mục "${confirmDelete.name}"`);
        const latestCats = await fetchCategories();
        setCategories(latestCats);
        if (latestCats.length > 0) {
          setSelectedCategoryId(latestCats[0].id);
        } else {
          setSelectedCategoryId(NEW_CATEGORY);
        }
      }
      setConfirmDelete({ isOpen: false, type: 'model', id: '', name: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa.';
      toast.error(msg);
    } finally {
      setDeletingItem(false);
    }
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

      // 2. Tạo model mới nếu được chọn (hoặc tái sử dụng model đã có nếu trùng tên)
      let targetModelId = modelId;
      if (isCreatingModel) {
        const cleanName = newModelName.trim();
        const existing =
          matchedExistingModel ||
          findExistingModel(filteredModels, targetCategoryId, cleanName) ||
          findExistingModel(models, targetCategoryId, cleanName);

        if (existing) {
          targetModelId = existing.id;
        } else {
          setStage('Đang tạo model thiết bị…');
          try {
            const model =
              created.current.model ??
              (await createModel({
                categoryId: targetCategoryId,
                name: cleanName,
                manufacturer: newManufacturer.trim() || undefined,
                accessories: newAccessories
                  .split(/[,;\n]+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              }));
            created.current.model = model;
            targetModelId = model.id;
          } catch (err: unknown) {
            // Nếu vẫn báo lỗi đã có trong danh mục (do vừa tạo hoặc race condition), tự động gắn vào model đã có
            const latestModels = await fetchModels().catch(() => []);
            const fallback = findExistingModel(latestModels, targetCategoryId, cleanName);
            if (fallback) {
              targetModelId = fallback.id;
            } else {
              throw err;
            }
          }
        }
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
      const assetResult = await createAsset({
        modelId: targetModelId,
        serialNumber: serialList[0] || serialNumber.trim(),
        serialNumbers: serialList.length > 1 ? serialList : undefined,
        quantity: quantity > 1 ? quantity : undefined,
        locationId: targetLocationId || undefined,
        purchaseDate: purchaseDate || undefined,
        purchasePrice: rawPrice ? Number(rawPrice) : undefined,
        condition,
        intakeNote: intakeNote.trim() || undefined,
      });

      const createdAssets =
        assetResult.assets && assetResult.assets.length > 0
          ? assetResult.assets
          : [assetResult];

      // 5. Tải ảnh thiết bị lên cho các máy vừa tạo
      const failed: string[] = [];
      for (const a of createdAssets) {
        for (const [i, file] of photos.entries()) {
          setStage(`Đang tải ảnh cho ${a.asset_code} (${i + 1}/${photos.length})…`);
          try {
            await uploadAssetPhoto(a.asset_code, file);
          } catch {
            failed.push(`${a.asset_code}: ${file.name}`);
          }
        }
      }

      onCreated();
      if (failed.length > 0) {
        setError(
          `Đã nhập kho ${createdAssets.map((a) => a.asset_code).join(', ')}, nhưng ${failed.length} ảnh không tải lên được: ` +
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

            {isAdmin && selectedCategoryId && selectedCategoryId !== NEW_CATEGORY && (() => {
              const catAssets = models
                .filter((m) => m.category?.id === selectedCategoryId)
                .reduce((sum, m) => sum + (m._count?.assets ?? 0), 0);
              if (catAssets > 0) return null;
              const catObj = categories.find((c) => c.id === selectedCategoryId);
              return (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/70 p-2 px-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  <span>Danh mục này chưa có thiết bị nào trong kho.</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ isOpen: true, type: 'category', id: selectedCategoryId, name: catObj?.name || '' })}
                    className="font-semibold text-red-600 underline hover:text-red-800 dark:text-red-400"
                  >
                    🗑️ Xóa danh mục này
                  </button>
                </div>
              );
            })()}

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
                      maxLength={50}
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
                <span className={hintClass}>
                  Chọn dòng máy đã có trong kho hoặc bấm &ldquo;+ Khai báo model thiết bị mới…&rdquo; nếu nhập dòng máy chưa từng có.
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
                  {filteredModels.map((m) => {
                    const truncatedName = m.name.length > 35 ? m.name.slice(0, 32) + '...' : m.name;
                    return (
                      <option key={m.id} value={m.id}>
                        {truncatedName} {m.manufacturer ? `(${m.manufacturer})` : ''} — {m._count?.assets ?? 0} máy trong kho
                      </option>
                    );
                  })}
                  <option value={NEW_MODEL}>+ Khai báo model thiết bị mới…</option>
                </select>
                {(() => {
                  const selectedModel = filteredModels.find((m) => m.id === modelId);
                  if (!selectedModel) return null;
                  const activeAssets = selectedModel._count?.assets ?? 0;
                  return (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white/70 p-2.5 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300">
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

                      {isAdmin && activeAssets === 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/70 p-2 px-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                          <span>Model này chưa có máy nào trong kho.</span>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ isOpen: true, type: 'model', id: selectedModel.id, name: selectedModel.name })}
                            className="font-semibold text-red-600 underline hover:text-red-800 dark:text-red-400"
                          >
                            🗑️ Xóa model này
                          </button>
                        </div>
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
                      ← Chọn model có sẵn ({filteredModels.length})
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
                    maxLength={60}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Ví dụ: Sony A7 IV, Canon R6 Mark II, Godox V860III..."
                  />
                </label>

                {matchedExistingModel && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/90 p-3 text-xs text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                    <span className="text-base leading-none">💡</span>
                    <div className="flex-1 space-y-0.5">
                      <p className="font-semibold">
                        Model &ldquo;{matchedExistingModel.name}&rdquo; đã có sẵn trong danh mục ({matchedExistingModel._count?.assets ?? 0} máy trong kho).
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Hệ thống sẽ tự động gán thiết bị mới vào model này để gom chung một dòng máy, không tạo trùng lặp.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModelId(matchedExistingModel.id)}
                      className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      Dùng model này
                    </button>
                  </div>
                )}

                <label className="block">
                  <span className={labelClass}>Hãng sản xuất</span>
                  <input
                    className={cn(inputClass, 'mt-1.5')}
                    value={newManufacturer}
                    maxLength={40}
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
                    maxLength={120}
                    onChange={(e) => setNewAccessories(e.target.value)}
                    placeholder="Pin, Sạc, Cáp type-C, Túi đựng, Nắp đậy..."
                  />
                </label>
              </div>
            )}
          </div>

          {/* BƯỚC 3: THÔNG TIN MÁY VẬT LÝ */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block sm:col-span-1">
                <span className={labelClass}>
                  Số lượng <em className="not-italic text-red-600">*</em>
                </span>
                <span className={hintClass}>Số chiếc nhập kho.</span>
                <div className="mt-2 flex h-[42px] items-center rounded-xl border border-slate-300 bg-white dark:border-white/[0.12] dark:bg-white/[0.04] overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="flex h-full w-10 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="w-full text-center text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setQuantity(isNaN(v) || v < 1 ? 1 : Math.min(50, v));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(50, quantity + 1))}
                    disabled={quantity >= 50}
                    className="flex h-full w-10 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </label>

              <div className="sm:col-span-2">
                {quantity === 1 ? (
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
                ) : (
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className={labelClass}>
                        Danh sách serial ({quantity} chiếc) <em className="not-italic text-red-600">*</em>
                      </span>
                      {serialList.length === quantity ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Đủ {quantity}/{quantity} serial
                        </span>
                      ) : serialList.length === 1 ? (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          Tự đánh số đuôi -01, -02...
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Đã nhập {serialList.length}/{quantity} serial
                        </span>
                      )}
                    </div>
                    <span className={hintClass}>
                      Gõ/dán mỗi serial 1 dòng, hoặc 1 serial mẫu để tự đánh số đuôi.
                    </span>
                    <textarea
                      rows={3}
                      className={cn(inputClass, 'mt-2 font-mono text-xs leading-relaxed resize-none')}
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder={`Ví dụ:\nSN1001\nSN1002\n(Hoặc gõ "A7IV" để tự sinh A7IV-01, A7IV-02)`}
                    />
                  </label>
                )}
              </div>
            </div>

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
              <div className="block">
                <span className={labelClass}>Ngày mua</span>
                <DatePicker
                  value={purchaseDate}
                  onChange={setPurchaseDate}
                  placeholder="Chọn ngày mua"
                  className="w-full mt-2"
                  buttonClassName="!w-full !h-[42px] !rounded-xl !border-slate-300 dark:!border-white/[0.12] dark:!bg-white/[0.04] !text-sm"
                />
              </div>
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
                Khai đúng ngay từ đầu để đối chiếu khi bàn giao và nhận trả. Thiết bị sau khi lưu sẽ ở trạng thái Sẵn sàng để cho mượn ngay.
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
            {saving
              ? stage || 'Đang nhập kho…'
              : quantity > 1
                ? `Nhập kho (${quantity} thiết bị)`
                : photos.length > 0
                  ? `Nhập kho (${photos.length} ảnh)`
                  : 'Nhập kho'}
          </button>
        </div>
      </div>

      {/* CONFIRM MODAL CHO VIỆC XÓA DANH MỤC / MODEL CỦA ADMIN */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        isLoading={deletingItem}
        variant="danger"
        title={confirmDelete.type === 'model' ? 'Xóa Model thiết bị' : 'Xóa Danh mục thiết bị'}
        description={
          <div>
            <p>
              Bạn có chắc muốn xóa {confirmDelete.type === 'model' ? 'model' : 'danh mục'}{' '}
              <strong className="text-slate-900 dark:text-white">&ldquo;{confirmDelete.name}&rdquo;</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Mục này sẽ được ẩn khỏi kho và không còn hiển thị trong danh sách lựa chọn nữa.
            </p>
          </div>
        }
        confirmText="Xóa vĩnh viễn"
        cancelText="Giữ lại"
      />
    </div>
  );
}
