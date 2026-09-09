'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  BorrowRequest,
  approveRequest,
  fetchRequest,
  fetchRequests,
  rejectRequest,
} from '@/lib/equipment/request-api';
import { ApprovalOutcome, approvalOutcome } from '@/lib/equipment/approval-outcome';
import { StepBar } from '@/components/equipment/StepBar';
import { WorkflowSuccessModal } from '@/components/equipment/WorkflowSuccessModal';
import { RequireCatalogManager } from '@/components/equipment/RequireCatalogManager';
import { apiErrorMessage } from '@/lib/equipment/api-error';

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';
const keyClass = 'text-[11px] uppercase tracking-wide text-slate-400';
const valueClass = 'mt-0.5 text-sm text-slate-900 dark:text-white';
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

const formatTimeRange = (fromIso?: string | null, toIso?: string | null) => {
  if (!fromIso) return '—';
  const from = new Date(fromIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fromTime = `${pad(from.getHours())}:${pad(from.getMinutes())}`;
  const fromDate = `${pad(from.getDate())}/${pad(from.getMonth() + 1)}/${from.getFullYear()}`;

  if (!toIso) return `${fromTime} ${fromDate}`;
  const to = new Date(toIso);
  const toTime = `${pad(to.getHours())}:${pad(to.getMinutes())}`;
  const toDate = `${pad(to.getDate())}/${pad(to.getMonth() + 1)}/${to.getFullYear()}`;

  if (fromDate === toDate) {
    return `${fromTime} – ${toTime} · ${fromDate}`;
  }
  return `${fromTime} ${fromDate} → ${toTime} ${toDate}`;
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '—');

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'chờ duyệt',
  APPROVED: 'đã duyệt',
  REJECTED: 'từ chối',
  PREPARING: 'đang chuẩn bị',
  ON_LOAN: 'đang mượn',
  PARTIALLY_RETURNED: 'trả một phần',
  CLOSED: 'đã đóng',
  CANCELLED: 'đã huỷ',
  DRAFT: 'nháp',
};

