'use client';

/**
 * NV-14 — Kiểm tra thiết bị ở bàn nhận.
 *
 * Màn này là mắt xích DUY NHẤT đưa một chiếc máy trở lại Sẵn sàng. Trước khi có nó, hai
 * endpoint `GET /mems/pending-inspection` và `POST /assets/:code/inspect` nằm không, còn máy
 * mới nhập khai tình trạng xấu và máy trả về bị trầy thì nằm lại bàn kiểm tra vĩnh viễn — kho
 * hao dần mà không ai thấy máy biến đi đâu.
 *
 * Phần thuần (nhãn, hệ quả, tình trạng gợi ý) nằm ở `src/lib/equipment/inspection.ts`.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  PendingInspectionAsset,
  fetchPendingInspection,
  inspectAsset,
  photoSrc,
} from '@/lib/equipment/api';
import {
  INSPECT_RESULT_OPTIONS,
  InspectResult,
  pendingReason,
  requiresNote,
  suggestedCondition,
} from '@/lib/equipment/inspection';
import { conditionLabel } from '@/lib/equipment/status-label';

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

const REASON_TONE: Record<string, string> = {
  intake:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/[0.1]',
  postReturn:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20',
};

interface DraftConclusion {
  result: InspectResult;
  condition: string;
  note: string;
}

/**
 * Câu lỗi đọc được từ phản hồi API.
 *
 * NestJS trả `message` ở hai dạng: chuỗi với lỗi nghiệp vụ, MẢNG chuỗi với lỗi validate DTO.
 * Gán thẳng mảng vào state kiểu string thì React nối các phần tử không dấu phân cách.
 */
function readApiMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message;
  if (Array.isArray(message)) {
    const parts = message.filter((p): p is string => typeof p === 'string' && !!p.trim());
    if (parts.length > 0) return parts.join('; ');
  }
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

