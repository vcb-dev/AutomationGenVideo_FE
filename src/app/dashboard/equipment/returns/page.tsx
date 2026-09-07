'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { RequireCatalogManager } from '@/components/equipment/RequireCatalogManager';
import { Accessory } from '@/lib/equipment/api';
import {
  BorrowRequest,
  createReturn,
  fetchPendingReturns,
  fetchRequests,
} from '@/lib/equipment/request-api';
import { returnOutcome } from '@/lib/equipment/return-outcome';
import { StatusPill } from '@/components/equipment/StatusPill';
import { ConditionDot } from '@/components/equipment/ConditionDot';
import { StepBar } from '@/components/equipment/StepBar';

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';
const keyClass = 'text-[11px] uppercase tracking-wide text-slate-400';
const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

const AFTER_OPTIONS = [
  { value: 'GOOD', label: 'Tốt' },
  { value: 'USED', label: 'Có dấu hiệu sử dụng' },
  { value: 'NEEDS_CHECK', label: 'Cần kiểm tra' },
  { value: 'BROKEN', label: 'Hỏng' },
];

interface ReturnForm {
  assetId: string;
  code: string;
  modelName: string;
  selected: boolean;
  conditionBefore: string;
  conditionAfter: string;
  photoKeys: string[];
  accessories: Accessory[];
  present: boolean[];
  handoverPhotoCount: number;
}

