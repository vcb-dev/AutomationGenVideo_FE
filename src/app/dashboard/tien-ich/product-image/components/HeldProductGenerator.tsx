'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Coins, Download, ImageOff, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { apiErrorMessage, isCanceledRequest } from '@/lib/product-image/api-error';
import { exportFileName } from '@/lib/product-image/background-placement';
import { formatGenerationCost, formatVnd, summarizeSession } from '@/lib/product-image/cost-view';
import {
  HELD_PRODUCT_NOTE_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  buildHeldProductFormData,
  extensionForMime,
  validateHeldProductInput,
} from '@/lib/product-image/held-product-request';
import { ImageDropzone } from './ImageDropzone';
import { downloadUrl } from './download';

interface GeneratedImage {
  src: string;
  mimeType: string;
  createdAt: Date;
  productName: string;
  /** null khi BE không ghi được nhật ký lượt này — không bấm "Đạt" được. */
  generationId: string | null;
  cost: { usd: number | null; vnd: number | null; note: string | null };
  approved: boolean;
  approving: boolean;
}

/**
 * Chế độ "Chị Nhạm cầm SP" — TỐN phí Gemini mỗi lượt. Không dán đè được như ghép background vì
 * tay phải ôm lấy SP cho tự nhiên, nên gửi Gemini ảnh chị Nhạm đang cầm SP cũ + ảnh SP mới.
 *
 * Mỗi lượt tạo đều hỏi xác nhận phí (kể cả "Tạo lại") và hiện luôn lượt đó tốn bao nhiêu. Các lượt
 * trong phiên được giữ lại để so và bấm "Đạt" cho ảnh dùng được — số ảnh đạt là mẫu số của hai chỉ
 * số ở tab Chi phí (số lượt / 1 ảnh đạt, chi phí / 1 ảnh đạt).
 */
