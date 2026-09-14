'use client';

/**
 * Nhật ký toàn bộ lượt mượn của kho.
 *
 * Hỗ trợ 2 chế độ xem:
 *   1. Theo từng thiết bị (chi tiết từng máy đã giao/nhận)
 *   2. Thống kê theo phiếu mượn (tổng hợp theo từng phiếu mượn REQ-...)
 *
 * Kèm ô tìm kiếm thông minh "Tất cả chỉ tiêu" + Bộ lọc trạng thái + Khoảng ngày.
 */

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { borrowHistoryLabel } from '@/lib/equipment/borrow-history-label';
import { buildBorrowLogQuery } from '@/lib/equipment/borrow-log-query';
import {
  cancelRequest,
  fetchBorrowHistoryLog,
  fetchRequests,
  type BorrowLogRow,
  type BorrowRequest,
} from '@/lib/equipment/request-api';
import { apiErrorMessage } from '@/lib/equipment/api-error';
import { DatePicker } from '@/components/ui/DatePicker';
import { BorrowPrintModal } from '@/components/equipment/BorrowPrintModal';
import { useAuthStore } from '@/store/auth-store';
import { canManageCatalog } from '@/lib/equipment/catalog-permissions';
import {
  HOLDING_STATUSES,
  REQUEST_STATUS_FILTER_OPTIONS,
  canCancelRequest,
  requestStatusBadge,
  type RequestStatusTone,
} from '@/lib/equipment/request-status';

const cardClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm ' +
  'dark:border-white/[0.08] dark:bg-[#141821] dark:shadow-none';

const TONE_CLASS: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  busy: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  maint: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20',
  bad: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
  wait: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/[0.1]',
};

const ASSET_STATUS_OPTIONS = [
  { value: '', label: '⚡ Tất cả trạng thái' },
  { value: 'HOLDING', label: 'Đang mượn' },
  { value: 'OVERDUE', label: 'Quá hạn' },
  { value: 'RETURNED', label: 'Đã trả' },
];

const REQUEST_STATUS_OPTIONS = REQUEST_STATUS_FILTER_OPTIONS;

/** Tông màu cho từng trạng thái phiếu. Nhãn và danh sách trạng thái nằm ở `request-status.ts`. */
const REQUEST_TONE_CLASS: Record<RequestStatusTone, string> = {
  draft:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/[0.1]',
  pending:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
  approved:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  preparing:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20',
  onLoan:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  partial:
    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20',
  closed:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/[0.1]',
  rejected:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
  cancelled:
    'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:border-white/[0.1]',
};

const inputClass =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 ' +
  'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.08] dark:bg-[#0f131a] dark:text-slate-100';

const fmt = (value: string | null | Date) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