function ReturnsPageInner() {
  const [candidates, setCandidates] = useState<BorrowRequest[]>([]);
  const [request, setRequest] = useState<BorrowRequest | null>(null);
  const [rows, setRows] = useState<ReturnForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const loadUnits = useCallback(async (id: string) => {
    const data = await fetchPendingReturns(id);
    setRequest(data.request);
    setDone('');
    setRows(
      data.units.map((u) => ({
        assetId: u.asset_id,
        code: u.asset.asset_code,
        modelName: u.asset.model.name,
        selected: true,
        conditionBefore: u.condition,
        conditionAfter: u.condition,
        photoKeys: [],
        accessories: u.asset.model.accessories ?? [],
        present: (u.asset.model.accessories ?? []).map(() => true),
        handoverPhotoCount: u.photos.length,
      })),
    );
  }, []);

  useEffect(() => {
    Promise.all([fetchRequests('ON_LOAN'), fetchRequests('PARTIALLY_RETURNED')])
      .then(async ([onLoan, partial]) => {
        const list = [...onLoan, ...partial];
        setCandidates(list);
        if (list[0]) await loadUnits(list[0].id);
      })
      .catch(() => setError('Không đọc được phiếu đang mượn.'))
      .finally(() => setLoading(false));
  }, [loadUnits]);

  const patch = (index: number, next: Partial<ReturnForm>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...next } : r)));

  const toggleAccessory = (index: number, position: number) =>
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, present: r.present.map((v, j) => (j === position ? !v : v)) }
          : r,
      ),
    );

  const addPhoto = (index: number) =>
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, photoKeys: [...r.photoKeys, `${r.code}/tra-${Date.now()}.jpg`] }
          : r,
      ),
    );

  // Kết luận tính ở FE chỉ để hiện trước cho thủ kho thấy; BE tính lại và nó mới là bản chính thức.
  const accessoryNames = Object.fromEntries(
    rows.map((r) => [r.code, r.accessories.map((a) => a.name)]),
  );
  const outcome = returnOutcome(
    rows.map((r) => ({
      code: r.code,
      selected: r.selected,
      conditionBefore: r.conditionBefore,
      conditionAfter: r.conditionAfter,
      photoCount: r.photoKeys.length,
      accessories: r.present,
    })),
    accessoryNames,
  );
  const previewByCode = Object.fromEntries(outcome.units.map((u) => [u.code, u]));

  const submit = async () => {
    if (!request) return;
    setSaving(true);
    setError('');
    try {
      const result = await createReturn(request.id, {
        units: rows
          .filter((r) => r.selected)
          .map((r) => ({
            assetId: r.assetId,
            condition: r.conditionAfter,
            photoKeys: r.photoKeys,
            accessories: r.accessories.map((a, j) => ({
              accessoryId: a.id,
              isPresent: r.present[j],
            })),
          })),
      });
      const incidents = result.lines.reduce((sum, l) => sum + l.incidents.length, 0);
      setDone(
        `Đã nhận lại ${result.lines.length} máy` +
          (incidents > 0 ? `, mở ${incidents} bản ghi sự cố.` : '.'),
      );
      await loadUnits(request.id);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không ghi được biên bản trả.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Trả và kiểm tra</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Chỉ tick những máy người mượn mang tới hôm nay. Cột trái là tình trạng lúc giao để đối
          chiếu, cột phải là những gì bạn ghi nhận lúc nhận lại.
        </p>
      </header>

      <StepBar current="returns" />

      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : candidates.length === 0 ? (
        <p className={cn(cardClass, 'p-8 text-center text-slate-500')}>
          Chưa có phiếu nào đang mượn.
        </p>
      ) : (
        <>
          {candidates.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {candidates.map((r) => (
                <button
                  key={r.id}
                  onClick={() => loadUnits(r.id)}
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

          <section className={cardClass}>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5 dark:border-white/[0.06]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {request?.request_code} · {request?.project}
              </h2>
              <span className="flex-1" />
              {request && new Date(request.to_time) < new Date() && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  Quá hạn từ {new Date(request.to_time).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="p-8 text-center text-slate-500">
                Phiếu này đã nhận lại đủ máy, không còn gì chờ trả.
              </p>
            ) : (
              <div className="flex flex-col gap-4 p-5">
                {rows.map((row, i) => {
                  const preview = previewByCode[row.code];
                  return (
                    <div
                      key={row.assetId}
                      className={cn(
                        'overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08]',
                        !row.selected && 'opacity-60',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-emerald-600"
                            checked={row.selected}
                            onChange={(e) => patch(i, { selected: e.target.checked })}
                          />
                          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                            {row.code}
                          </span>
                        </label>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {row.modelName}
                        </span>
                        <span className="flex-1" />
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-semibold',
                            row.selected
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
                          )}
                        >
                          {row.selected ? 'nhận lại hôm nay' : 'người mượn giữ tiếp'}
                        </span>
                      </div>

                      {row.selected && (
                        <div className="p-4">
                          <div className="grid overflow-hidden rounded-lg border border-slate-200 md:grid-cols-2 dark:border-white/[0.08]">
                            <div className="border-b border-slate-200 bg-slate-50/60 p-4 md:border-b-0 md:border-r dark:border-white/[0.08] dark:bg-white/[0.02]">
                              <h3 className={cn(keyClass, 'mb-3')}>Lúc giao</h3>
                              <div className={keyClass}>Tình trạng</div>
                              <div className="mt-1">
                                <ConditionDot condition={row.conditionBefore} />
                              </div>
                              <div className={cn(keyClass, 'mt-4')}>Ảnh khi giao</div>
                              <div className="mt-1 text-sm text-slate-900 dark:text-white">
                                {row.handoverPhotoCount} ảnh trong biên bản
                              </div>
                              <div className={cn(keyClass, 'mt-4')}>Phụ kiện khi giao</div>
                              <div className="mt-1 text-sm text-slate-900 dark:text-white">
                                Đủ {row.accessories.length} món
                              </div>
                            </div>

                            <div className="p-4">
                              <h3 className={cn(keyClass, 'mb-3')}>Lúc nhận lại · hôm nay</h3>
                              <label className="block">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  Tình trạng khi nhận lại{' '}
                                  <em className="not-italic text-red-600">*</em>
                                </span>
                                <select
                                  className={cn(inputClass, 'mt-2 w-full')}
                                  value={row.conditionAfter}
                                  onChange={(e) => patch(i, { conditionAfter: e.target.value })}
                                >
                                  {AFTER_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <div className="mt-4">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  Ảnh khi trả <em className="not-italic text-red-600">*</em>
                                </span>
                                <button
                                  onClick={() => addPhoto(i)}
                                  className="mt-2 w-full rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 hover:border-blue-500 hover:text-blue-600 dark:border-white/[0.15] dark:text-slate-400"
                                >
                                  Bấm để thêm ảnh
                                </button>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {row.photoKeys.map((key) => (
                                    <span
                                      key={key}
                                      className="grid h-14 w-20 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
                                    >
                                      {row.code}
                                    </span>
                                  ))}
                                  {row.photoKeys.length === 0 && (
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                      Chưa có ảnh
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {row.accessories.length > 0 && (
                            <div className="mt-4">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                Đối chiếu phụ kiện
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                Bỏ tick món nào không thấy trả lại.
                              </span>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {row.accessories.map((a, j) => (
                                  <label
                                    key={a.id}
                                    className={cn(
                                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                                      row.present[j]
                                        ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                                        : 'border-slate-300 bg-white text-slate-600 dark:border-white/[0.12] dark:bg-transparent dark:text-slate-300',
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-3.5 w-3.5 accent-emerald-600"
                                      checked={row.present[j]}
                                      onChange={() => toggleAccessory(i, j)}
                                    />
                                    {a.name}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {preview && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs dark:border-white/[0.08] dark:bg-white/[0.02]">
                              <span className={keyClass}>Dự kiến</span>
                              <span className="text-slate-500">máy sẽ chuyển sang</span>
                              <StatusPill status={preview.nextStatus} />
                              {preview.opensIncident && (
                                <span className="text-amber-700 dark:text-amber-300">
                                  · mở bản ghi sự cố gắn với người mượn
                                </span>
                              )}
                              {preview.missingAccessories.length > 0 && (
                                <span className="text-red-700 dark:text-red-300">
                                  · thiếu {preview.missingAccessories.join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-5 dark:border-white/[0.06]">
                <span className="text-sm">
                  {outcome.selectedCount === 0 ? (
                    <span className="text-slate-500">Chưa chọn máy nào để nhận lại</span>
                  ) : outcome.unitsMissingPhoto.length > 0 ? (
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {outcome.unitsMissingPhoto.join(', ')} chưa có ảnh khi trả
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">
                      Nhận lại{' '}
                      <b className="text-slate-900 dark:text-white">
                        {outcome.selectedCount}/{rows.length}
                      </b>{' '}
                      máy · phiếu sẽ chuyển sang{' '}
                      <b className="text-slate-900 dark:text-white">
                        {outcome.requestStatus === 'CLOSED' ? 'Đã đóng' : 'Trả một phần'}
                      </b>
                    </span>
                  )}
                </span>
                <span className="flex-1" />
                <button
                  disabled={!outcome.canConfirm || saving}
                  onClick={submit}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-white/[0.08]"
                >
                  {saving ? 'Đang ghi…' : 'Xác nhận đã nhận lại'}
                </button>
              </div>
            )}

            {error && (
              <p className="border-t border-slate-100 p-5 text-sm font-semibold text-red-600 dark:border-white/[0.06] dark:text-red-400">
                {error}
              </p>
            )}
            {done && (
              <p className="border-t border-slate-100 p-5 text-sm text-emerald-700 dark:border-white/[0.06] dark:text-emerald-300">
                {done}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Ẩn đầu mục trên thanh điều hướng là chưa đủ — gõ thẳng địa chỉ vẫn vào được trang.
 * Cửa canh thật nằm ở `MemsMediaLeaderGuard` phía BE; chỗ này để người không có quyền đọc được
 * một câu giải thích thay vì một màn hình trống kèm vài thông báo lỗi đỏ.
 */
export default function ReturnsPage() {
  return (
    <RequireCatalogManager>
      <ReturnsPageInner />
    </RequireCatalogManager>
  );
}