function ApprovalsPageInner() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [current, setCurrent] = useState<BorrowRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<ApprovalOutcome | null>(null);

  const load = useCallback(async (keepId?: string) => {
    const list = await fetchRequests('PENDING_APPROVAL');
    setRequests(list);
    const target = keepId ? list.find((r) => r.id === keepId) : list[0];
    setCurrent(target ?? null);
  }, []);

  useEffect(() => {
    load()
      .catch((e: unknown) => setError(apiErrorMessage(e, 'Không đọc được danh sách phiếu.')))
      .finally(() => setLoading(false));
  }, [load]);

  const select = async (id: string) => {
    setReason('');
    setError('');
    // Kết quả của phiếu trước không được dính sang phiếu sau.
    setOutcome(null);
    // Gọi chi tiết riêng vì danh sách không kèm máy đã ghim ở từng dòng.
    setCurrent(await fetchRequest(id));
  };

  const decide = async (kind: 'approve' | 'reject') => {
    if (!current) return;
    if (kind === 'reject' && !reason.trim()) {
      setError('Phải nhập lý do khi từ chối.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const targetId = current.id;
      if (kind === 'approve') await approveRequest(targetId, reason.trim() || undefined);
      else await rejectRequest(targetId, reason.trim());
      setReason('');
      const refreshed = await fetchRequest(targetId);
      setOutcome(approvalOutcome(refreshed));
      await load();
    } catch (e: unknown) {
      setError(
        apiErrorMessage(e, 'Không ghi được quyết định.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const decided = current ? current.status !== 'PENDING_APPROVAL' : false;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Duyệt phiếu mượn</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Chỉ hiển thị các phiếu đang chờ duyệt. Sau khi duyệt, phiếu sẽ chuyển sang Bước 2 (Gán máy & In phiếu).
        </p>
      </header>

      <StepBar current="approvals" />

      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : requests.length === 0 ? (
        <div className={cn(cardClass, 'p-8 text-center')}>
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Hiện không có phiếu nào đang chờ duyệt
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Các phiếu đã duyệt được chuyển sang Bước 2 (Chuẩn bị & Bàn giao). Toàn bộ lịch sử các phiếu đã duyệt, từ chối hoặc đã huỷ được lưu đầy đủ trong mục Nhật ký mượn.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard/equipment/handover"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Sang Bước 2: Chuẩn bị & Bàn giao →
            </Link>
            <Link
              href="/dashboard/equipment/borrow-history"
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.12] dark:text-slate-300 dark:hover:bg-white/[0.05] transition-colors"
            >
              Xem Nhật ký mượn thiết bị
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <section className={cn(cardClass, 'self-start overflow-hidden')}>
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/[0.06]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Phiếu mượn</h2>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {pendingCount} chờ duyệt
              </span>
            </div>
            <ul>
              {requests.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => select(r.id)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left last:border-0 dark:border-white/[0.05]',
                      r.id === current?.id
                        ? 'bg-blue-50/70 shadow-[inset_3px_0_0_theme(colors.blue.600)] dark:bg-blue-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                        {r.request_code}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {r.project}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400 font-mono">
                        {formatTimeRange(r.from_time, r.to_time)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                        r.status === 'REJECTED'
                          ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                          : r.status === 'PENDING_APPROVAL'
                            ? r.required_levels === 2
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                      )}
                    >
                      {r.status === 'PENDING_APPROVAL'
                        ? `${r.approved_levels}/${r.required_levels} cấp`
                        : STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {current && (
            <section className={cardClass}>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5 dark:border-white/[0.06]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {current.request_code}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  {STATUS_LABEL[current.status] ?? current.status}
                </span>
                <span className="flex-1" />
                <span className="text-xs text-slate-400">
                  đã ký {current.approved_levels}/{current.required_levels} cấp
                </span>
              </div>

              <div className="p-5">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                    <div>
                      <dt className={keyClass}>Bộ phận</dt>
                      <dd className={valueClass}>{current.department?.name ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Dự án</dt>
                      <dd className={valueClass}>{current.project}</dd>
                    </div>
                    <div>
                      {/* Mục đích là thứ quyết định số cấp duyệt — người ký phải thấy nó ngay,
                          không phải suy ngược từ con số "2 cấp". */}
                      <dt className={keyClass}>Mục đích</dt>
                      <dd className={valueClass}>
                        {current.purpose === 'PERSONAL' ? (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                            Việc riêng
                          </span>
                        ) : (
                          'Việc của công ty'
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Địa điểm</dt>
                      <dd className={valueClass}>{current.place}</dd>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <dt className={keyClass}>Khoảng mượn</dt>
                      <dd className={cn(valueClass, 'font-medium font-mono text-xs sm:text-sm')}>
                        {formatTimeRange(current.from_time, current.to_time)}
                      </dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Giá trị ước tính</dt>
                      <dd className={valueClass}>
                        {current.total_value.toLocaleString('vi-VN')} đ
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03]">
                      <th className="px-5 py-3 font-semibold">Model</th>
                      <th className="px-5 py-3 font-semibold">Số lượng</th>
                      <th className="px-5 py-3 font-semibold">Trạng thái dòng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.lines.map((line) => (
                      <tr
                        key={line.id}
                        className="border-b border-slate-100 last:border-0 dark:border-white/[0.05]"
                      >
                        <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{line.model.name}</span>
                            <span className="text-xs font-normal text-slate-400">
                              ({line.model.category.name})
                            </span>
                          </div>
                          {line.model.accessories && line.model.accessories.length > 0 && (
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                🎁 Phụ kiện đi kèm:
                              </span>
                              {line.model.accessories.map((acc, idx) => (
                                <span
                                  key={acc.id || idx}
                                  className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-white/[0.08] dark:text-slate-300"
                                >
                                  ✓ {acc.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 font-semibold">{line.quantity}</td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-semibold',
                              line.status === 'BACKORDERED'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                            )}
                          >
                            {line.status === 'BACKORDERED' ? 'Chờ hàng' : 'Đã giữ chỗ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-5">
                {/* Kết quả vừa ký. Đứng trên mọi thứ khác vì đó là thứ người dùng đang chờ thấy. */}
                {outcome && (
                  <div
                    className={cn(
                      'mb-4 rounded-lg border p-3 text-sm',
                      outcome.kind === 'ready-to-prepare'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                        : outcome.kind === 'rejected'
                          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'
                          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
                    )}
                  >
                    <p className="leading-relaxed">{outcome.message}</p>
                  </div>
                )}

                {current.required_levels === 2 && (
                  <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    Phiếu cần <b>2 cấp duyệt</b>: {current.approval_reasons.join(', ')}.
                  </p>
                )}

                {current.approvals.length > 0 && (
                  <ul className="mb-4 flex flex-col gap-2">
                    {current.approvals.map((a) => (
                      <li
                        key={a.id}
                        className={cn(
                          'rounded-lg border p-3 text-xs',
                          a.decision === 'APPROVED'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                            : 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200',
                        )}
                      >
                        <b>
                          Cấp {a.level} · {a.decision === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                        </b>{' '}
                        · {fmt(a.decided_at)}
                        {a.reason && <> · lý do: {a.reason}</>}
                        <div className="mt-1">Bản ghi này không sửa và không xoá được.</div>
                      </li>
                    ))}
                  </ul>
                )}

                {error && (
                  <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {error}
                  </p>
                )}

                {!decided && (
                  <>
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Ghi chú
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        Bắt buộc nếu từ chối.
                      </span>
                      <textarea
                        className={`${inputClass} mt-2`}
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Nhập lý do…"
                      />
                    </label>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        disabled={saving}
                        onClick={() => decide('approve')}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                      >
                        {saving ? 'Đang ghi…' : 'Duyệt'}
                      </button>
                      <button
                        disabled={saving}
                        onClick={() => decide('reject')}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-transparent dark:hover:bg-red-500/10"
                      >
                        Từ chối
                      </button>
                      <span className="text-xs text-slate-400">Từ chối sẽ nhả giữ chỗ ngay</span>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      <WorkflowSuccessModal
        open={outcome?.kind === 'ready-to-prepare'}
        onClose={() => setOutcome(null)}
        title="Duyệt phiếu thành công!"
        message={outcome?.message || 'Phiếu mượn đã đủ chữ ký và sẵn sàng cho bước chuẩn bị & bàn giao.'}
        nextHref={outcome?.kind === 'ready-to-prepare' ? outcome.nextHref : '/dashboard/equipment/handover'}
        nextLabel="Sang bước Bàn giao ngay →"
        stayLabel="Ở lại duyệt tiếp"
      />
    </div>
  );
}

/**
 * Ẩn đầu mục trên thanh điều hướng là chưa đủ — gõ thẳng địa chỉ vẫn vào được trang.
 * Cửa canh thật nằm ở `MemsMediaLeaderGuard` phía BE.
 */
export default function ApprovalsPage() {
  return (
    <RequireCatalogManager>
      <ApprovalsPageInner />
    </RequireCatalogManager>
  );
}