function BorrowHistoryLogPageInner() {
  const searchParams = useSearchParams();
  const createdCode = searchParams?.get('created');
  const user = useAuthStore((s) => s.user);
  const isManager = canManageCatalog(user?.roles, user?.team);

  // Chế độ xem: Với Member thì luôn là 'REQUEST' (Phiếu mượn của tôi); Quản lý kho có thêm tab 'ASSET'
  const [viewMode, setViewMode] = useState<'ASSET' | 'REQUEST'>(isManager ? 'ASSET' : 'REQUEST');

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // Dữ liệu lượt mượn theo thiết bị
  const [assetRows, setAssetRows] = useState<BorrowLogRow[]>([]);
  const [totalAssetRows, setTotalAssetRows] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Dữ liệu phiếu mượn
  const [requests, setRequests] = useState<BorrowRequest[]>([]);

  // Trạng thái tải
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal chi tiết phiếu & In phiếu
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [printingRequest, setPrintingRequest] = useState<BorrowRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Load dữ liệu
  const load = useCallback(() => {
    setLoading(true);
    setError('');

    // Luôn tải danh sách phiếu để có số liệu thống kê toàn diện (BE tự lọc owner_id cho Member)
    fetchRequests()
      .then(setRequests)
      .catch(() => {});

    if (isManager && viewMode === 'ASSET') {
      fetchBorrowHistoryLog(buildBorrowLogQuery({ status, from, to, page }) as never)
        .then((res) => {
          setAssetRows(res.rows);
          setTotalAssetRows(res.total);
          setPageSize(res.pageSize);
        })
        .catch((e: unknown) =>
          setError(
            (e as { response?: { status?: number } })?.response?.status === 403
              ? 'Mục này chỉ dành cho quản trị viên và Leader Media.'
              : 'Không đọc được nhật ký mượn.',
          ),
        )
        .finally(() => setLoading(false));
    } else {
      fetchRequests(status || undefined)
        .then((data) => {
          setRequests(data);
        })
        .catch((e: unknown) =>
          setError(
            (e as { response?: { status?: number } })?.response?.status === 403
              ? 'Mục này chỉ dành cho quản trị viên và Leader Media.'
              : 'Không đọc được danh sách phiếu mượn.',
          ),
        )
        .finally(() => setLoading(false));
    }
  }, [isManager, viewMode, status, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (request: BorrowRequest) => {
    setCancelling(true);
    setError('');
    try {
      await cancelRequest(request.id);
      setSelectedRequest(null);
      load();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Không huỷ được phiếu.'));
    } finally {
      setCancelling(false);
    }
  };

  // Reset page khi thay đổi filter
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery || status || from || to);

  // Lọc tìm kiếm đa năng trên tập dữ liệu ASSET
  const filteredAssetRows = useMemo(() => {
    if (!searchQuery.trim()) return assetRows;
    const q = searchQuery.trim().toLowerCase();
    return assetRows.filter(
      (r) =>
        r.assetCode.toLowerCase().includes(q) ||
        (r.borrowerName && r.borrowerName.toLowerCase().includes(q)) ||
        (r.project && r.project.toLowerCase().includes(q)) ||
        r.status.toLowerCase().includes(q),
    );
  }, [assetRows, searchQuery]);

  // Lọc tìm kiếm đa năng và khoảng ngày trên tập dữ liệu REQUEST
  const filteredRequests = useMemo(() => {
    let result = requests;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) => {
        const models = r.lines?.map((l) => l.model.name).join(' ') || '';
        const dept = r.department?.name || '';
        const owner = r.owner_name || '';
        return (
          r.request_code.toLowerCase().includes(q) ||
          r.project.toLowerCase().includes(q) ||
          r.place.toLowerCase().includes(q) ||
          dept.toLowerCase().includes(q) ||
          owner.toLowerCase().includes(q) ||
          models.toLowerCase().includes(q)
        );
      });
    }
    if (from) {
      const fromDate = new Date(from).getTime();
      result = result.filter((r) => new Date(r.from_time).getTime() >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      const toTime = toDate.getTime();
      result = result.filter((r) => new Date(r.from_time).getTime() <= toTime);
    }
    return result;
  }, [requests, searchQuery, from, to]);

  // Thống kê nhanh tổng quan toàn hệ thống
  const stats = useMemo(() => {
    const totalRequests = requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING_APPROVAL').length;
    const onLoan = requests.filter((r) => HOLDING_STATUSES.includes(r.status)).length;
    const overdue = requests.filter(
      (r) => HOLDING_STATUSES.includes(r.status) && new Date(r.to_time) < new Date(),
    ).length;
    const completed = requests.filter((r) => r.status === 'CLOSED').length;
    const rejected = requests.filter(
      (r) => r.status === 'REJECTED' || r.status === 'CANCELLED',
    ).length;

    return {
      totalRequests,
      pending,
      onLoan,
      overdue,
      completed,
      rejected,
      assetTotal: totalAssetRows,
      assetHolding: assetRows.filter((r) => r.status === 'HOLDING').length,
      assetOverdue: assetRows.filter((r) => r.status === 'OVERDUE').length,
      assetReturned: assetRows.filter((r) => r.status === 'RETURNED').length,
    };
  }, [requests, totalAssetRows, assetRows]);

  const totalPages = Math.max(1, Math.ceil(totalAssetRows / pageSize));

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 dark:bg-[#0b0e13]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/equipment"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              ← Quay lại danh sách kho
            </Link>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {isManager ? 'Nhật ký mượn thiết bị' : 'Phiếu mượn & Lịch sử của tôi'}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isManager
                ? 'Thống kê toàn bộ các trạng thái: Chờ duyệt, Đang mượn, Quá hạn, Đã hoàn tất và Bị từ chối.'
                : 'Xem danh sách các phiếu mượn bạn đã tạo, tiến độ duyệt và lịch sử mượn trả.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {isManager && (
              <div className="inline-flex rounded-xl bg-slate-200/70 p-1 dark:bg-white/[0.06]">
                <button
                  onClick={() => {
                    setViewMode('ASSET');
                    setStatus('');
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                    viewMode === 'ASSET'
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                  )}
                >
                  <span>📦</span>
                  Theo từng thiết bị ({stats.assetTotal} lượt)
                </button>
                <button
                  onClick={() => {
                    setViewMode('REQUEST');
                    setStatus('');
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                    viewMode === 'REQUEST'
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                  )}
                >
                  <span>📑</span>
                  Thống kê theo phiếu ({stats.totalRequests} phiếu)
                </button>
              </div>
            )}

            <Link
              href="/dashboard/equipment/new-request"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            >
              <span>+</span> Tạo phiếu mới
            </Link>
          </div>
        </div>

        {/* THÔNG BÁO TẠO PHIẾU THÀNH CÔNG NẾU CÓ */}
        {createdCode && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🎉</span>
              <div>
                <span className="font-bold">Đã tạo thành công phiếu {createdCode}!</span>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Phiếu đang ở trạng thái <strong className="font-semibold">Chờ duyệt</strong>. Bạn có thể theo dõi tiến độ duyệt và kết quả ngay tại danh sách bên dưới.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* THẺ THỐNG KÊ TOÀN DIỆN MỌI TRẠNG THÁI */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className={cn(cardClass, 'p-3')}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Tổng số phiếu
            </span>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {stats.totalRequests}
            </div>
          </div>
          <div className={cn(cardClass, 'p-3 border-l-4 border-l-amber-500')}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Chờ duyệt
            </span>
            <div className="mt-1 text-xl font-black text-amber-600 dark:text-amber-400">
              {stats.pending}
            </div>
          </div>
          <div className={cn(cardClass, 'p-3 border-l-4 border-l-blue-500')}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Đang mượn
            </span>
            <div className="mt-1 text-xl font-black text-blue-600 dark:text-blue-400">
              {stats.onLoan}
            </div>
          </div>
          <div className={cn(cardClass, 'p-3 border-l-4 border-l-red-500')}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Quá hạn trả
            </span>
            <div className="mt-1 text-xl font-black text-red-600 dark:text-red-400">
              {stats.overdue}
            </div>
          </div>
          <div className={cn(cardClass, 'p-3 border-l-4 border-l-emerald-500')}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Đã hoàn tất
            </span>
            <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.completed}
            </div>
          </div>
          <div className={cn(cardClass, 'p-3 border-l-4 border-l-slate-400')}>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Từ chối / Huỷ
            </span>
            <div className="mt-1 text-xl font-black text-slate-500 dark:text-slate-400">
              {stats.rejected}
            </div>
          </div>
        </div>

        {/* THANH TÌM KIẾM VÀ BỘ LỌC TỔNG HỢP */}
        <section className={cn(cardClass, 'mt-4 p-3.5 sm:p-4')}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Ô TÌM KIẾM TẤT CẢ CHỈ TIÊU */}
            <div className="lg:col-span-1">
              <input
                className={cn(inputClass, 'w-full')}
                placeholder="🔍 Tìm theo tất cả chỉ tiêu…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* BỘ LỌC TRẠNG THÁI */}
            <div>
              <select
                className={cn(inputClass, 'w-full')}
                value={status}
                onChange={(e) => changeFilter(() => setStatus(e.target.value))}
              >
                {(viewMode === 'ASSET' ? ASSET_STATUS_OPTIONS : REQUEST_STATUS_OPTIONS).map(
                  (o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* KHOẢNG NGÀY: TỪ */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                Từ
              </span>
              <div className="w-full">
                <DatePicker value={from} onChange={(v) => changeFilter(() => setFrom(v))} />
              </div>
            </div>

            {/* KHOẢNG NGÀY: ĐẾN */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                Đến
              </span>
              <div className="w-full">
                <DatePicker value={to} onChange={(v) => changeFilter(() => setTo(v))} />
              </div>
            </div>
          </div>

          {/* DÒNG HIỂN THỊ KẾT QUẢ VÀ NÚT XOÁ LỌC */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-white/[0.06]">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Đang lọc theo:{' '}
                {[
                  searchQuery ? `Từ khóa "${searchQuery}"` : '',
                  status ? `Trạng thái` : '',
                  from ? `Từ ${from}` : '',
                  to ? `Đến ${to}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                ✕ Xoá bộ lọc
              </button>
            </div>
          )}
        </section>

        {/* NỘI DUNG BẢNG DỮ LIỆU */}
        <section className={cn(cardClass, 'mt-4 overflow-hidden')}>
          {loading && (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
              <p className="text-sm">Đang tải nhật ký…</p>
            </div>
          )}

          {!loading && error && (
            <p className="p-8 text-center text-sm font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* CHẾ ĐỘ 1: XEM THEO TỪNG THIẾT BỊ                              */}
          {/* ───────────────────────────────────────────────────────────── */}
          {!loading && !error && viewMode === 'ASSET' && (
            <>
              {filteredAssetRows.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <p className="text-sm">Không có lượt mượn nào khớp bộ lọc.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02]">
                        <th className="px-4 py-3 font-semibold">Thiết bị</th>
                        <th className="px-4 py-3 font-semibold">Người mượn</th>
                        <th className="px-4 py-3 font-semibold">Dự án</th>
                        <th className="px-4 py-3 font-semibold">Ngày giao</th>
                        <th className="px-4 py-3 font-semibold">Hạn trả / Ngày trả</th>
                        <th className="px-4 py-3 font-semibold">Thời gian giữ / Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                      {filteredAssetRows.map((row, index) => {
                        const label = borrowHistoryLabel(row);
                        return (
                          <tr
                            key={`${row.assetId}-${row.handedOverAt}-${index}`}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3 font-mono font-bold">
                              <Link
                                href={`/dashboard/equipment/assets/${encodeURIComponent(row.assetCode)}`}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {row.assetCode}
                              </Link>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {row.borrowerName ?? 'Không rõ'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {row.project ?? '—'}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                              {fmt(row.handedOverAt)}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                              {row.returnedAt ? (
                                <span>{fmt(row.returnedAt)}</span>
                              ) : row.dueAt ? (
                                <span className="text-slate-500">Hạn: {fmt(row.dueAt)}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold',
                                  TONE_CLASS[label.tone] ?? TONE_CLASS.wait,
                                )}
                              >
                                {label.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* PHÂN TRANG CHO BẢNG THEO MÁY */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 p-3 sm:px-4 dark:border-white/[0.06]">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Hiển thị {filteredAssetRows.length} / {totalAssetRows} lượt
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.08] dark:text-slate-300"
                        >
                          ← Trang trước
                        </button>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {page} / {totalPages}
                        </span>
                        <button
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.08] dark:text-slate-300"
                        >
                          Trang sau →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* CHẾ ĐỘ 2: THỐNG KÊ THEO PHIẾU MƯỢN                             */}
          {/* ───────────────────────────────────────────────────────────── */}
          {!loading && !error && viewMode === 'REQUEST' && (
            <>
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <p className="text-sm">Không có phiếu mượn nào khớp bộ lọc.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02]">
                        <th className="px-4 py-3 font-semibold">Mã phiếu</th>
                        <th className="px-4 py-3 font-semibold">Người mượn & Bộ phận</th>
                        <th className="px-4 py-3 font-semibold">Dự án & Địa điểm</th>
                        <th className="px-4 py-3 font-semibold">Thiết bị mượn</th>
                        <th className="px-4 py-3 font-semibold">Thời gian mượn</th>
                        <th className="px-4 py-3 font-semibold">Trạng thái phiếu</th>
                        <th className="px-4 py-3 font-semibold text-right">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                      {filteredRequests.map((req) => {
                        const statusBadge = requestStatusBadge(req.status);
                        return (
                          <tr
                            key={req.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                              {req.request_code}
                            </td>
                            <td className="px-4 py-3">
                              <span className="block font-semibold text-slate-900 dark:text-white">
                                {req.owner_name || '—'}
                              </span>
                              <span className="text-xs text-slate-400">
                                {req.department?.name || 'Chưa gán bộ phận'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="block font-medium text-slate-800 dark:text-slate-200">
                                {req.project}
                              </span>
                              <span className="text-xs text-slate-400">
                                📍 {req.place || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {req.lines?.map((line) => (
                                  <span
                                    key={line.id}
                                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-white/[0.06] dark:text-slate-200"
                                  >
                                    {line.model.name} ×{line.quantity}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                              <div>{fmt(req.from_time)}</div>
                              <div className="text-slate-400">đến {fmt(req.to_time)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold',
                                  REQUEST_TONE_CLASS[statusBadge.tone],
                                )}
                              >
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setSelectedRequest(req)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:border-white/[0.1] dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                              >
                                Xem
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        {/* MODAL XEM NHANH CHI TIẾT PHIẾU MƯỢN */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.06]">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Chi tiết phiếu mượn: {selectedRequest.request_code}
                </h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-xs text-slate-400">Người mượn</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedRequest.owner_name || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400">Bộ phận</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedRequest.department?.name || '—'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-xs text-slate-400">Dự án & Địa điểm</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedRequest.project} ({selectedRequest.place})
                  </span>
                </div>

                <div>
                  <span className="block text-xs text-slate-400">Thời gian mượn</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {fmt(selectedRequest.from_time)} → {fmt(selectedRequest.to_time)}
                  </span>
                </div>

                <div>
                  <span className="block text-xs text-slate-400 mb-1.5">Danh sách thiết bị</span>
                  <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                    {selectedRequest.lines?.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          • {line.model.name}
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          x{line.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">Trạng thái</span>
                  <span
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs font-semibold',
                      REQUEST_TONE_CLASS[requestStatusBadge(selectedRequest.status).tone],
                    )}
                  >
                    {requestStatusBadge(selectedRequest.status).label}
                  </span>
                </div>
              </div>

              {canCancelRequest(selectedRequest, {
                id: user?.id,
                isCatalogManager: isManager,
              }) && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <p className="text-xs text-amber-900 dark:text-amber-200">
                    Không cần mượn nữa? Huỷ phiếu để nhả giữ chỗ ngay cho người khác.
                  </p>
                  <button
                    onClick={() => cancel(selectedRequest)}
                    disabled={cancelling}
                    className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-transparent"
                  >
                    {cancelling ? 'Đang huỷ…' : 'Huỷ phiếu này'}
                  </button>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={() => {
                    const req = selectedRequest;
                    setSelectedRequest(null);
                    setPrintingRequest(req);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                >
                  <span>🖨️</span>
                  In phiếu mượn (A4 / Mọi khổ)
                </button>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL IN PHIẾU BÀN GIAO TOÀN DIỆN */}
        <BorrowPrintModal
          open={Boolean(printingRequest)}
          onClose={() => setPrintingRequest(null)}
          request={printingRequest}
        />
      </div>
    </div>
  );
}

export default function BorrowHistoryLogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải…</div>}>
      <BorrowHistoryLogPageInner />
    </Suspense>
  );
}
