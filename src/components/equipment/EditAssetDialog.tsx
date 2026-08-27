'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Asset,
  EquipmentCategory,
  EquipmentModel,
  StorageLocation,
  fetchCategories,
  fetchLocations,
  fetchModels,
  updateAsset,
} from '@/lib/equipment/api';
import { CONDITION_OPTIONS, STATUS_OPTIONS } from '@/lib/equipment/status-label';
import { DatePicker } from '@/components/ui/DatePicker';
import { Loader2, X, Edit3, CheckCircle2, MapPin } from 'lucide-react';
import { ManageLocationsDialog } from '@/components/equipment/ManageLocationsDialog';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';
const labelClass = 'text-sm font-semibold text-slate-900 dark:text-white';
const hintClass = 'mt-0.5 block text-xs text-slate-500 dark:text-slate-400';

interface EditAssetDialogProps {
  asset: Asset;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditAssetDialog({ asset, onClose, onUpdated }: EditAssetDialogProps) {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [showLocationManager, setShowLocationManager] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState(asset.model?.category?.id || '');
  const [modelId, setModelId] = useState(asset.model?.id || '');
  const [serialNumber, setSerialNumber] = useState(asset.serial_number || '');
  const [condition, setCondition] = useState(asset.condition || 'GOOD');
  const [status, setStatus] = useState(asset.status || 'AVAILABLE');
  const [locationId, setLocationId] = useState(asset.location?.id || '');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchCategories(), fetchModels(), fetchLocations()])
      .then(([c, m, l]) => {
        setCategories(c);
        setModels(m);
        setLocations(l);
      })
      .catch((err) => {
        console.error('Lỗi nạp dữ liệu danh mục/vị trí:', err);
      });
  }, []);

  const filteredModels = models.filter(
    (m) => !selectedCategoryId || m.category.id === selectedCategoryId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      setError('Vui lòng nhập số Serial của thiết bị');
      return;
    }
    if (!modelId) {
      setError('Vui lòng chọn model thiết bị');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateAsset(asset.asset_code, {
        modelId,
        serialNumber: serialNumber.trim(),
        condition,
        status,
        locationId: locationId || undefined,
        purchaseDate: purchaseDate || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        note: note.trim() || undefined,
      });

      toast.success(`Đã cập nhật thông tin thiết bị ${asset.asset_code} thành công!`);
      onUpdated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi cập nhật thiết bị';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sửa thông tin thiết bị
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mã tài sản: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{asset.asset_code}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Danh mục */}
            <div>
              <label className={labelClass}>Danh mục</label>
              <span className={hintClass}>Phân loại thiết bị</span>
              <select
                className={`${inputClass} mt-1.5`}
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  const firstModel = models.find((m) => m.category.id === e.target.value);
                  if (firstModel) setModelId(firstModel.id);
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Model / Tên thiết bị */}
            <div>
              <label className={labelClass}>Model / Tên thiết bị</label>
              <span className={hintClass}>Tên dòng máy cụ thể</span>
              <select
                className={`${inputClass} mt-1.5`}
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              >
                {filteredModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Số Serial */}
            <div>
              <label className={labelClass}>Số Serial (SN)</label>
              <span className={hintClass}>Mã vạch / Serial nhà sản xuất</span>
              <input
                type="text"
                className={`${inputClass} mt-1.5 font-mono`}
                placeholder="VD: SONY-A7IV-98213"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>

            {/* Vị trí lưu kho */}
            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass}>Vị trí lưu kho</label>
                <button
                  type="button"
                  onClick={() => setShowLocationManager(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  <span>+ Quản lý vị trí</span>
                </button>
              </div>
              <span className={hintClass}>Tủ / Kệ / Ngăn</span>
              <select
                className={`${inputClass} mt-1.5`}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">-- Chưa xếp chỗ --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tình trạng */}
            <div>
              <label className={labelClass}>Tình trạng vật lý</label>
              <span className={hintClass}>Đánh giá chất lượng máy</span>
              <select
                className={`${inputClass} mt-1.5`}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trạng thái kho */}
            <div>
              <label className={labelClass}>Trạng thái kho</label>
              <span className={hintClass}>Sẵn sàng hay đang bảo dưỡng</span>
              <select
                className={`${inputClass} mt-1.5`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ngày mua */}
            <div>
              <label className={labelClass}>Ngày mua / Nhập kho</label>
              <span className={hintClass}>Thời gian mua tài sản</span>
              <div className="mt-1.5">
                <DatePicker
                  value={purchaseDate}
                  onChange={setPurchaseDate}
                  placeholder="Chọn ngày mua"
                />
              </div>
            </div>

            {/* Giá mua */}
            <div>
              <label className={labelClass}>Giá mua (VNĐ)</label>
              <span className={hintClass}>Giá trị tài sản lúc nhập</span>
              <input
                type="number"
                min="0"
                step="1000"
                className={`${inputClass} mt-1.5`}
                placeholder="VD: 45000000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>

          {/* Ghi chú cập nhật */}
          <div>
            <label className={labelClass}>Ghi chú cập nhật</label>
            <span className={hintClass}>Lý do chỉnh sửa (sẽ lưu vào lịch sử vòng đời máy)</span>
            <textarea
              rows={2}
              className={`${inputClass} mt-1.5 resize-none`}
              placeholder="VD: Thay vị trí sang Tủ B, bảo dưỡng định kỳ lens..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {showLocationManager && (
        <ManageLocationsDialog
          onClose={() => setShowLocationManager(false)}
          onChanged={() => fetchLocations().then(setLocations)}
        />
      )}
    </div>
  );
}
