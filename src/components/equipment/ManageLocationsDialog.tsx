'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  StorageLocation,
  createLocation,
  deleteLocation,
  fetchLocations,
  updateLocation,
} from '@/lib/equipment/api';
import { MapPin, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';

interface ManageLocationsDialogProps {
  onClose: () => void;
  onChanged?: () => void;
}

export function ManageLocationsDialog({ onClose, onChanged }: ManageLocationsDialogProps) {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [updating, setUpdating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchLocations()
      .then((data) => {
        setLocations(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Lỗi khi tải danh sách vị trí kho');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      await createLocation({ name: newName.trim() });
      toast.success(`Đã thêm vị trí "${newName.trim()}"`);
      setNewName('');
      load();
      onChanged?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi tạo vị trí';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    setUpdating(true);
    try {
      await updateLocation(id, { name: editName.trim() });
      toast.success('Đã cập nhật tên vị trí');
      setEditingId(null);
      load();
      onChanged?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi cập nhật vị trí';
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vị trí "${name}"?`)) return;

    setDeletingId(id);
    try {
      await deleteLocation(id);
      toast.success(`Đã xóa vị trí "${name}"`);
      load();
      onChanged?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa vị trí này';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Quản lý vị trí kho
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thêm, sửa các tủ, kệ, ngăn chứa thiết bị trong kho
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
        <div className="p-6 space-y-5">
          {/* Add New Location Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="VD: Tủ 01 - Ngăn A, Kệ Lens Studio..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Thêm</span>
            </button>
          </form>

          {/* Locations List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-xs">Đang nạp danh sách vị trí…</p>
              </div>
            ) : locations.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">
                Chưa có vị trí nào. Hãy thêm vị trí kho đầu tiên ở trên.
              </p>
            ) : (
              locations.map((loc) => {
                const isEditing = editingId === loc.id;
                const count = (loc as any)._count?.assets ?? 0;

                return (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-white/[0.03] dark:border-white/[0.06] hover:border-slate-200 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 rounded-lg border border-blue-400 px-2.5 py-1 text-sm text-slate-900 bg-white outline-none dark:bg-slate-800 dark:text-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdate(loc.id)}
                          disabled={updating || !editName.trim()}
                          className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                            {loc.name}
                          </span>
                          {count > 0 && (
                            <span className="rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 border border-blue-100 dark:border-blue-800">
                              {count} thiết bị
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(loc.id);
                              setEditName(loc.name);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-white/[0.06] transition-colors"
                            title="Đổi tên vị trí"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(loc.id, loc.name)}
                            disabled={deletingId === loc.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-white/[0.06] transition-colors"
                            title="Xóa vị trí"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06] transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
