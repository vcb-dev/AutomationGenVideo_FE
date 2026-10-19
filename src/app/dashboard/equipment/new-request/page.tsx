'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Asset,
  AvailabilityResponse,
  BorrowPurpose,
  checkAvailability,
  createBorrowRequest,
  fetchAssets,
  uploadRequestPhoto,
} from '@/lib/equipment/api';
import { groupModels } from '@/lib/equipment/group-models';
import { noModelLeft, selectableModels } from '@/lib/equipment/selectable-models';
import { availabilityLabel } from '@/lib/equipment/availability-label';
import { apiErrorMessage } from '@/lib/equipment/api-error';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { MobileBorrowQRModal } from '@/components/equipment/MobileBorrowQRModal';
import { useAuthStore } from '@/store/auth-store';

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

interface RequestPhotoItem {
  file: File;
  previewUrl: string;
  name: string;
}

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQr = searchParams?.get('from_qr') === '1';
  const user = useAuthStore((s) => s.user);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [project, setProject] = useState('');
  const [place, setPlace] = useState('');
  // Mặc định việc công ty: đó là phần lớn phiếu, và chọn nhầm sang cá nhân thì phiếu kẹt chờ
  // thêm chữ ký admin mà người tạo không hiểu vì sao.
  const [purpose, setPurpose] = useState<BorrowPurpose>('WORK');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<RequestPhotoItem[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { modelId: '', quantity: 1, availability: null, checking: false },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onPickPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const remainingSlots = Math.max(0, 5 - photos.length);
    const picked = Array.from(files).slice(0, remainingSlots);
    const newItems: RequestPhotoItem[] = picked.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      name: f.name,
    }));
    setPhotos((prev) => [...prev, ...newItems]);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const target = prev[index];
      if (target?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    fetchAssets().then(setAssets).catch((e: unknown) => setError(apiErrorMessage(e, 'Không đọc được danh sách thiết bị.')));
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
  const lineModelIds = lines.map((l) => l.modelId);
  const addLineDisabled = noModelLeft(models, lineModelIds);
  const canSubmit =
    !!project.trim() && !!place.trim() && rangeValid && filledLines.length > 0 && !submitting;

  const onSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      let uploadedPhotoUrls: string[] = [];
      if (photos.length > 0) {
        for (const p of photos) {
          const res = await uploadRequestPhoto(p.file);
          if (res?.url) uploadedPhotoUrls.push(res.url);
        }
      }

      const created = await createBorrowRequest({
        project: project.trim(),
        place: place.trim(),
        purpose,
        fromTime: new Date(fromTime).toISOString(),
        toTime: new Date(toTime).toISOString(),
        lines: filledLines.map((l) => ({ modelId: l.modelId, quantity: l.quantity })),
        note: note.trim() || undefined,
        photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined,
      });
      router.push(`/dashboard/equipment/borrow-history?created=${created.request_code}`);
    } catch (e: unknown) {
      setError(
        apiErrorMessage(e, 'Gửi phiếu không thành công.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <header className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tạo phiếu mượn</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Khai mục đích và khoảng thời gian trước, chọn thiết bị sau. Số khả dụng được tính lại
              mỗi khi bạn đổi thời điểm nhận hoặc trả.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-blue-200 bg-blue-50/90 px-3.5 py-2 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 transition-all"
          >
            <span>📱</span> Mở trên điện thoại để chụp ảnh
          </button>
        </header>

        {/* THÔNG BÁO KHI VÀO QUA MÃ QR TRÊN ĐIỆN THOẠI */}
        {fromQr && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/95 p-3.5 text-xs text-blue-900 shadow-2xs dark:border-blue-500/30 dark:bg-blue-950/20 dark:text-blue-300 flex items-center gap-2.5">
            <span className="text-2xl">📱</span>
            <div>
              <strong className="block font-bold">Chế độ tạo phiếu mượn trên điện thoại</strong>
              <span>
                Bạn có thể bấm nút <b>"📷 Chụp ảnh bằng Camera"</b> ở phần đính kèm ảnh bên dưới để chụp trực tiếp thiết bị và phụ kiện tại chỗ!
              </span>
            </div>
          </div>
        )}

        {/* THÔNG TIN DANH TÍNH NGƯỜI MƯỢN */}
        {user?.full_name && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-100/90 px-3.5 py-2 text-xs text-slate-700 border border-slate-200 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span>👤</span>
              <span>
                Người tạo phiếu: <strong className="text-slate-900 dark:text-white">{user.full_name}</strong>
                {user.email ? ` (${user.email})` : ''}
              </span>
            </div>
            <span className="text-slate-500 font-medium">
              {user.team || 'Thành viên VCBI'}
            </span>
          </div>
        )}

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

            <div className="border-t border-slate-100 pt-4 dark:border-white/[0.06]">
              <label className="block">
                <span className={labelClass}>Ghi chú cho thủ kho & người duyệt (Tùy chọn)</span>
                <span className={hintClass}>
                  Nêu rõ kịch bản quay, yêu cầu phụ kiện đặc biệt, hoặc ghi chú bàn giao nếu có.
                </span>
                <textarea
                  className={`${inputClass} mt-2`}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập ghi chú thêm cho phiếu mượn này…"
                />
              </label>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={labelClass}>Ảnh đính kèm từ người mượn (Tùy chọn)</span>
                    <span className={hintClass}>
                      Đính kèm ảnh hiện trường, danh sách thiết bị cần khớp hoặc tài liệu quay (tối đa 5 ảnh).
                    </span>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickPhotos(e.target.files)}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => onPickPhotos(e.target.files)}
                  />
                  {photos.length < 5 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 transition-all"
                      >
                        <span>📷</span> Chụp ảnh bằng Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] transition-all"
                      >
                        🖼️ Chọn từ máy
                      </button>
                    </div>
                  )}
                </div>

                {photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="group relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800"
                      >
                        <img
                          src={p.previewUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white opacity-90 hover:bg-red-600 transition cursor-pointer"
                          title="Xoá ảnh"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
              const options = selectableModels(models, lineModelIds, i);
              return (
                <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_13rem_2.5rem]">
                  <select
                    className={inputClass}
                    value={line.modelId}
                    onChange={(e) => setLine(i, { modelId: e.target.value })}
                  >
                    <option value="">— Chọn model —</option>
                    {options.map((m) => (
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
              disabled={addLineDisabled}
              title={addLineDisabled ? 'Đã khai hết model đang có trong kho' : undefined}
              className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-white/[0.12] dark:text-slate-300 dark:hover:bg-white/[0.05]"
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

      {/* MODAL QUÉT MÃ QR TẠO PHIẾU BẰNG ĐIỆN THOẠI */}
      <MobileBorrowQRModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
}
