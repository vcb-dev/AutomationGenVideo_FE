'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Asset } from '@/lib/equipment/api';
import {
  BorrowRequest,
  assignSerials,
  fetchAssignableAssets,
  fetchRequest,
  fetchRequests,
} from '@/lib/equipment/request-api';
import { ConditionDot } from '@/components/equipment/ConditionDot';
import { StepBar } from '@/components/equipment/StepBar';
import { WorkflowSuccessModal } from '@/components/equipment/WorkflowSuccessModal';

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';
const keyClass = 'text-[11px] uppercase tracking-wide text-slate-400';
const valueClass = 'mt-0.5 text-sm text-slate-900 dark:text-white';
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

const fmt = (iso: string) => new Date(iso).toLocaleString('vi-VN');

function PrepareInner() {
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<BorrowRequest[]>([]);
  const [request, setRequest] = useState<BorrowRequest | null>(null);
  /** lineId → danh sách máy hợp lệ; BE lọc sẵn theo khoảng của phiếu và tình trạng máy. */
  const [options, setOptions] = useState<Record<string, Asset[]>>({});
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const loadRequest = useCallback(async (id: string) => {
    const detail = await fetchRequest(id);
    setRequest(detail);
    setDone(false);

    const perLine = await Promise.all(
      detail.lines.map(async (line) => [line.id, await fetchAssignableAssets(line.id)] as const),
    );
    const map = Object.fromEntries(perLine);
    setOptions(map);
    // Chọn sẵn đúng số máy đầu danh sách — BE đã xếp máy nên chọn nhất lên trước.
    setPicked(
      Object.fromEntries(
        detail.lines.map((line) => [
          line.id,
          (map[line.id] ?? []).slice(0, line.quantity).map((a) => a.id),
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    // `?request=` do màn Duyệt gắn vào khi dẫn người ký sang đây. Không có nó thì lấy phiếu
    // đầu danh sách như trước — nhưng khi có thì phải trúng đúng phiếu vừa ký, chứ mở ra thấy
    // một phiếu khác thì người dùng gán máy nhầm phiếu mà không hề biết.
    const wanted = searchParams?.get('request');
    fetchRequests('APPROVED')
      .then(async (list) => {
        setCandidates(list);
        const target = (wanted && list.find((r) => r.id === wanted)) || list[0];
        if (target) await loadRequest(target.id);
        else if (wanted) {
          // Phiếu được dẫn tới nhưng không nằm trong danh sách chờ gán: ai đó đã gán xong rồi.
          setError('Phiếu này không còn ở bước gán máy — có thể người khác đã chuẩn bị xong.');
        }
      })
      .catch(() => setError('Không đọc được danh sách phiếu đã duyệt.'))
      .finally(() => setLoading(false));
  }, [loadRequest, searchParams]);

  const setPick = (lineId: string, index: number, assetId: string) =>
    setPicked((prev) => ({
      ...prev,
      [lineId]: (prev[lineId] ?? []).map((v, i) => (i === index ? assetId : v)),
    }));

  const submit = async () => {
    if (!request) return;
    setSaving(true);
    setError('');
    try {
      await assignSerials(
        request.id,
        request.lines.map((line) => ({ lineId: line.id, assetIds: picked[line.id] ?? [] })),
      );
      setDone(true);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không gán được serial.',
      );
    } finally {
      setSaving(false);
    }
  };

  const duplicated = (() => {
    const all = Object.values(picked).flat();
    return new Set(all).size !== all.length;
  })();
  const missing = request?.lines.some(
    (line) => (picked[line.id] ?? []).filter(Boolean).length !== line.quantity,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Chuẩn bị và gán serial
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Phiếu ghi model, đến bước này kho mới chọn máy cụ thể. Danh sách chọn đã lọc bỏ máy đang
          bận trong khoảng của phiếu và máy có tình trạng không đạt.
        </p>
      </header>

      <StepBar current="prepare" />

      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : candidates.length === 0 ? (
        <p className={cn(cardClass, 'p-8 text-center text-slate-500')}>
          Chưa có phiếu nào đã duyệt và chờ gán serial.
        </p>
      ) : (
        <>
          {candidates.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {candidates.map((r) => (
                <button
                  key={r.id}
                  onClick={() => loadRequest(r.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold',
                    r.id === request?.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'border-slate-300 text-slate-600 dark:border-white/[0.12] dark:text-slate-300',
                  )}
                >
                  {r.request_code}
                </button>
              ))}
            </div>
          )}

          {request && (
            <section className={cardClass}>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5 dark:border-white/[0.06]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {request.request_code}
                </h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  {request.status === 'PREPARING' ? 'Đang chuẩn bị' : 'Đã duyệt'}
                </span>
              </div>

              <div className="p-5">
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <dl className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-5">
                    <div>
                      <dt className={keyClass}>Bộ phận</dt>
                      <dd className={valueClass}>{request.department?.name ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Dự án</dt>
                      <dd className={valueClass}>{request.project}</dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Địa điểm</dt>
                      <dd className={valueClass}>{request.place}</dd>
                    </div>
                    <div>
                      <dt className={keyClass}>Khoảng mượn</dt>
                      <dd className={valueClass}>
                        {fmt(request.from_time)} → {fmt(request.to_time)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03]">
                      <th className="px-5 py-3 font-semibold">Model đã duyệt</th>
                      <th className="px-5 py-3 font-semibold">Máy cụ thể được gán</th>
                      <th className="px-5 py-3 font-semibold">Tình trạng</th>
                      <th className="px-5 py-3 font-semibold">Vị trí</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.lines.map((line) => {
                      const units = options[line.id] ?? [];
                      return Array.from({ length: line.quantity }, (_, slot) => {
                        const chosen = units.find((u) => u.id === picked[line.id]?.[slot]);
                        return (
                          <tr
                            key={`${line.id}-${slot}`}
                            className="border-b border-slate-100 last:border-0 dark:border-white/[0.05]"
                          >
                            <td className="px-5 py-3">
                              <div className="font-medium text-slate-900 dark:text-white">
                                {line.model.name}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-400">
                                {line.model.category.name} · máy {slot + 1}/{line.quantity}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              {units.length === 0 ? (
                                <span className="text-sm text-red-600 dark:text-red-400">
                                  Không còn máy hợp lệ trong khoảng này
                                </span>
                              ) : (
                                <>
                                  <select
                                    className={inputClass}
                                    value={picked[line.id]?.[slot] ?? ''}
                                    onChange={(e) => setPick(line.id, slot, e.target.value)}
                                  >
                                    <option value="">— Chọn máy —</option>
                                    {units.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.asset_code} — {u.serial_number}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="mt-1.5 text-xs text-slate-400">
                                    {units.length} máy hợp lệ trong khoảng này
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {chosen ? <ConditionDot condition={chosen.condition} /> : '—'}
                            </td>
                            <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                              {chosen?.location?.name ?? '—'}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-5 dark:border-white/[0.06]">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Chỉ hiện máy hợp lệ, xếp máy còn tốt và ít vòng quay lên trước
                </span>
                <span className="flex-1" />
                {duplicated && (
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    Một máy đang được gán cho hai chỗ
                  </span>
                )}
                <button
                  disabled={saving || duplicated || missing}
                  onClick={submit}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-white/[0.08]"
                >
                  {saving ? 'Đang ghi…' : 'Hoàn tất chuẩn bị'}
                </button>
              </div>

              {error && (
                <p className="border-t border-slate-100 p-5 text-sm font-semibold text-red-600 dark:border-white/[0.06] dark:text-red-400">
                  {error}
                </p>
              )}
            </section>
          )}

          <WorkflowSuccessModal
            open={done}
            onClose={() => {
              setDone(false);
              fetchRequests('APPROVED').then((list) => {
                setCandidates(list);
                if (list[0]) loadRequest(list[0].id);
                else setRequest(null);
              });
            }}
            title="Chuẩn bị & Gán serial thành công!"
            message="Phiếu mượn đã được gán máy cụ thể và chuyển sang trạng thái Đang chuẩn bị."
            nextHref={`/dashboard/equipment/handover${request ? `?request=${request.id}` : ''}`}
            nextLabel="Sang bước Bàn giao ngay →"
            stayLabel="Tiếp tục gán phiếu khác"
          />
        </>
      )}
    </div>
  );
}

/**
 * `useSearchParams` bắt buộc nằm trong ranh giới Suspense — Next 14 không dựng tĩnh được trang
 * nếu thiếu, và lỗi chỉ lộ ra lúc `next build` chứ dev server vẫn chạy ngon.
 */
export default function PreparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải…</div>}>
      <PrepareInner />
    </Suspense>
  );
}
