'use client';

import { useEffect, useState } from 'react';
import {
  Asset,
  EquipmentModel,
  StorageLocation,
  createLocation,
  fetchLocations,
  fetchModels,
  updateAsset,
} from '@/lib/equipment/api';

/** Cùng khuôn với `NEW_CATEGORY`/`NEW_MODEL` bên `AddAssetDialog`. */
const NEW_LOCATION = '__new_location__';
import { AssetEditForm, buildUpdatePayload } from '@/lib/equipment/asset-edit';
import { manualStatusOptionsFor, statusDoorHints } from '@/lib/equipment/manual-status';
import { CONDITION_OPTIONS } from '@/lib/equipment/status-label';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';
const labelClass = 'text-sm font-semibold text-slate-900 dark:text-white';
const hintClass = 'mt-0.5 block text-xs text-slate-500 dark:text-slate-400';

interface EditAssetDialogProps {
  asset: Asset;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Sửa một máy đã trong kho.
 *
 * Mã thiết bị và mã QR cố ý KHÔNG sửa được (BR-04): hai thứ đó dán trên thân máy, đổi trong
 * hệ thống thì cái nhãn ngoài đời thành nói dối. Hiện ra để đối chiếu, khoá không cho gõ.
 */
export function EditAssetDialog({ asset, onClose, onSaved }: EditAssetDialogProps) {
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newLocationName, setNewLocationName] = useState('');

  const [form, setForm] = useState<AssetEditForm>({
    modelId: asset.model.id,
    serialNumber: asset.serial_number,
    locationId: asset.location?.id ?? '',
    condition: asset.condition,
    status: asset.status,
    note: '',
  });

  useEffect(() => {
    fetchModels().then(setModels).catch(() => setModels([]));
    fetchLocations().then(setLocations).catch(() => setLocations([]));
  }, []);

  const set = <K extends keyof AssetEditForm>(key: K, value: AssetEditForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isCreatingLocation = form.locationId === NEW_LOCATION;

  const save = async () => {
    // Tạo vị trí trước rồi mới dựng payload: `buildUpdatePayload` so id với id cũ, đưa
    // `NEW_LOCATION` vào đó thì nó gửi thẳng chuỗi giả lên BE.
    let formToSave = form;
    if (isCreatingLocation) {
      if (!newLocationName.trim()) {
        setError('Nhập tên vị trí kho mới trước khi lưu.');
        return;
      }
      setSaving(true);
      try {
        const created = await createLocation({ name: newLocationName.trim() });
        formToSave = { ...form, locationId: created.id };
        setForm(formToSave);
        setNewLocationName('');
      } catch (e) {
        setError(
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Không tạo được vị trí kho.',
        );
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    const payload = buildUpdatePayload(asset, formToSave);
    // Không đổi gì mà vẫn gọi API thì nhật ký vòng đời đầy mốc "đã sửa" rỗng ruột.
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateAsset(asset.asset_code, payload);
      onSaved();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Không lưu được. Kiểm tra kết nối rồi thử lại.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sửa thiết bị</h2>
          <p className={hintClass}>
            Mã <span className="font-mono font-semibold">{asset.asset_code}</span> và mã QR không
            sửa được — hai thứ đó dán trên thân máy.
          </p>
        </header>

        <div className="space-y-3.5">
          <div>
            <label className={labelClass} htmlFor="edit-model">
              Model
            </label>
            <select
              id="edit-model"
              className={inputClass}
              value={form.modelId}
              onChange={(e) => set('modelId', e.target.value)}
            >
              {/* Model hiện tại luôn có mặt kể cả khi danh sách chưa tải xong. */}
              {models.length === 0 && (
                <option value={asset.model.id}>{asset.model.name}</option>
              )}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="edit-serial">
              Số serial
            </label>
            <input
              id="edit-serial"
              className={`${inputClass} font-mono`}
              value={form.serialNumber}
              onChange={(e) => set('serialNumber', e.target.value)}
            />
            <span className={hintClass}>Duy nhất toàn hệ thống — trùng với máy khác sẽ bị chặn.</span>
          </div>

          <div>
            <label className={labelClass} htmlFor="edit-location">
              Vị trí lưu kho
            </label>
            <select
              id="edit-location"
              className={inputClass}
              value={form.locationId}
              onChange={(e) => set('locationId', e.target.value)}
            >
              <option value="">Chưa xếp chỗ</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              <option value={NEW_LOCATION}>+ Thêm vị trí kho mới…</option>
            </select>
            {isCreatingLocation && (
              <input
                className={`${inputClass} mt-2`}
                placeholder="Tên vị trí: Kệ A-05, Tủ D-02, Xưởng sửa…"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="edit-condition">
                Tình trạng
              </label>
              <select
                id="edit-condition"
                className={inputClass}
                value={form.condition}
                onChange={(e) => set('condition', e.target.value)}
              >
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className={hintClass}>Chất lượng vật lý của máy.</span>
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-status">
                Trạng thái
              </label>
              <select
                id="edit-status"
                className={inputClass}
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {manualStatusOptionsFor(asset.status).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className={hintClass}>
                {asset.status === 'ON_LOAN'
                  ? 'Máy đang ở ngoài — chỉ đánh dấu Mất được. Trầy, thiếu phụ kiện hay hỏng thì ghi lúc nhận trả.'
                  : 'Sửa tay chỉ để đưa máy RA khỏi vòng dùng được.'}
              </span>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="edit-note">
              Ghi chú
            </label>
            <input
              id="edit-note"
              className={inputClass}
              placeholder="Vì sao sửa — vào thẳng nhật ký vòng đời"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
          </div>

          {/* Nói thẳng cửa đúng của bốn trạng thái vắng mặt, thay vì để người dùng đi tìm. */}
          <details className="rounded-xl bg-slate-50 px-3.5 py-2.5 dark:bg-white/[0.04]">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
              Không thấy trạng thái cần chọn?
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {statusDoorHints().map((hint) => (
                <li key={hint}>• {hint}</li>
              ))}
            </ul>
          </details>

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <footer className="mt-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.12] dark:text-slate-200 dark:hover:bg-white/[0.05]"
          >
            Huỷ
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </footer>
      </div>
    </div>
  );
}
