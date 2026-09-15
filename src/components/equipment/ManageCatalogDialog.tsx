'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  EquipmentCategory,
  EquipmentModel,
  deleteCategory,
  deleteModel,
  fetchCategories,
  fetchModels,
} from '@/lib/equipment/api';
import { formatCategoryName } from '@/components/equipment/AddAssetDialog';
import { canDeleteCatalog } from '@/lib/equipment/catalog-permissions';
import { useAuthStore } from '@/store/auth-store';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Trash2, Folder, Layers, Search, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface ManageCatalogDialogProps {
  onClose: () => void;
  onChanged?: () => void;
}

export function ManageCatalogDialog({ onClose, onChanged }: ManageCatalogDialogProps) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = canDeleteCatalog(user?.roles);

  const [activeTab, setActiveTab] = useState<'categories' | 'models'>('models');
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm modal state
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    type: 'category' | 'model';
    id: string;
    name: string;
    assetCount?: number;
  }>({
    isOpen: false,
    type: 'model',
    id: '',
    name: '',
  });
  const [deleting, setDeleting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchModels()])
      .then(([c, m]) => {
        setCategories(c);
        setModels(m);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Lỗi khi tải dữ liệu danh mục & model.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  // Đếm số máy hoạt động theo từng danh mục
  const catAssetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of models) {
      const catId = m.category?.id;
      if (catId) {
        counts[catId] = (counts[catId] || 0) + (m._count?.assets ?? 0);
      }
    }
    return counts;
  }, [models]);

  // Lọc models
  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return models.filter((m) => {
      const matchCat = !selectedCatFilter || m.category?.id === selectedCatFilter;
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(q)) ||
        (m.category?.name && m.category.name.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [models, selectedCatFilter, searchQuery]);

  // Lọc categories
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        formatCategoryName(c).toLowerCase().includes(q),
    );
  }, [categories, searchQuery]);

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'model') {
        await deleteModel(confirmDelete.id);
        toast.success(`Đã xóa model "${confirmDelete.name}"`);
      } else {
        await deleteCategory(confirmDelete.id);
        toast.success(`Đã xóa danh mục "${confirmDelete.name}"`);
      }
      setConfirmDelete({ isOpen: false, type: 'model', id: '', name: '' });
      loadData();
      onChanged?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/[0.1] dark:bg-slate-900 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-white/[0.06] dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Quản lý Danh mục & Model thiết bị
                </h2>
                <p className="text-xs text-slate-400">
                  Xem danh sách, kiểm tra số máy trong kho và dọn dẹp các model/danh mục không dùng.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.08] dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* PERMISSION NOTICE */}
          {!isAdmin && (
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/80 px-5 py-2.5 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                Bạn đang xem ở chế độ đọc. Quyền xóa Danh mục và Model chỉ dành riêng cho <strong>Quản trị viên (Admin)</strong>.
              </span>
            </div>
          )}

          {/* TABS & SEARCH */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-4 bg-slate-50/50 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="flex rounded-xl bg-slate-200/70 p-1 dark:bg-white/[0.06] w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('models')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'models'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Model thiết bị ({models.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'categories'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Folder className="h-3.5 w-3.5" />
                Danh mục ({categories.length})
              </button>
            </div>

            <div className="flex flex-1 items-center gap-2 max-w-sm">
              {activeTab === 'models' && (
                <select
                  value={selectedCatFilter}
                  onChange={(e) => setSelectedCatFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-slate-200"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* CONTENT LIST */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                <span className="text-xs">Đang tải danh sách…</span>
              </div>
            ) : activeTab === 'models' ? (
              filteredModels.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không tìm thấy model nào phù hợp.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-white/[0.02]">
                  {filteredModels.map((m) => {
                    const count = m._count?.assets ?? 0;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <h4
                              className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-md"
                              title={m.name}
                            >
                              {m.name}
                            </h4>
                            {m.manufacturer && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                                {m.manufacturer}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>📁 {m.category?.name || 'Chưa phân loại'}</span>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                count > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {count} máy trong kho
                            </span>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="shrink-0">
                            {count === 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    isOpen: true,
                                    type: 'model',
                                    id: m.id,
                                    name: m.name,
                                    assetCount: 0,
                                  })
                                }
                                title="Xóa model này (0 máy)"
                                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 active:scale-95 transition-all dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Xóa
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title={`Model đang có ${count} máy trong kho. Vui lòng xóa hết máy trước khi xóa model.`}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-300 cursor-not-allowed dark:border-white/[0.06] dark:text-slate-600"
                              >
                                <Trash2 className="h-3.5 w-3.5 opacity-40" />
                                Còn máy
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredCategories.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Không tìm thấy danh mục nào phù hợp.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-white/[0.02]">
                {filteredCategories.map((c) => {
                  const count = catAssetCounts[c.id] || 0;
                  const isStandard = ['CAM', 'LEN', 'LIG', 'AUD', 'GIM', 'TRP'].includes(c.code);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {formatCategoryName(c)}
                          </h4>
                          <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md dark:bg-blue-500/10 dark:text-blue-400">
                            {c.code}
                          </span>
                          {isStandard && (
                            <span className="text-[10px] text-slate-400 italic">Mặc định</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Tổng số thiết bị trong danh mục:{' '}
                          <strong
                            className={
                              count > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {count} máy
                          </strong>
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="shrink-0">
                          {count === 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({
                                  isOpen: true,
                                  type: 'category',
                                  id: c.id,
                                  name: c.name,
                                  assetCount: 0,
                                })
                              }
                              title="Xóa danh mục này"
                              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 active:scale-95 transition-all dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title={`Danh mục đang có ${count} máy trong kho. Vui lòng xóa hết máy trước khi xóa danh mục.`}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-300 cursor-not-allowed dark:border-white/[0.06] dark:text-slate-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 opacity-40" />
                              Còn máy
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <AlertCircle className="h-4 w-4" />
              <span>Chỉ có thể xóa model/danh mục khi đã dọn hết thiết bị vật lý bên trong (0 máy).</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/[0.12] dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-white/[0.05]"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        isLoading={deleting}
        variant="danger"
        title={confirmDelete.type === 'model' ? 'Xóa Model thiết bị' : 'Xóa Danh mục thiết bị'}
        description={
          <div>
            <p>
              Bạn có chắc chắn muốn xóa {confirmDelete.type === 'model' ? 'model' : 'danh mục'}{' '}
              <strong className="text-slate-900 dark:text-white">&ldquo;{confirmDelete.name}&rdquo;</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Mục này sẽ được ẩn khỏi kho và không còn hiển thị trong các danh sách lựa chọn nhập kho nữa.
            </p>
          </div>
        }
        confirmText="Xóa vĩnh viễn"
        cancelText="Giữ lại"
      />
    </>
  );
}
