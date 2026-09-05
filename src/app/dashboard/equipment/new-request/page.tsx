'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Asset,
  AvailabilityResponse,
  BorrowPurpose,
  checkAvailability,
  createBorrowRequest,
  fetchAssets,
} from '@/lib/equipment/api';
import { groupModels } from '@/lib/equipment/group-models';
import { availabilityLabel } from '@/lib/equipment/availability-label';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

/**
 * Mục đích mượn — thứ quyết định phiếu cần một hay hai chữ ký.
 *
 * Luật cũ xét theo ĐỊA ĐIỂM: mang máy ra khỏi công ty là phải qua admin. Bỏ vì đi quay ngoại
 * cảnh và đi sự kiện là việc thường ngày của cả kho, bắt qua admin thì nghẽn khâu duyệt.
 */
const PURPOSE_OPTIONS: { value: BorrowPurpose; label: string; hint: string }[] = [
  {
    value: 'WORK',
    label: 'Việc của công ty',
    hint: 'Một chữ ký của leader là đủ.',
  },
  {
    value: 'PERSONAL',
    label: 'Việc riêng của tôi',
    hint: 'Cần hai chữ ký: leader rồi admin, dù mượn ngắn và dù máy rẻ.',
  },
];

interface Line {
  modelId: string;
  quantity: number;
  /** null nghĩa là chưa hỏi được (thiếu model hoặc thiếu mốc thời gian), khác hẳn với "còn 0 máy". */
  availability: AvailabilityResponse | null;
  checking: boolean;
}

const TONE_CLASS: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  tight: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  none: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

const labelClass = 'text-sm font-semibold text-slate-900 dark:text-white';
const hintClass = 'mt-1 block text-xs text-slate-400';

