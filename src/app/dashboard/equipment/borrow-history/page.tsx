'use client';

/**
 * Nhật ký toàn bộ lượt mượn của kho.
 *
 * Khác mục "Lịch sử mượn" ở màn chi tiết máy: bên kia trả lời "máy này từng ai mượn", trang này
 * nhìn ngang toàn kho để trả lời "ai đang giữ gì và có quá hạn không".
 *
 * Không tự kiểm quyền ở đây: BE chặn bằng `@Roles(LEADER, MANAGER, ADMIN)` và trả 403. Kiểm hai
 * nơi thì sớm muộn lệch nhau, mà lệch ở đây nghĩa là lộ thói quen mượn của từng người.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { borrowHistoryLabel } from '@/lib/equipment/borrow-history-label';
import { buildBorrowLogQuery } from '@/lib/equipment/borrow-log-query';
import { fetchBorrowHistoryLog, type BorrowLogRow } from '@/lib/equipment/request-api';
import { DatePicker } from '@/components/ui/DatePicker';

const cardClass =
  'rounded-[18px] border border-[#E8EBEF] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.04)] ' +
  'dark:border-white/[0.07] dark:bg-[#141821] dark:shadow-none';

const TONE_CLASS: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  busy: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  maint: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
  bad: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  wait: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'HOLDING', label: 'Đang giữ' },
  { value: 'OVERDUE', label: 'Quá hạn' },
  { value: 'RETURNED', label: 'Đã trả' },
];

const inputClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 ' +
  'focus:border-indigo-400 focus:outline-none dark:border-white/[0.08] dark:bg-[#0f131a] dark:text-slate-100';

const fmt = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

export default function BorrowHistoryLogPage() {
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<BorrowLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchBorrowHistoryLog(buildBorrowLogQuery({ status, from, to, page }) as never)
      .then((res) => {
        setRows(res.rows);
        setTotal(res.total);
        setPageSize(res.pageSize);
      })
      .catch((e: unknown) =>
        setError(
          (e as { response?: { status?: number } })?.response?.status === 403
            ? 'Mục này chỉ dành cho quản trị viên và người quản lý kho.'
            : 'Không đọc được nhật ký mượn.',
        ),
      )
      .finally(() => setLoading(false));
  }, [status, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Đổi bộ lọc phải về trang 1: đang ở trang 5 của "tất cả" mà lọc còn 3 dòng thì trang 5 rỗng trơn.
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-[#0b0e13]">
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <Link href="/dashboard/equipment" className="text-xs text-slate-500 hover:text-slate-700">
          ← Danh sách kho
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Nhật ký mượn</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Toàn bộ lượt giao và nhận lại của kho. Thời gian giữ tính theo mốc thực tế, đối chiếu hạn
          trên phiếu.
        </p>

        <section className={cn(cardClass, 'mt-5 p-4')}>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => changeFilter(() => setStatus(e.target.value))}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              Từ
              <DatePicker value={from} onChange={(v) => changeFilter(() => setFrom(v))} />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              Đến
              <DatePicker value={to} onChange={(v) => changeFilter(() => setTo(v))} />
            </div>
            {(status || from || to) && (
              <button
                onClick={() => changeFilter(() => { setStatus(''); setFrom(''); setTo(''); })}
                className="text-sm text-indigo-600 hover:underline"
              >
                Xoá lọc
              </button>
            )}
            <span className="ml-auto text-sm text-slate-500">{total} lượt</span>
          </div>
        </section>

        <section className={cn(cardClass, 'mt-4 p-5')}>
          {loading && <p className="text-sm text-slate-500">Đang tải…</p>}
          {!loading && error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Không có lượt mượn nào khớp bộ lọc.
            </p>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 font-medium">Thiết bị</th>
                    <th className="pb-2 font-medium">Người mượn</th>
                    <th className="pb-2 font-medium">Dự án</th>
                    <th className="pb-2 font-medium">Giao</th>
                    <th className="pb-2 font-medium">Trả</th>
                    <th className="pb-2 font-medium">Thời gian giữ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const label = borrowHistoryLabel(row);
                    return (
                      <tr
                        key={`${row.assetId}-${row.handedOverAt}-${index}`}
                        className="border-t border-slate-100 dark:border-white/[0.06]"
                      >
                        <td className="py-2.5">
                          <Link
                            href={`/dashboard/equipment/assets/${row.assetCode}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {row.assetCode}
                          </Link>
                        </td>
                        <td className="py-2.5 text-slate-900 dark:text-white">
                          {row.borrowerName ?? 'Không rõ'}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">
                          {row.project ?? '—'}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">
                          {fmt(row.handedOverAt)}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">
                          {fmt(row.returnedAt)}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2.5 py-1 text-xs font-medium',
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

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end gap-3 text-sm">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/[0.08]"
                  >
                    Trước
                  </button>
                  <span className="text-slate-500">
                    Trang {page}/{totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/[0.08]"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
