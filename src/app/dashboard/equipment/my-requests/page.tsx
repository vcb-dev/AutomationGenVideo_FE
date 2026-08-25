'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BorrowRequest, cancelRequest, fetchMyRequests } from '@/lib/equipment/request-api';
import { StatusPill } from '@/components/equipment/StatusPill';

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

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'ON_LOAN', label: 'Đang mượn' },
  { value: 'CLOSED', label: 'Đã hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyRequests();
      setRequests(data);
    } catch {
      setError('Không thể tải danh sách phiếu mượn của bạn.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRequests = useMemo(() => {
    if (filter === 'ALL') return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const handleCancel = async () => {
    if (!cancellingId) return;
    setActionLoading(true);
    setError('');
    try {
      await cancelRequest(cancellingId, cancelReason.trim() || undefined);
      setCancellingId(null);
      setCancelReason('');
      await load();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không thể hủy phiếu mượn.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>📋</span> Phiếu mượn của tôi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Theo dõi tiến độ phê duyệt, trạng thái thiết bị và quản lý các yêu cầu mượn máy của bạn.
          </p>
        </div>
        <Link
          href="/dashboard/equipment/new-request"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
        >
          <span>+</span> Tạo phiếu mượn mới
        </Link>
      </header>

      {/* FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/[0.08]">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors',
              filter === tab.value
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
          <p className="text-sm">Đang tải phiếu mượn của bạn…</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className={cn(cardClass, 'p-12 text-center text-slate-500')}>
          <p className="text-base font-medium">Chưa có phiếu mượn nào trong danh mục này.</p>
          <p className="mt-1 text-xs text-slate-400">
            Bạn có thể bấm &quot;Tạo phiếu mượn mới&quot; để đăng ký mượn thiết bị đi quay/chụp.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((req) => {
            const canCancel = ['PENDING_APPROVAL', 'APPROVED', 'PREPARING'].includes(req.status);
            const totalItems = req.lines.reduce((sum, l) => sum + l.quantity, 0);

            return (
              <div
                key={req.id}
                className={cn(
                  cardClass,
                  'p-5 transition-all hover:shadow-md dark:hover:border-white/[0.14]',
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-white/[0.06]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">
                        {req.request_code}
                      </span>
                      <StatusPill status={req.status} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {req.project}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {canCancel && (
                      <button
                        onClick={() => {
                          setCancellingId(req.id);
                          setCancelReason('');
                        }}
                        className="rounded-xl border border-red-200 bg-red-50/60 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 transition-colors"
                      >
                        Hủy phiếu
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-slate-400">
                      Địa điểm tác nghiệp
                    </span>
                    <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                      📍 {req.place}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase font-semibold text-slate-400">
                      Thời gian mượn
                    </span>
                    <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                      🕒 {fmt(req.from_time)} → {fmt(req.to_time)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase font-semibold text-slate-400">
                      Bộ phận & Số lượng
                    </span>
                    <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                      🏢 {req.department?.name} ({totalItems} thiết bị)
                    </p>
                  </div>
                </div>

                {/* DANH SÁCH THIẾT BỊ TRONG PHIẾU */}
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Thiết bị đăng ký:
                  </span>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {req.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs dark:border-white/[0.06] dark:bg-slate-900/60"
                      >
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {line.model?.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                            SL: {line.quantity}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({line.status === 'RESERVED' ? 'Đã giữ chỗ' : line.status === 'ALLOCATED' ? 'Đã gán máy' : line.status})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TIẾN ĐỘ PHÊ DUYỆT */}
                {req.approvals && req.approvals.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500">
                    <span className="font-semibold">Lịch sử duyệt:</span>
                    {req.approvals.map((app) => (
                      <span
                        key={app.id}
                        className={cn(
                          'rounded-lg px-2.5 py-1 font-medium',
                          app.decision === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
                        )}
                      >
                        Cấp {app.level}: {app.decision === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                        {app.reason ? ` (${app.reason})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL XÁC NHẬN HỦY PHIẾU */}
      {cancellingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setCancellingId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/[0.1] dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Xác nhận hủy phiếu mượn?
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hệ thống sẽ lập tức giải phóng các máy đã giữ chỗ để người khác có thể đăng ký mượn.
            </p>

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lý do hủy (không bắt buộc)
              </span>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Hoãn lịch quay, đổi sang ngày khác..."
              />
            </label>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancellingId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancel}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'Đang hủy…' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
