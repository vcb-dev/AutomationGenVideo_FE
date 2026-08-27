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
import { needsTwoApprovals } from '@/lib/equipment/borrow-scope';
import { EquipmentWorkflowNav } from '@/components/equipment/EquipmentWorkflowNav';
import { ArrowRight, User } from 'lucide-react';

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';
const keyClass = 'text-[11px] uppercase tracking-wide text-slate-400';
const valueClass = 'mt-0.5 text-sm text-slate-900 dark:text-white';
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

const fmt = (iso: string) => new Date(iso).toLocaleString('vi-VN');

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

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [current, setCurrent] = useState<BorrowRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (keepId?: string) => {
    const list = await fetchRequests();
    setRequests(list);
    const target = keepId ? list.find((r) => r.id === keepId) : list[0];
    setCurrent(target ?? null);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setError('Không đọc được danh sách phiếu.'))
      .finally(() => setLoading(false));
  }, [load]);

  const select = async (id: string) => {
    setReason('');
    setError('');
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
      if (kind === 'approve') await approveRequest(current.id, reason.trim() || undefined);
      else await rejectRequest(current.id, reason.trim());
      setReason('');
      await load(current.id);
      setCurrent(await fetchRequest(current.id));
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không ghi được quyết định.',
      );
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const decided = current ? current.status !== 'PENDING_APPROVAL' : false;

  return (
    <div className="mx-auto max-w-6xl">
      <EquipmentWorkflowNav />

      <header className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Duyệt phiếu mượn</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Chọn một phiếu ở danh sách bên trái để xem chi tiết và phê duyệt nhanh. Sau khi duyệt có thể chuyển ngay sang chuẩn bị máy.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : requests.length === 0 ? (
        <p className={cn(cardClass, 'p-8 text-center text-slate-500')}>Chưa có phiếu mượn nào.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <section className={cn(cardClass, 'self-start overflow-hidden')}>
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/[0.06]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Phiếu mượn</h2>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {pendingCount} chờ duyệt
              </span>
            </div>
            <ul className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.05]">
              {requests.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => select(r.id)}
                    className={cn(
                      'flex w-full items-start gap-3 p-4 text-left transition-colors',
                      r.id === current?.id
                        ? 'bg-blue-50/70 shadow-[inset_3px_0_0_theme(colors.blue.600)] dark:bg-blue-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                        {r.request_code}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                        <User className="w-3 h-3 shrink-0" />
                        <span>{r.owner_name || 'Người mượn'}</span>
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {r.project}
                      </span>
                      {needsTwoApprovals(r.purpose) && (
                        <span className="mt-1 inline-block rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                          🏠 Cá nhân · cần 2 chữ ký
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {fmt(r.from_time)} → {fmt(r.to_time)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-semibold shrink-0',
                        r.status === 'REJECTED'
                          ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                          : r.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                      )}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {current && (
            <section className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {current.request_code}
                  </h2>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      current.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                        : current.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                    )}
                  >
                    {STATUS_LABEL[current.status] ?? current.status}
                  </span>
                  {needsTwoApprovals(current.purpose) && (
                    <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                      🏠 Mượn cá nhân
                    </span>
                  )}
                </div>

                {(current.status === 'APPROVED' || current.status === 'PREPARING') && (
                  <Link
                    href={`/dashboard/equipment/prepare?id=${current.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <span>Chuẩn bị máy & gán Serial</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <div className="p-5">
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <dl className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-5">
                    <div>
                      <dt className={keyClass}>Người mượn</dt>
                      <dd className={cn(valueClass, 'font-semibold text-blue-600 dark:text-blue-400')}>
                        {current.owner_name ?? '—'}
                        {current.owner_email && (
                          <span className="block text-xs font-normal text-slate-400">{current.owner_email}</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Bộ phận</dt>
                      <dd className={valueClass}>{current.department?.name ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Dự án</dt>
                      <dd className={valueClass}>{current.project}</dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Địa điểm</dt>
                      <dd className={valueClass}>{current.place}</dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Khoảng mượn</dt>
                      <dd className={valueClass}>
                        {fmt(current.from_time)} → {fmt(current.to_time)}
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
                          {line.model.name}
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {line.model.category.name}
                          </span>
                        </td>
                        <td className="px-5 py-3">{line.quantity}</td>
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
                {current.required_levels > 1 && (
                  <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-900 dark:border-purple-500/25 dark:bg-purple-500/10 dark:text-purple-200">
                    <b>Phiếu này cần 2 chữ ký: Leader → Admin.</b>{' '}
                    Đã ký {current.approved_levels}/{current.required_levels}.
                    {current.next_approver_role && (
                      <> Đang chờ <b>{current.next_approver_role}</b> ký.</>
                    )}
                    <div className="mt-1 text-purple-700/80 dark:text-purple-300/80">
                      Thiết bị mượn cho việc cá nhân — admin phải ký sau leader, và một người
                      không ký thay cả hai cấp được.
                    </div>
                  </div>
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
                        <b>{a.decision === 'APPROVED' ? '✅ Đã duyệt' : '❌ Đã từ chối'}</b> · {fmt(a.decided_at)}
                        {a.reason && <> · lý do: {a.reason}</>}
                        <div className="mt-1 text-slate-500">Bản ghi này không sửa và không xoá được.</div>
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
    </div>
  );
}