function InspectionPageInner() {
  const [assets, setAssets] = useState<PendingInspectionAsset[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftConclusion>>({});
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchPendingInspection()
      .then((rows) => {
        setAssets(rows);
        setDrafts(
          Object.fromEntries(
            rows.map((a) => [
              a.asset_code,
              {
                result: 'AVAILABLE' as InspectResult,
                condition: suggestedCondition('AVAILABLE', a.condition),
                note: '',
              },
            ]),
          ),
        );
      })
      .catch((e: unknown) => setError(readApiMessage(e, 'Không đọc được danh sách chờ kiểm tra.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const patch = (code: string, next: Partial<DraftConclusion>) =>
    setDrafts((prev) => ({ ...prev, [code]: { ...prev[code], ...next } }));

  // Đổi kết luận thì tình trạng gợi ý đổi theo, nhưng vẫn sửa tay được sau đó.
  const changeResult = (asset: PendingInspectionAsset, result: InspectResult) =>
    patch(asset.asset_code, { result, condition: suggestedCondition(result, asset.condition) });

  const submit = async (asset: PendingInspectionAsset) => {
    const draft = drafts[asset.asset_code];
    if (!draft) return;

    if (requiresNote(draft.result) && !draft.note.trim()) {
      setError(`Máy ${asset.asset_code}: kết luận Bảo trì phải nêu lý do, nó thành nội dung của lệnh bảo trì.`);
      return;
    }

    setSavingCode(asset.asset_code);
    setError('');
    try {
      await inspectAsset(asset.asset_code, {
        result: draft.result,
        condition: draft.condition,
        note: draft.note.trim() || undefined,
      });
      setDone(`Đã kết luận cho máy ${asset.asset_code}.`);
      load();
    } catch (e: unknown) {
      setError(readApiMessage(e, 'Không ghi được kết luận kiểm tra.'));
    } finally {
      setSavingCode('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <header className="mb-5">
        <Link
          href="/dashboard/equipment"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400"
        >
          ← Quay lại kho thiết bị
        </Link>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Kiểm tra thiết bị ở bàn nhận
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Máy mới nhập khai tình trạng chưa đạt và máy trả về có vấn đề đều dừng ở đây. Đây là
          bước duy nhất đưa máy trở lại Sẵn sàng.
        </p>
      </header>

      {done && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          {done}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="p-8 text-center text-slate-500">Đang tải danh sách chờ kiểm tra…</p>
      ) : assets.length === 0 ? (
        <div className={cn(cardClass, 'p-10 text-center')}>
          <div className="text-3xl">✅</div>
          <h2 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
            Bàn kiểm tra trống
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Không có máy nào đang chờ kết luận.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {assets.map((asset) => {
            const draft = drafts[asset.asset_code];
            const reason = pendingReason(asset.status);
            const lastReturn = asset.returnLines?.[0];
            if (!draft) return null;

            return (
              <section key={asset.id} className={cn(cardClass, 'p-4 sm:p-5')}>
                <div className="flex flex-wrap items-start gap-4">
                  {asset.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoSrc(asset.photos[0].url)}
                      alt={asset.model.name}
                      className="h-16 w-16 rounded-xl border border-slate-200 object-cover dark:border-white/[0.08]"
                    />
                  ) : (
                    <span className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-white/[0.12]">
                      📷
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/equipment/assets/${encodeURIComponent(asset.asset_code)}`}
                        className="font-mono text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {asset.asset_code}
                      </Link>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {asset.model.name}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          REASON_TONE[reason.tone],
                        )}
                        title={reason.hint}
                      >
                        {reason.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {reason.hint} · Tình trạng đang ghi nhận:{' '}
                      <b>{conditionLabel(asset.condition).label}</b> · Vị trí:{' '}
                      {asset.location?.name ?? 'Chưa xếp chỗ'}
                    </p>

                    {lastReturn && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                        Lượt trả gần nhất: {conditionLabel(lastReturn.condition_before).label} →{' '}
                        {conditionLabel(lastReturn.condition_after).label}
                        {lastReturn.note ? ` · ${lastReturn.note}` : ''}
                        {lastReturn.incidents?.length > 0 && (
                          <ul className="mt-1 list-inside list-disc">
                            {lastReturn.incidents.map((incident, i) => (
                              <li key={i}>{incident.description}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {INSPECT_RESULT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'cursor-pointer rounded-xl border p-3 transition-colors',
                        draft.result === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-slate-300 hover:bg-slate-50 dark:border-white/[0.12] dark:hover:bg-white/[0.04]',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`result-${asset.asset_code}`}
                          checked={draft.result === option.value}
                          onChange={() => changeResult(asset, option.value)}
                        />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {option.label}
                        </span>
                      </span>
                      {/* Hệ quả hiện ngay dưới nhãn: kết luận Bảo trì sinh lệnh bảo trì bỏ ngỏ,
                          giấu đi là thủ kho bấm mà không biết máy sẽ bận vô hạn. */}
                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {option.consequence}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Tình trạng sau kiểm
                    </span>
                    <select
                      className={cn(inputClass, 'mt-1')}
                      value={draft.condition}
                      onChange={(e) => patch(asset.asset_code, { condition: e.target.value })}
                    >
                      {['GOOD', 'USED', 'NEEDS_CHECK', 'IN_MAINTENANCE', 'BROKEN'].map((c) => (
                        <option key={c} value={c}>
                          {conditionLabel(c).label} ({c})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Ghi chú{requiresNote(draft.result) ? ' (bắt buộc)' : ''}
                    </span>
                    <input
                      className={cn(inputClass, 'mt-1')}
                      value={draft.note}
                      onChange={(e) => patch(asset.asset_code, { note: e.target.value })}
                      placeholder={
                        requiresNote(draft.result)
                          ? 'Lý do đưa đi bảo trì — sẽ thành nội dung lệnh bảo trì'
                          : 'Không bắt buộc'
                      }
                    />
                  </label>

                  <button
                    onClick={() => submit(asset)}
                    disabled={savingCode === asset.asset_code}
                    className="h-[38px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-white/[0.08]"
                  >
                    {savingCode === asset.asset_code ? 'Đang ghi…' : 'Ghi kết luận'}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InspectionPage() {
  return <InspectionPageInner />;
}
