'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, CheckCircle2, Circle, Coins, Download, Hand, ImageOff, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { apiErrorMessage, isCanceledRequest } from '@/lib/product-image/api-error';
import { exportFileName } from '@/lib/product-image/background-placement';
import { formatGenerationCost, formatVnd, summarizeSession } from '@/lib/product-image/cost-view';
import { BAG_SIZE_CLASSES, typicalWidthCm, widthCmFromName } from '@/lib/product-image/batch';
import {
  HELD_PRODUCT_ENDPOINTS,
  HELD_PRODUCT_NOTE_MAX_LENGTH,
  HELD_WIDTH_CM_RANGE,
  PRODUCT_NAME_MAX_LENGTH,
  buildHeldAutoFormData,
  buildHeldProductFormData,
  buildHeldSwapFormData,
  extensionForMime,
  validateHeldAutoInput,
  validateHeldProductInput,
  validateHeldSwapInput,
  type HeldProductMode,
} from '@/lib/product-image/held-product-request';
import { ImageDropzone } from './ImageDropzone';
import { FreeBadge, ModeOption } from './ModeOption';
import { downloadUrl } from './download';

interface GeneratedImage {
  src: string;
  mimeType: string;
  createdAt: Date;
  productName: string;
  mode: HeldProductMode;
  /** null khi BE không ghi được nhật ký lượt này hoặc lượt đổi SP 0đ — không bấm "Đạt" được. */
  generationId: string | null;
  cost: { usd: number | null; vnd: number | null; note: string | null };
  approved: boolean;
  approving: boolean;
  /** Chỉ lượt đổi SP 0đ: số bàn tay model thấy, có giữ đoạn dây đeo cũ không, cảnh báo cần soát. */
  swapInfo: { hands: number | null; strapKept: boolean; warnings: string[] } | null;
  /** Chỉ lượt tự chọn tư thế: thứ hạng tư thế (1 = hợp nhất) trong số ảnh AI trả về lượt đó. */
  pose: { rank: number; total: number } | null;
}

interface HeldAutoCandidate {
  imageData: string;
  mimeType: string;
  poseId: string | null;
  info?: { hands?: number | null; warnings?: string[] };
}

/**
 * Tab "Chị Nhạm cầm SP" — các cách tạo:
 *  - Tự chọn tư thế 0đ (mặc định, người dùng 13/10: "tôi add ảnh túi vào, bạn phân tích và ghép vào tay chị Nhạm cầm
 *    sao cho hợp lý"): chỉ cần ảnh SP mới — AI chấm điểm các ảnh chị Nhạm dựng sẵn theo dáng SP rồi ghép vào vài tư thế
 *    hợp nhất; người dùng chọn ảnh ưng nhất để tải.
 *  - Đổi SP 0đ trên ảnh tự chọn (tạm ẩn): AI service tìm SP cũ + bàn tay bằng model người cầm SP tự huấn luyện, xoá SP
 *    cũ, đặt SP mới (tách nền như tab Ghép background) vào tay và dán tay lên trên.
 *  - Gemini: TỐN phí mỗi lượt — gửi ảnh chị Nhạm cầm SP cũ + ảnh SP mới cho Gemini vẽ lại. Mỗi lượt đều hỏi xác nhận
 *    phí và hiện tiền lượt đó; bấm "Đạt" cho ảnh dùng được (mẫu số hai chỉ số của tab Chi phí).
 * Các lượt trong phiên được giữ lại để so.
 */
