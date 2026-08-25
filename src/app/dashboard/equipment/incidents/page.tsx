'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  IncidentItem,
  MaintenanceItem,
  fetchIncidents,
  fetchMaintenances,
  finishMaintenance,
  resolveIncident,
} from '@/lib/equipment/request-api';
import { photoSrc } from '@/lib/equipment/api';

const cardClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const INCIDENT_KIND_LABEL: Record<string, { label: string; tone: string }> = {
  CONDITION_WORSENED: { label: 'Tình trạng xấu đi / Trầy xước', tone: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
  MISSING_ACCESSORY: { label: 'Thiếu phụ kiện lúc trả', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  OVERDUE: { label: 'Trả máy quá hạn', tone: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' },
};

export default function IncidentsPage() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'maintenance'>('incidents');
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal Giải quyết sự cố
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  // Modal Hoàn tất bảo trì
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [finishCost, setFinishCost] = useState('');
  const [finishCondition, setFinishCondition] = useState('GOOD');
  const [finishNote, setFinishNote] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [incList, mainList] = await Promise.all([
        fetchIncidents(),
        fetchMaintenances(),
      ]);
      setIncidents(incList);
      setMaintenances(mainList);
    } catch {
      setError('Không thể tải danh sách sự cố và bảo trì.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async () => {
    if (!resolvingId) return;
    setActionLoading(true);
    setError('');
    try {
      await resolveIncident(resolvingId, resolveNote.trim() || undefined);
      setResolvingId(null);
      setResolveNote('');
      await loadData();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không thể giải quyết sự cố.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishMaintenance = async () => {
    if (!finishingId) return;
    setActionLoading(true);
    setError('');
    try {
      await finishMaintenance(finishingId, {
        cost: finishCost ? Number(finishCost) : undefined,
        condition: finishCondition,
        note: finishNote.trim() || undefined,
      });
      setFinishingId(null);
      setFinishCost('');
      setFinishCondition('GOOD');
      setFinishNote('');
      await loadData();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không thể hoàn tất bảo trì.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED');
  const activeMaintenances = maintenances.filter((m) => m.to_time === null);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>🛡️</span> Quản lý Sự cố & Bảo trì thiết bị
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Theo dõi hư hỏng, thiếu phụ kiện sau khi nhận trả và quản lý các thiết bị đang đi bảo hành/sửa chữa.
          </p>
        </div>
        <Link
          href="/dashboard/equipment"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.04]"
        >
          ← Quay lại Kho thiết bị
        </Link>
      </header>

      {/* TABS */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 dark:border-white/[0.08]">
        <button
          onClick={() => setActiveTab('incidents')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
            activeTab === 'incidents'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]',
          )}
        >
          <span>Biên bản sự cố</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
            {openIncidents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
            activeTab === 'maintenance'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]',
          )}
        >
          <span>Đang bảo trì / Sửa chữa</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
            {activeMaintenances.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
          <p className="text-sm">Đang tải dữ liệu…</p>
        </div>
      ) : activeTab === 'incidents' ? (
        /* TAB 1: DANH SÁCH SỰ CỐ */
        incidents.length === 0 ? (
          <div className={cn(cardClass, 'p-12 text-center text-slate-500')}>
            <p className="text-base font-medium">Hiện không có sự cố nào cần xử lý.</p>
            <p className="mt-1 text-xs text-slate-400">
              Các sự cố sẽ tự động phát sinh khi nhận trả máy bị trầy xước hoặc thiếu phụ kiện.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {incidents.map((inc) => {
              const kind = INCIDENT_KIND_LABEL[inc.kind] || { label: inc.kind, tone: 'bg-slate-100 text-slate-700' };
              const isResolved = inc.status === 'RESOLVED';

              return (
                <div
                  key={inc.id}
                  className={cn(
                    cardClass,
                    'p-5 transition-all',
                    isResolved ? 'opacity-70 bg-slate-50/50 dark:bg-white/[0.01]' : 'border-amber-200 dark:border-amber-500/20',
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', kind.tone)}>
                          {kind.label}
                        </span>
                        <span
                          className={cn(
                            'rounded-lg px-2 py-0.5 text-xs font-semibold',
                            isResolved
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
                          )}
                        >
                          {isResolved ? '✓ Đã giải quyết' : '⚡ Đang mở'}
                        </span>
                        <span className="text-xs text-slate-400">Tạo lúc: {fmt(inc.created_at)}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {inc.description}
                      </h3>
                    </div>

                    {!isResolved && (
                      <button
                        onClick={() => {
                          setResolvingId(inc.id);
                          setResolveNote('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                      >
                        ✓ Giải quyết sự cố
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="text-slate-400">Thiết bị liên quan:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {inc.asset?.model?.name} ({inc.asset?.asset_code}) — SN: {inc.asset?.serial_number}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Hành động khắc phục:</span>
                      <p className="text-slate-600 dark:text-slate-400">
                        Kiểm tra lại phụ kiện, thỏa thuận bồi thường hoặc gửi thiết bị đi bảo trì sửa chữa.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* TAB 2: DANH SÁCH BẢO TRÌ */
        maintenances.length === 0 ? (
          <div className={cn(cardClass, 'p-12 text-center text-slate-500')}>
            <p className="text-base font-medium">Hiện không có máy nào đang bảo trì.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {maintenances.map((m) => {
              const isOpen = m.to_time === null;

              return (
                <div
                  key={m.id}
                  className={cn(
                    cardClass,
                    'p-5 transition-all',
                    isOpen ? 'border-blue-200 dark:border-blue-500/20' : 'opacity-70',
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-lg px-2.5 py-1 text-xs font-bold',
                            isOpen
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                          )}
                        >
                          {isOpen ? '🔧 Đang sửa chữa / Bảo trì' : '✓ Đã hoàn tất'}
                        </span>
                        <span className="text-xs text-slate-400">Từ: {fmt(m.from_time)}</span>
                        {m.to_time && <span className="text-xs text-slate-400">→ {fmt(m.to_time)}</span>}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        Lý do: {m.reason}
                      </h3>
                    </div>

                    {isOpen && (
                      <button
                        onClick={() => {
                          setFinishingId(m.id);
                          setFinishCost('');
                          setFinishCondition('GOOD');
                          setFinishNote('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        ✓ Nghiệm thu hoàn tất
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                    <div>
                      <span className="text-slate-400">Thiết bị:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {m.asset?.model?.name} ({m.asset?.asset_code})
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Vị trí lưu kho:</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {m.asset?.location?.name ?? 'Chưa xếp chỗ'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Chi phí sửa chữa:</span>
                      <p className="font-bold text-blue-600 dark:text-blue-400">
                        {m.cost ? `${Number(m.cost).toLocaleString('vi-VN')} đ` : 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MODAL GIẢI QUYẾT SỰ CỐ */}
      {resolvingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setResolvingId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/[0.1] dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Giải quyết biên bản sự cố
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ghi lại cách xử lý (đã thu hồi phụ kiện, người mượn đền bù hoặc đã sửa xong) để đóng biên bản.
            </p>

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ghi chú giải quyết
              </span>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                rows={3}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Ví dụ: Đã nhận lại nắp lens thất lạc; hoặc đã mua bù phụ kiện mới..."
              />
            </label>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleResolve}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'Đang lưu…' : 'Xác nhận đóng sự cố'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HOÀN TẤT BẢO TRÌ */}
      {finishingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setFinishingId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/[0.1] dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nghiệm thu hoàn tất bảo trì / sửa chữa
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Thiết bị sẽ được đưa trở lại trạng thái Sẵn sàng (AVAILABLE) để tiếp tục cho mượn.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tình trạng sau sửa chữa
                </span>
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                  value={finishCondition}
                  onChange={(e) => setFinishCondition(e.target.value)}
                >
                  <option value="GOOD">Tốt (Đã khôi phục hoàn hảo)</option>
                  <option value="USED">Có dấu hiệu sử dụng</option>
                  <option value="NEEDS_CHECK">Cần theo dõi thêm</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chi phí sửa chữa (VNĐ)
                </span>
                <input
                  type="number"
                  min={0}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                  value={finishCost}
                  onChange={(e) => setFinishCost(e.target.value)}
                  placeholder="Ví dụ: 1500000"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ghi chú kết quả sửa
                </span>
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                  rows={2}
                  value={finishNote}
                  onChange={(e) => setFinishNote(e.target.value)}
                  placeholder="Thay dây cáp, vệ sinh sensor chính hãng..."
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setFinishingId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleFinishMaintenance}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'Đang lưu…' : 'Xác nhận đưa về kho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