export default function NewRequestPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [project, setProject] = useState('');
  const [place, setPlace] = useState('');
  // Mặc định việc công ty: đó là phần lớn phiếu, và chọn nhầm sang cá nhân thì phiếu kẹt chờ
  // thêm chữ ký admin mà người tạo không hiểu vì sao.
  const [purpose, setPurpose] = useState<BorrowPurpose>('WORK');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { modelId: '', quantity: 1, availability: null, checking: false },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssets().then(setAssets).catch(() => setError('Không đọc được danh sách thiết bị.'));
  }, []);

  const models = useMemo(() => groupModels(assets), [assets]);
  const rangeValid = !!fromTime && !!toTime && new Date(toTime) > new Date(fromTime);

  // BR-11: không hỏi "còn hay hết" chung chung — chỉ gọi khi đã đủ model và cả hai mốc thời gian.
  const refreshLine = useCallback(
    async (index: number, modelId: string, quantity: number) => {
      if (!modelId || !rangeValid) {
        setLines((prev) =>
          prev.map((l, i) => (i === index ? { ...l, availability: null, checking: false } : l)),
        );
        return;
      }
      setLines((prev) => prev.map((l, i) => (i === index ? { ...l, checking: true } : l)));
      try {
        const availability = await checkAvailability({
          modelId,
          fromTime: new Date(fromTime).toISOString(),
          toTime: new Date(toTime).toISOString(),
          quantity,
        });
        setLines((prev) =>
          prev.map((l, i) => (i === index ? { ...l, availability, checking: false } : l)),
        );
      } catch {
        setLines((prev) =>
          prev.map((l, i) => (i === index ? { ...l, availability: null, checking: false } : l)),
        );
      }
    },
    [fromTime, toTime, rangeValid],
  );

  // Đổi khoảng thời gian là mọi dòng phải hỏi lại: số khả dụng chỉ có nghĩa trong đúng khoảng đó.
  useEffect(() => {
    lines.forEach((l, i) => refreshLine(i, l.modelId, l.quantity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshLine]);

  const setLine = (index: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    const next = { ...lines[index], ...patch };
    refreshLine(index, next.modelId, next.quantity);
  };

  const addLine = () =>
    setLines((prev) => [...prev, { modelId: '', quantity: 1, availability: null, checking: false }]);

  const removeLine = (index: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const filledLines = lines.filter((l) => l.modelId);
  const totalUnits = filledLines.reduce((sum, l) => sum + l.quantity, 0);
  const canSubmit =
    !!project.trim() && !!place.trim() && rangeValid && filledLines.length > 0 && !submitting;

  const onSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const created = await createBorrowRequest({
        project: project.trim(),
        place: place.trim(),
        purpose,
        fromTime: new Date(fromTime).toISOString(),
        toTime: new Date(toTime).toISOString(),
        lines: filledLines.map((l) => ({ modelId: l.modelId, quantity: l.quantity })),
      });
      router.push(`/dashboard/equipment?created=${created.request_code}`);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Gửi phiếu không thành công.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tạo phiếu mượn</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Khai mục đích và khoảng thời gian trước, chọn thiết bị sau. Số khả dụng được tính lại
            mỗi khi bạn đổi thời điểm nhận hoặc trả.
          </p>
        </header>

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Thông tin chung
          </h2>
          <div className="grid gap-4">
            <label className="block">
              <span className={labelClass}>
                Dự án hoặc mục đích <em className="not-italic text-red-600">*</em>
              </span>
              <span className={hintClass}>Dùng để đối chiếu khi quyết toán và khi tra lịch sử.</span>
              <input
                className={`${inputClass} mt-2`}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Ví dụ: Quay TVC khách hàng ABC"
              />
            </label>

            {/* Mục đích quyết định SỐ CẤP DUYỆT nên đặt ngay trước địa điểm, không giấu cuối form. */}
            <fieldset className="block">
              <legend className={labelClass}>
                Mục đích mượn <em className="not-italic text-red-600">*</em>
              </legend>
              <span className={hintClass}>
                Đây là thứ quyết định phiếu cần mấy chữ ký, không phải địa điểm hay giá trị máy.
              </span>
              <div className="mt-2 grid max-w-lg gap-2 sm:grid-cols-2">
                {PURPOSE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                      purpose === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-slate-300 hover:bg-slate-50 dark:border-white/[0.12] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="purpose"
                        value={option.value}
                        checked={purpose === option.value}
                        onChange={() => setPurpose(option.value)}
                      />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {option.label}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {option.hint}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className={labelClass}>
                Địa điểm sử dụng <em className="not-italic text-red-600">*</em>
              </span>
              <span className={hintClass}>
                Ghi lại để biết máy đi đâu. Địa điểm KHÔNG còn làm thay đổi số cấp duyệt — mục
                đích mượn mới quyết định.
              </span>
              <input
                className={`${inputClass} mt-2 max-w-sm`}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Ví dụ: Studio, Đà Nẵng…"
              />
            </label>

            {/* Bộ chọn tự vẽ thay cho `datetime-local`: lịch của trình duyệt chỉ có ngày, không
                có đồng hồ, nên người dùng tưởng màn hình không cho chọn giờ và để nguyên 00:00 —
                trong khi giờ nhận/trả quyết định cả phép tính khả dụng lẫn hạn trả của phiếu. */}
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="block">
                <span className={labelClass}>Thời điểm nhận</span>
                <DateTimePicker className="mt-2" value={fromTime} onChange={setFromTime} />
              </div>
              <div className="block">
                <span className={labelClass}>Thời điểm trả</span>
                <DateTimePicker className="mt-2" value={toTime} onChange={setToTime} />
              </div>
            </div>
            {fromTime && toTime && !rangeValid && (
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                Thời điểm trả phải sau thời điểm nhận.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/[0.06]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Thiết bị cần mượn
            </h2>
            <span className="text-xs text-slate-400">
              chọn theo model, kho gán máy cụ thể khi bàn giao
            </span>
          </div>

          <div className="flex flex-col gap-3 p-5">
            {lines.map((line, i) => {
              const label = line.availability
                ? availabilityLabel(line.availability.available, line.quantity)
                : null;
              const model = models.find((m) => m.id === line.modelId);
              return (
                <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_13rem_2.5rem]">
                  <select
                    className={inputClass}
                    value={line.modelId}
                    onChange={(e) => setLine(i, { modelId: e.target.value })}
                  >
                    <option value="">— Chọn model —</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.categoryName} ({m.totalUnits} máy)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={line.quantity}
                    onChange={(e) =>
                      setLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                  <div className="flex items-center">
                    {line.checking ? (
                      <span className="text-xs text-slate-400">Đang kiểm tra…</span>
                    ) : label && line.availability ? (
                      <span
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${TONE_CLASS[label.tone]}`}
                        title={
                          line.availability.bufferMinutes > 0
                            ? `Đã tính buffer kiểm tra ${line.availability.bufferMinutes} phút sau khi trả`
                            : undefined
                        }
                      >
                        {label.text}
                        {model ? ` / ${model.totalUnits}` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {line.modelId ? 'Chọn khoảng thời gian' : 'Chọn model'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                    className="h-9 rounded-lg border border-slate-300 text-slate-400 hover:border-red-300 hover:text-red-600 disabled:opacity-40 dark:border-white/[0.12]"
                    title="Xoá dòng"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addLine}
              className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.12] dark:text-slate-300 dark:hover:bg-white/[0.05]"
            >
              + Thêm dòng thiết bị
            </button>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Tóm tắt phiếu
          </h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-400">Khoảng mượn</dt>
              <dd className="mt-0.5 text-slate-900 dark:text-white">
                {rangeValid
                  ? `${new Date(fromTime).toLocaleString('vi-VN')} → ${new Date(toTime).toLocaleString('vi-VN')}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-400">Số dòng</dt>
              <dd className="mt-0.5 text-slate-900 dark:text-white">{filledLines.length} dòng</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-400">Tổng số máy</dt>
              <dd className="mt-0.5 text-slate-900 dark:text-white">{totalUnits} máy</dd>
            </div>
          </dl>

          {/* QĐ-08: dòng thiếu máy vẫn gửi được, kho xử lý sau — không chặn người dùng ở đây. */}
          {filledLines.some((l) => l.availability && !l.availability.enough) && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Có dòng chưa đủ máy trong khung giờ này. Vẫn gửi được, dòng thiếu sẽ ở trạng thái
              Chờ hàng.
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-white/[0.08]"
          >
            {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </button>
        </div>
      </aside>
    </div>
  );
}