export function HeldProductGenerator() {
  const [mode, setMode] = useState<HeldProductMode>('auto');
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productName, setProductName] = useState('');
  const [note, setNote] = useState('');
  // Bề ngang thật thân túi (cm) — bắt buộc ở chế độ tự chọn tư thế; tự điền từ mã SP trong tên file (TX018-25 → 25).
  const [widthCm, setWidthCm] = useState<number | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMode, setGeneratingMode] = useState<HeldProductMode>('auto');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [selected, setSelected] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const input = { personImage, productImage, productName, note, widthCm };

  const pickProduct = (file: File | null) => {
    setProductImage(file);
    // Đổi ảnh SP thì số cm cũ không còn đúng: lấy theo mã SP trong tên file mới, không có thì để trống bắt nhập lại.
    setWidthCm(file ? widthCmFromName(file.name) : null);
  };

  const changeWidth = (raw: string) => {
    const value = raw.trim() === '' ? null : Number(raw.replace(',', '.'));
    setWidthCm(value !== null && Number.isFinite(value) ? value : null);
  };

  const requestGenerate = () => {
    const problem =
      mode === 'auto' ? validateHeldAutoInput(input) : mode === 'swap' ? validateHeldSwapInput(input) : validateHeldProductInput(input);
    if (problem) {
      toast.error(problem);
      return;
    }
    // Hai cách 0đ không tốn gì → chạy luôn; Gemini thì hỏi xác nhận phí mỗi lượt.
    if (mode !== 'gemini') void generate();
    else setConfirmOpen(true);
  };

  const generate = async () => {
    setConfirmOpen(false);
    const runMode = mode;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setGeneratingMode(runMode);
    setError(null);
    try {
      const form =
        runMode === 'auto'
          ? buildHeldAutoFormData(input)
          : runMode === 'swap'
            ? buildHeldSwapFormData(input)
            : buildHeldProductFormData(input);
      const res = await apiClient.post(HELD_PRODUCT_ENDPOINTS[runMode], form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });
      const cost = res.data.cost ?? { usd: null, vnd: null, note: null };
      if (runMode === 'auto') {
        const candidates: HeldAutoCandidate[] = Array.isArray(res.data.candidates) ? res.data.candidates : [];
        const createdAt = new Date();
        setResults((prev) => [
          ...candidates.map((c, index) => ({
            src: c.imageData,
            mimeType: c.mimeType,
            createdAt: new Date(createdAt.getTime() + index),
            productName: productName.trim(),
            mode: runMode,
            generationId: null,
            cost,
            approved: false,
            approving: false,
            swapInfo: { hands: c.info?.hands ?? null, strapKept: false, warnings: c.info?.warnings ?? [] },
            pose: { rank: index + 1, total: candidates.length },
          })),
          ...prev,
        ]);
        setSelected(0);
        return;
      }
      const swapInfo =
        runMode === 'swap'
          ? {
              hands: res.data.info?.hands ?? null,
              strapKept: Boolean(res.data.info?.strapKept),
              warnings: Array.isArray(res.data.info?.warnings) ? res.data.info.warnings : [],
            }
          : null;
      setResults((prev) => [
        {
          src: res.data.imageData,
          mimeType: res.data.mimeType,
          createdAt: new Date(),
          productName: productName.trim(),
          mode: runMode,
          generationId: runMode === 'gemini' ? res.data.generationId ?? null : null,
          cost,
          approved: false,
          approving: false,
          swapInfo,
          pose: null,
        },
        ...prev,
      ]);
      setSelected(0);
      // Chưa tính được tiền (vd thiếu đơn giá model trên server) → báo ngay, kèm tên biến cần sửa.
      if (cost.note && runMode === 'gemini') toast(cost.note, { icon: '⚠️', duration: 8000 });
      if (swapInfo?.warnings.length) toast(swapInfo.warnings[0], { icon: '⚠️', duration: 8000 });
    } catch (err) {
      if (isCanceledRequest(err)) return;
      setError(apiErrorMessage(err, runMode === 'gemini' ? 'Tạo ảnh thất bại, vui lòng thử lại.' : 'Ghép sản phẩm thất bại, vui lòng thử lại.'));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    // Huỷ chỉ dừng chờ ở trình duyệt; yêu cầu đã tới Gemini thì vẫn bị tính phí.
    toast(generatingMode === 'gemini' ? 'Đã dừng chờ. Lượt đã gửi tới Gemini vẫn có thể bị tính phí.' : 'Đã dừng chờ.', { icon: 'ℹ️' });
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
  const hasGemini = results.some((r) => r.mode === 'gemini');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
      <div className="space-y-5">
        {mode === 'auto' ? (
          <div className="space-y-3">
            <ImageDropzone
              title="1. Sản phẩm mới"
              hint="Ảnh NCC/catalog — máy tự chọn ảnh chị Nhạm cầm túi cùng dáng, cùng cỡ để ghép."
              file={productImage}
              onFile={pickProduct}
              heightClass="h-[260px]"
              disabled={isGenerating}
            />
            <div>
              <label htmlFor="held-width-cm" className="text-sm font-bold text-[#1b1b1d]">
                Bề ngang túi (cm) <span className="text-rose-600">*</span>
              </label>
              <p className="text-xs text-[#9c9aa8] mb-2">
                Bề ngang thật của thân túi — máy đo theo khung ảnh chụp chị Nhạm để túi ra đúng cỡ so với người. Tên file
                có mã SP (vd TX018-25) thì tự điền.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="held-width-cm"
                  type="number"
                  inputMode="decimal"
                  min={HELD_WIDTH_CM_RANGE[0]}
                  max={HELD_WIDTH_CM_RANGE[1]}
                  value={widthCm ?? ''}
                  onChange={(e) => changeWidth(e.target.value)}
                  disabled={isGenerating}
                  placeholder="vd 25"
                  className={`w-24 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-[#4441cc] disabled:bg-[#fafafb] ${
                    widthCm === null ? 'border-amber-300 bg-amber-50' : 'border-[#e2e0ea]'
                  }`}
                />
                <span className="text-sm text-[#9c9aa8]">cm</span>
                {BAG_SIZE_CLASSES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setWidthCm(typicalWidthCm(size))}
                    className="rounded-lg border border-[#e2e0ea] px-2.5 py-1.5 text-xs font-semibold text-[#5b5970] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-50"
                  >
                    {size.label} · {typicalWidthCm(size)}cm
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
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
        )}

        <fieldset disabled={isGenerating} className="space-y-2">
          <h3 className="text-sm font-bold text-[#1b1b1d]">{mode === 'auto' ? '2.' : '3.'} Cách tạo</h3>
          <ModeOption
            active={mode === 'auto'}
            onSelect={() => setMode('auto')}
            icon={<Hand className="w-4 h-4" />}
            title="Ghép vào tay chị Nhạm — tự chọn tư thế"
            badge={<FreeBadge />}
            description="0đ. Máy phân tích dáng sản phẩm (thân, quai) rồi chọn các ảnh chị Nhạm đang cầm túi cùng dáng, cùng cỡ nhất, xoá túi cũ và đặt sản phẩm mới vào đúng tay, đúng cỡ thật. Ra vài ảnh để chọn ảnh ưng nhất."
          />
          {/* Đổi SP trên ảnh tự chọn (0đ) và Gemini (tính phí) tạm ẩn — người dùng 13/10: chỉ thêm ảnh túi, máy tự chọn
              tư thế; chỉ dùng model tự huấn luyện, 0đ. */}
        </fieldset>

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

        {mode === 'gemini' && (
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
        )}

        {mode === 'auto' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex gap-2">
            <Hand className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Không tính phí. Túi ra đúng cỡ thật theo số cm đã nhập (lệch ~5%) — máy chọn ảnh chị đang cầm túi cùng cỡ.</span>
          </div>
        ) : mode === 'gemini' ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2">
            <Coins className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Mỗi lần bấm tạo (kể cả tạo lại) đều tính phí Gemini. Ảnh lỗi tay, logo, kích thước thì tạo lại.</span>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex gap-2">
            <ArrowLeftRight className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Không tính phí. Sản phẩm mới được đặt theo cỡ sản phẩm cũ trên tay — sản phẩm thật to/nhỏ hơn hẳn thì soát lại tỉ lệ.</span>
          </div>
        )}

        <button
          type="button"
          onClick={requestGenerate}
          disabled={isGenerating}
          className="w-full px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {mode === 'auto' ? <Hand className="w-4 h-4" /> : mode === 'swap' ? <ArrowLeftRight className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {mode === 'auto'
            ? 'Ghép vào tay chị Nhạm'
            : mode === 'swap'
              ? results.length ? 'Đổi thêm một ảnh' : 'Đổi sản phẩm'
              : results.length ? 'Tạo thêm một ảnh' : 'Tạo ảnh'}
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
                  (hasGemini ? ` · ${session.approved} ảnh đạt — bấm "Đạt" cho ảnh Gemini dùng được.` : '')
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
              {/* Tự chọn tư thế ra cùng kết quả với cùng ảnh SP — chạy lại không có ảnh mới nên không có nút này. */}
              {mode !== 'auto' && (
                <button
                  type="button"
                  onClick={requestGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e2e0ea] text-sm font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40"
                >
                  <RefreshCw className="w-4 h-4" />
                  {mode === 'swap' ? 'Đổi lại' : 'Tạo lại'}
                </button>
              )}
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
              <p className="text-sm text-[#9c9aa8]">
                {mode === 'auto'
                  ? 'Chọn ảnh sản phẩm, nhập tên rồi bấm "Ghép vào tay chị Nhạm".'
                  : `Chọn 2 ảnh, nhập tên sản phẩm rồi bấm "${mode === 'swap' ? 'Đổi sản phẩm' : 'Tạo ảnh'}".`}
              </p>
            </div>
          )}
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-3 text-center px-6">
              <Loader2 className="w-7 h-7 animate-spin text-[#4441cc]" />
              <p className="text-sm font-semibold text-[#1b1b1d]">
                {generatingMode === 'auto'
                  ? 'Máy đang chọn tư thế hợp với sản phẩm và ghép, thường mất 15–40 giây (lần đầu sau khi khởi động lâu hơn)...'
                  : generatingMode === 'swap'
                    ? 'Máy đang đổi sản phẩm, thường mất 10–30 giây (lần đầu sau khi khởi động lâu hơn)...'
                    : 'AI đang tạo ảnh, thường mất 10–30 giây...'}
              </p>
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
            <span className="font-semibold">{current.productName}</span> ·{' '}
            {current.mode !== 'gemini' ? (
              <>
                {current.pose && `Tư thế hợp thứ ${current.pose.rank}/${current.pose.total} · `}
                Đổi sản phẩm <span className="font-semibold">0đ</span>
                {current.swapInfo?.hands != null && ` · thấy ${current.swapInfo.hands} bàn tay`}
                {current.swapInfo?.strapKept && ' · giữ đoạn dây đeo cũ trên tay'}
              </>
            ) : (
              <>
                Lượt này: <span className="font-semibold">{formatGenerationCost(current.cost.vnd)}</span>
                {current.cost.note && <span className="text-amber-700"> — {current.cost.note}</span>}
              </>
            )}
          </p>
        )}

        {current?.swapInfo?.warnings.map((warning) => (
          <div key={warning} className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{warning}</span>
          </div>
        ))}

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
                title={`Ảnh ${results.length - index}${result.pose ? ` · tư thế hợp thứ ${result.pose.rank}` : ''}${result.mode !== 'gemini' ? ' · 0đ' : ''}${result.approved ? ' · Đạt' : ''}`}
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