export function HeldProductGenerator() {
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productName, setProductName] = useState('');
  const [note, setNote] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [selected, setSelected] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const input = { personImage, productImage, productName, note };

  const requestGenerate = () => {
    const problem = validateHeldProductInput(input);
    if (problem) {
      toast.error(problem);
      return;
    }
    setConfirmOpen(true);
  };

  const generate = async () => {
    setConfirmOpen(false);
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await apiClient.post('/product-image/held-product', buildHeldProductFormData(input), {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });
      const cost = res.data.cost ?? { usd: null, vnd: null, note: null };
      setResults((prev) => [
        {
          src: res.data.imageData,
          mimeType: res.data.mimeType,
          createdAt: new Date(),
          productName: productName.trim(),
          generationId: res.data.generationId ?? null,
          cost,
          approved: false,
          approving: false,
        },
        ...prev,
      ]);
      setSelected(0);
      // Chưa tính được tiền (vd thiếu đơn giá model trên server) → báo ngay, kèm tên biến cần sửa.
      if (cost.note) toast(cost.note, { icon: '⚠️', duration: 8000 });
    } catch (err) {
      if (isCanceledRequest(err)) return;
      setError(apiErrorMessage(err, 'Tạo ảnh thất bại, vui lòng thử lại.'));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    // Huỷ chỉ dừng chờ ở trình duyệt; yêu cầu đã tới Gemini thì vẫn bị tính phí.
    toast('Đã dừng chờ. Lượt đã gửi tới Gemini vẫn có thể bị tính phí.', { icon: 'ℹ️' });
  };

  const patchResult = (generationId: string, patch: Partial<GeneratedImage>) =>
    setResults((prev) => prev.map((r) => (r.generationId === generationId ? { ...r, ...patch } : r)));

  const toggleApproved = async (result: GeneratedImage) => {
    if (!result.generationId || result.approving) return;
    const next = !result.approved;
    patchResult(result.generationId, { approving: true });
    try {
      const res = await apiClient.patch(`/product-image/generations/${result.generationId}`, { approved: next });
      patchResult(result.generationId, { approved: Boolean(res.data?.approved), approving: false });
    } catch (err) {
      patchResult(result.generationId, { approving: false });
      toast.error(apiErrorMessage(err, 'Không lưu được đánh dấu "Đạt", vui lòng thử lại.'));
    }
  };

  const current = results[selected] ?? null;
  const session = summarizeSession(results);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <ImageDropzone
            title="1. Chị Nhạm cầm SP cũ"
            hint="Ảnh source có sẵn của media."
            file={personImage}
            onFile={setPersonImage}
            heightClass="h-[240px]"
            disabled={isGenerating}
          />
          <ImageDropzone
            title="2. Sản phẩm mới"
            hint="Ảnh NCC/catalog."
            file={productImage}
            onFile={setProductImage}
            heightClass="h-[240px]"
            disabled={isGenerating}
          />
        </div>

        <div>
          <label htmlFor="held-product-name" className="text-sm font-bold text-[#1b1b1d]">
            Tên sản phẩm <span className="text-rose-600">*</span>
          </label>
          <p className="text-xs text-[#9c9aa8] mb-2">Dùng để thống kê số lượt tạo và chi phí theo từng sản phẩm.</p>
          <input
            id="held-product-name"
            value={productName}
            maxLength={PRODUCT_NAME_MAX_LENGTH}
            onChange={(e) => setProductName(e.target.value)}
            disabled={isGenerating}
            placeholder="vd Nhẫn Kim Vũ S925 đính Moissanite 7mm"
            className="w-full rounded-xl border border-[#e2e0ea] px-3 py-2 text-sm focus:outline-none focus:border-[#4441cc] disabled:bg-[#fafafb]"
          />
        </div>

        <div>
          <label htmlFor="held-product-note" className="text-sm font-bold text-[#1b1b1d]">
            Ghi chú cho AI <span className="font-normal text-[#9c9aa8]">(không bắt buộc)</span>
          </label>
          <p className="text-xs text-[#9c9aa8] mb-2">
            Nên ghi kích thước thật để AI không vẽ sai tỉ lệ, vd &quot;hộp cao khoảng 30cm, cầm bằng tay phải&quot;.
          </p>
          <textarea
            id="held-product-note"
            value={note}
            maxLength={HELD_PRODUCT_NOTE_MAX_LENGTH}
            onChange={(e) => setNote(e.target.value)}
            disabled={isGenerating}
            rows={3}
            className="w-full rounded-xl border border-[#e2e0ea] px-3 py-2 text-sm focus:outline-none focus:border-[#4441cc] disabled:bg-[#fafafb]"
          />
          <p className="text-right text-xs text-[#9c9aa8]">
            {note.length}/{HELD_PRODUCT_NOTE_MAX_LENGTH}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2">
          <Coins className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Mỗi lần bấm tạo (kể cả tạo lại) đều tính phí Gemini. Ảnh lỗi tay, logo, kích thước thì tạo lại.</span>
        </div>

        <button
          type="button"
          onClick={requestGenerate}
          disabled={isGenerating}
          className="w-full px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {results.length ? 'Tạo thêm một ảnh' : 'Tạo ảnh'}
        </button>
      </div>

      <div className="border border-[#e2e0ea] rounded-2xl bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1b1b1d]">Kết quả</h3>
            <p className="text-xs text-[#9c9aa8]">
              {session.count
                ? `Phiên này: ${session.count} ảnh · ${formatVnd(session.knownVnd)}` +
                  (session.unknown ? ` (+${session.unknown} lượt chưa tính được tiền)` : '') +
                  ` · ${session.approved} ảnh đạt — bấm "Đạt" cho ảnh dùng được.`
                : 'Chưa tạo ảnh nào.'}
            </p>
          </div>
          {current && (
            <div className="flex flex-wrap gap-2">
              {current.generationId && (
                <button
                  type="button"
                  onClick={() => toggleApproved(current)}
                  disabled={current.approving}
                  aria-pressed={current.approved}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold disabled:opacity-50 ${
                    current.approved
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-[#e2e0ea] text-[#464554] hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  {current.approving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : current.approved ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  {current.approved ? 'Đã đạt' : 'Đạt'}
                </button>
              )}
              <button
                type="button"
                onClick={requestGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e2e0ea] text-sm font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40"
              >
                <RefreshCw className="w-4 h-4" />
                Tạo lại
              </button>
              <button
                type="button"
                onClick={() => downloadUrl(current.src, exportFileName('anh-chi-nham-cam-sp', extensionForMime(current.mimeType), current.createdAt))}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-[#4441cc] hover:bg-[#4441cc]/90"
              >
                <Download className="w-4 h-4" />
                Tải ảnh về
              </button>
            </div>
          )}
        </div>

        <div className="relative h-[520px] rounded-xl border border-[#e2e0ea] bg-[#fafafb] flex items-center justify-center overflow-hidden">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.src} alt="Ảnh chị Nhạm cầm sản phẩm mới" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-center px-6">
              <ImageOff className="w-8 h-8 text-[#c7c4d7] mx-auto mb-2" />
              <p className="text-sm text-[#9c9aa8]">Chọn 2 ảnh, nhập tên sản phẩm rồi bấm &quot;Tạo ảnh&quot;.</p>
            </div>
          )}
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-3 text-center px-6">
              <Loader2 className="w-7 h-7 animate-spin text-[#4441cc]" />
              <p className="text-sm font-semibold text-[#1b1b1d]">AI đang tạo ảnh, thường mất 10–30 giây...</p>
              <button
                type="button"
                onClick={cancel}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#464554] hover:text-rose-600"
              >
                <X className="w-3.5 h-3.5" />
                Dừng chờ
              </button>
            </div>
          )}
        </div>

        {current && (
          <p className="mt-2 text-xs text-[#464554]">
            <span className="font-semibold">{current.productName}</span> · Lượt này:{' '}
            <span className="font-semibold">{formatGenerationCost(current.cost.vnd)}</span>
            {current.cost.note && <span className="text-amber-700"> — {current.cost.note}</span>}
          </p>
        )}

        {error && !isGenerating && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        {results.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {results.map((result, index) => (
              <button
                key={result.createdAt.getTime()}
                type="button"
                onClick={() => setSelected(index)}
                className={`relative shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden bg-[#fafafb] ${
                  index === selected ? 'border-[#4441cc]' : 'border-transparent hover:border-[#c7c4d7]'
                }`}
                title={`Lượt ${results.length - index}${result.approved ? ' · Đạt' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.src} alt={`Lượt ${results.length - index}`} className="w-full h-full object-cover" />
                {result.approved && (
                  <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-emerald-600 bg-white rounded-full" aria-label="Đạt" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={generate}
        variant="primary"
        icon={<Coins className="w-5 h-5" />}
        title="Tạo ảnh bằng Gemini?"
        description="Lượt này sẽ tính phí Gemini, kể cả khi ảnh ra chưa đạt. Tiếp tục?"
        confirmText="Tạo ảnh"
      />
    </div>
  );
}
