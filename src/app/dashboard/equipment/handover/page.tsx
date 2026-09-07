'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { RequireCatalogManager } from '@/components/equipment/RequireCatalogManager';
import { Accessory } from '@/lib/equipment/api';
import {
  BorrowRequest,
  HandoverSheetUnit,
  createHandover,
  fetchHandoverSheet,
  fetchRequests,
} from '@/lib/equipment/request-api';
import { handoverReadiness } from '@/lib/equipment/handover-readiness';
import { ConditionDot } from '@/components/equipment/ConditionDot';
import { StepBar } from '@/components/equipment/StepBar';
import { WorkflowSuccessModal } from '@/components/equipment/WorkflowSuccessModal';

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';
const keyClass = 'text-[11px] uppercase tracking-wide text-slate-400';
const valueClass = 'mt-0.5 text-sm text-slate-900 dark:text-white';
const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

interface UnitForm {
  assetId: string;
  code: string;
  modelName: string;
  condition: string;
  accessories: Accessory[];
  present: boolean[];
  photoKeys: string[];
  note: string;
}

function HandoverPageInner() {
  const [candidates, setCandidates] = useState<BorrowRequest[]>([]);
  const [request, setRequest] = useState<BorrowRequest | null>(null);
  const [units, setUnits] = useState<UnitForm[]>([]);
  const [receivedBy, setReceivedBy] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const loadSheet = useCallback(async (id: string) => {
    const sheet = await fetchHandoverSheet(id);
    setRequest(sheet.request);
    setDone('');
    setConfirmed(false);
    setUnits(
      sheet.units.map((u: HandoverSheetUnit) => ({
        assetId: u.asset.id,
        code: u.asset.asset_code,
        modelName: u.model.name,
        condition: u.asset.condition,
        accessories: u.accessories,
        present: u.accessories.map(() => true),
        photoKeys: [],
        note: '',
      })),
    );
  }, []);

  useEffect(() => {
    fetchRequests('PREPARING')
      .then(async (list) => {
        setCandidates(list);
        if (list[0]) await loadSheet(list[0].id);
      })
      .catch(() => setError('Không đọc được phiếu đang chuẩn bị.'))
      .finally(() => setLoading(false));
  }, [loadSheet]);

  const patch = (index: number, next: Partial<UnitForm>) =>
    setUnits((prev) => prev.map((u, i) => (i === index ? { ...u, ...next } : u)));

  const toggleAccessory = (index: number, position: number) =>
    setUnits((prev) =>
      prev.map((u, i) =>
        i === index
          ? { ...u, present: u.present.map((v, j) => (j === position ? !v : v)) }
          : u,
      ),
    );

  // Ảnh thật cần endpoint tải lên; ở đây sinh khoá lưu trữ để BE ghi lại số ảnh và mốc thời gian.
  const addPhoto = (index: number) =>
    setUnits((prev) =>
      prev.map((u, i) =>
        i === index ? { ...u, photoKeys: [...u.photoKeys, `${u.code}/${Date.now()}.jpg`] } : u,
      ),
    );

  const readiness = handoverReadiness(
    units.map((u) => ({ code: u.code, photoCount: u.photoKeys.length, accessories: u.present })),
    confirmed && receivedBy.trim() !== '',
  );

  const submit = async () => {
    if (!request) return;
    setSaving(true);
    setError('');
    try {
      await createHandover(request.id, {
        receivedBy: receivedBy.trim(),
        units: units.map((u) => ({
          assetId: u.assetId,
          condition: u.condition,
          photoKeys: u.photoKeys,
          accessories: u.accessories.map((a, j) => ({
            accessoryId: a.id,
            isPresent: u.present[j],
          })),
          note: u.note || undefined,
        })),
      });
      setDone(`Đã bàn giao ${units.length} máy, biên bản đã lưu. Các máy chuyển sang Đang mượn.`);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không lập được biên bản bàn giao.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Bàn giao thiết bị</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Với mỗi máy, ghi nhận tình trạng lúc giao, đối chiếu phụ kiện và chụp ảnh. Đây là căn cứ
          để quy trách nhiệm khi nhận lại.
        </p>
      </header>

      <StepBar current="handover" />

      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : candidates.length === 0 ? (
        <p className={cn(cardClass, 'p-8 text-center text-slate-500')}>
          Chưa có phiếu nào đã gán serial và chờ bàn giao.
        </p>
      ) : (
        <>
          {candidates.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {candidates.map((r) => (
                <button
                  key={r.id}
                  onClick={() => loadSheet(r.id)}
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <section className={cardClass}>
              <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/[0.06]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Biên bản kiểm tra khi giao
                </h2>
                <span className="text-xs text-slate-400">
                  {request?.request_code} · {units.length} máy
                </span>
              </div>

              <div className="flex flex-col gap-4 p-5">
                {units.map((unit, i) => (
                  <div
                    key={unit.assetId}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.08]"
                  >
                    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-200 text-xs font-bold text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                        {i + 1}
                      </span>
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                        {unit.code}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {unit.modelName}
                      </span>
                      <span className="flex-1" />
                      <ConditionDot condition={unit.condition} />
                    </div>

                    <div className="flex flex-col gap-4 p-4">
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          Tình trạng khi giao <em className="not-italic text-red-600">*</em>
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          Ghi đúng thực tế, đây là mốc để đối chiếu lúc nhận lại.
                        </span>
                        <select
                          className={cn(inputClass, 'mt-2 w-56')}
                          value={unit.condition}
                          onChange={(e) => patch(i, { condition: e.target.value })}
                        >
                          <option value="GOOD">Tốt</option>
                          <option value="USED">Có dấu hiệu sử dụng</option>
                        </select>
                      </label>

                      <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          Phụ kiện bàn giao
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          Bỏ tick món nào không giao kèm.
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {unit.accessories.length === 0 && (
                            <span className="text-xs text-slate-400">
                              Model này chưa khai phụ kiện nào.
                            </span>
                          )}
                          {unit.accessories.map((a, j) => (
                            <label
                              key={a.id}
                              className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                                unit.present[j]
                                  ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                                  : 'border-slate-300 bg-white text-slate-600 dark:border-white/[0.12] dark:bg-transparent dark:text-slate-300',
                              )}
                            >
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 accent-emerald-600"
                                checked={unit.present[j]}
                                onChange={() => toggleAccessory(i, j)}
                              />
                              {a.name}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          Ảnh tình trạng <em className="not-italic text-red-600">*</em>
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          Tối thiểu một ảnh mới bàn giao được.
                        </span>
                        <button
                          onClick={() => addPhoto(i)}
                          className="mt-2 w-full rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 hover:border-blue-500 hover:text-blue-600 dark:border-white/[0.15] dark:text-slate-400"
                        >
                          Bấm để thêm ảnh
                        </button>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {unit.photoKeys.map((key) => (
                            <span
                              key={key}
                              className="grid h-14 w-20 place-items-center rounded-lg border border-blue-200 bg-blue-50 px-1 text-center text-[10px] font-semibold leading-tight text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
                            >
                              {unit.code}
                            </span>
                          ))}
                          {unit.photoKeys.length === 0 && (
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                              Chưa có ảnh
                            </span>
                          )}
                        </div>
                      </div>

                      <label className="block">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          Ghi chú
                        </span>
                        <textarea
                          className={cn(inputClass, 'mt-2 w-full')}
                          rows={2}
                          value={unit.note}
                          onChange={(e) => patch(i, { note: e.target.value })}
                          placeholder="Ví dụ: xước nhẹ mặt lưng, đã chụp ảnh"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="lg:sticky lg:top-4 lg:self-start">
              <div className={cn(cardClass, 'p-5')}>
                <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                  Xác nhận bàn giao
                </h2>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Người nhận thực tế <em className="not-italic text-red-600">*</em>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    Có thể nhận thay người đứng tên phiếu.
                  </span>
                  <input
                    className={cn(inputClass, 'mt-2 w-full')}
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Họ tên người ra kho lấy đồ"
                  />
                </label>

                <dl className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <div>
                    <dt className={keyClass}>Số máy bàn giao</dt>
                    <dd className={valueClass}>{units.length} máy</dd>
                  </div>
                  <div>
                    <dt className={keyClass}>Tổng số ảnh</dt>
                    <dd className={valueClass}>{readiness.totalPhotoCount} ảnh</dd>
                  </div>
                  <div>
                    <dt className={keyClass}>Phụ kiện chưa tick</dt>
                    <dd
                      className={cn(
                        valueClass,
                        readiness.uncheckedAccessoryCount > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {readiness.uncheckedAccessoryCount || 'không có'}
                    </dd>
                  </div>
                </dl>

                {readiness.unitsMissingPhoto.length > 0 && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    Chưa bàn giao được: {readiness.unitsMissingPhoto.join(', ')} chưa có ảnh.
                  </p>
                )}
                {readiness.uncheckedAccessoryCount > 0 && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    Có {readiness.uncheckedAccessoryCount} phụ kiện chưa tick. Nếu thực sự không
                    giao thì ghi rõ ở ô Ghi chú.
                  </p>
                )}

                <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-300 p-3 text-xs text-slate-700 dark:border-white/[0.12] dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-emerald-600"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  Tôi xác nhận đã nhận đủ thiết bị và phụ kiện đúng như biên bản
                </label>

                <button
                  disabled={!readiness.canHandover || saving}
                  onClick={submit}
                  className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-white/[0.08]"
                >
                  {saving ? 'Đang ghi…' : 'Xác nhận bàn giao'}
                </button>
                <p className="mt-2 text-center text-xs text-slate-400">
                  Chưa xác nhận thì thiết bị vẫn ở trạng thái Sẵn sàng
                </p>

                {error && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {error}
                  </p>
                )}
              </div>
            </aside>
          </div>

          <WorkflowSuccessModal
            open={Boolean(done)}
            onClose={() => {
              setDone('');
              fetchRequests('PREPARING').then((list) => {
                setCandidates(list);
                if (list[0]) loadSheet(list[0].id);
                else setRequest(null);
              });
            }}
            title="Bàn giao thiết bị thành công!"
            message={done || 'Biên bản bàn giao đã được lưu và thiết bị đã chuyển sang trạng thái Đang mượn.'}
            nextHref="/dashboard/equipment/returns"
            nextLabel="Sang bước Nhận trả →"
            stayLabel="Tiếp tục bàn giao phiếu khác"
          />
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
export default function HandoverPage() {
  return (
    <RequireCatalogManager>
      <HandoverPageInner />
    </RequireCatalogManager>
  );
}
