'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crosshair, Download, Loader2, RotateCcw, ImageOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { apiErrorMessage, isCanceledRequest } from '@/lib/product-image/api-error';
import {
  DEFAULT_PLACEMENT,
  PLACEMENT_SCALE_MAX,
  PLACEMENT_SCALE_MIN,
  clampPlacement,
  computeDrawRect,
  exportFileName,
  moveByDrag,
  toPercentRect,
  type Placement,
  type Size,
} from '@/lib/product-image/background-placement';
import { DEFAULT_SHADOW_HEIGHT, DEFAULT_SHADOW_STRENGTH, estimateWarmth } from '@/lib/product-image/realism';
import { CHECKERBOARD_STYLE, ImageDropzone } from './ImageDropzone';
import { downloadUrl, loadImage } from './download';
import { averageColor, useRealismLayers, type RealismSettings } from './useRealismLayers';

interface LoadedImage extends Size {
  src: string;
}

/** Chiều cao tối đa khung xem trước — ảnh phòng dọc 9:16 vẫn nằm gọn trong màn hình laptop. */
const PREVIEW_MAX_HEIGHT_PX = 560;

/**
 * Chế độ "Ghép background" — 0đ. Ảnh SP được BE/AI tách nền bằng rembg; việc dán lên ảnh phòng
 * làm ngay ở trình duyệt: xem trước bằng CSS, xuất bằng canvas, cả hai cùng đọc
 * `computeDrawRect` nên ảnh tải về khớp đúng cái đang thấy.
 *
 * "Cho giống ảnh chụp thật" (bật sẵn): bóng dưới chân theo đường cong đo từ ảnh chụp thật, ánh sáng
 * sản phẩm kéo về ánh sáng của nền — xem lib/product-image/realism.ts.
 */
export function BackgroundComposer() {
  const [productFile, setProductFile] = useState<File | null>(null);
  const [cutout, setCutout] = useState<LoadedImage | null>(null);
  const [cutoutStatus, setCutoutStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  const [cutoutError, setCutoutError] = useState<string | null>(null);

  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [background, setBackground] = useState<LoadedImage | null>(null);

  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [isExporting, setIsExporting] = useState(false);

  // Mặc định người dùng chốt (2026-09-29): bóng đậm 100% (đúng ảnh thật), cao 1,8 lần.
  const [realism, setRealism] = useState<RealismSettings>({
    shadow: true,
    shadowStrength: DEFAULT_SHADOW_STRENGTH,
    shadowHeight: DEFAULT_SHADOW_HEIGHT,
    look: true,
    warmth: 0,
  });
  // Mức ánh vàng ấm tự suy từ ảnh nền; người dùng kéo tay rồi thì không tự đè lên nữa.
  const [autoWarmth, setAutoWarmth] = useState<number | null>(null);
  const warmthTouchedRef = useRef(false);
  const { layers, busy: realismBusy } = useRealismLayers(cutout?.src ?? null, realism);

  const cutoutAbortRef = useRef<AbortController | null>(null);
  const cutoutRequestIdRef = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; start: Placement } | null>(null);

  useEffect(() => () => cutoutAbortRef.current?.abort(), []);

  // Ảnh phòng: đọc kích thước thật để xuất đúng độ phân giải gốc.
  useEffect(() => {
    if (!backgroundFile) {
      setBackground(null);
      return;
    }
    const url = URL.createObjectURL(backgroundFile);
    let cancelled = false;
    loadImage(url)
      .then((image) => {
        if (!cancelled) setBackground({ src: url, width: image.naturalWidth, height: image.naturalHeight });
      })
      .catch(() => {
        if (!cancelled) toast.error('Không đọc được ảnh background, thử ảnh khác.');
      });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [backgroundFile]);

  useEffect(() => {
    if (!background) {
      setAutoWarmth(null);
      return;
    }
    let cancelled = false;
    averageColor(background.src)
      .then(([r, g, b]) => {
        if (cancelled) return;
        const warmth = estimateWarmth(r, g, b);
        setAutoWarmth(warmth);
        if (!warmthTouchedRef.current) setRealism((prev) => ({ ...prev, warmth }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [background]);

  const resetRealism = () => {
    warmthTouchedRef.current = false;
    setRealism({
      shadow: true,
      shadowStrength: DEFAULT_SHADOW_STRENGTH,
      shadowHeight: DEFAULT_SHADOW_HEIGHT,
      look: true,
      warmth: autoWarmth ?? 0,
    });
  };

  const runCutout = async (file: File) => {
    cutoutAbortRef.current?.abort();
    const controller = new AbortController();
    cutoutAbortRef.current = controller;
    const requestId = ++cutoutRequestIdRef.current;

    setCutout(null);
    setCutoutStatus('processing');
    setCutoutError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post('/product-image/cutout', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });
      if (requestId !== cutoutRequestIdRef.current) return; // đã có ảnh SP mới hơn
      setCutout({ src: res.data.imageData, width: res.data.width, height: res.data.height });
      setCutoutStatus('idle');
    } catch (err) {
      if (isCanceledRequest(err) || requestId !== cutoutRequestIdRef.current) return;
      setCutoutStatus('error');
      setCutoutError(apiErrorMessage(err, 'Tách nền thất bại, vui lòng thử lại.'));
    }
  };

  const handleProductFile = (file: File) => {
    setProductFile(file);
    runCutout(file);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, start: placement };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    const box = previewRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== e.pointerId || !box) return;
    setPlacement(moveByDrag(drag.start, e.clientX - drag.x, e.clientY - drag.y, { width: box.width, height: box.height }));
  };

  const endDrag = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const handleExport = async () => {
    if (!background || !cutout || isExporting || realismBusy) return;
    setIsExporting(true);
    try {
      const bgImage = await loadImage(background.src);
      // Vẽ đúng 2 lớp đang xem trước (bóng + sản phẩm đã chỉnh) để ảnh tải về khớp màn hình.
      const productImage = layers?.product ?? (await loadImage(cutout.src));
      const canvas = document.createElement('canvas');
      canvas.width = background.width;
      canvas.height = background.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
      // Xuất JPEG: ảnh phòng PNG có vùng trong suốt sẽ thành đen nếu không lót nền trắng trước.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgImage, 0, 0, background.width, background.height);
      const rect = computeDrawRect(background, cutout, placement);
      ctx.imageSmoothingQuality = 'high';
      if (layers?.shadow) {
        ctx.drawImage(layers.shadow, rect.x, rect.y, rect.width, rect.height * layers.shadowHeightRatio);
      }
      ctx.drawImage(productImage, rect.x, rect.y, rect.width, rect.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Không dựng được file ảnh');
      const url = URL.createObjectURL(blob);
      downloadUrl(url, exportFileName('anh-sp-ghep-phong', 'jpg'));
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err: any) {
      toast.error(err?.message || 'Xuất ảnh thất bại, vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  const percentRect = background && cutout ? toPercentRect(computeDrawRect(background, cutout, placement), background) : null;
  const scalePercent = Math.round(placement.scale * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      <div className="space-y-5">
        <ImageDropzone
          title="1. Ảnh sản phẩm mới"
          hint="Ảnh nhà cung cấp/catalog, tốt nhất nền trắng. Tự tách nền ngay khi chọn."
          file={productFile}
          onFile={handleProductFile}
          previewSrc={cutout?.src}
          checkerboard={!!cutout}
          disabled={cutoutStatus === 'processing'}
          overlay={
            cutoutStatus === 'processing' ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4441cc]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tách nền...
              </span>
            ) : null
          }
        />
        {cutoutStatus === 'error' && cutoutError && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{cutoutError}</p>
              {productFile && (
                <button type="button" onClick={() => runCutout(productFile)} className="mt-1 font-semibold underline">
                  Thử lại
                </button>
              )}
            </div>
          </div>
        )}
        <ImageDropzone
          title="2. Ảnh background phòng"
          hint="Ảnh phòng media đã chụp sẵn."
          file={backgroundFile}
          onFile={setBackgroundFile}
        />
      </div>

      <div className="border border-[#e2e0ea] rounded-2xl bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1b1b1d]">Xem trước</h3>
            <p className="text-xs text-[#9c9aa8]">Kéo sản phẩm để đổi vị trí, chỉnh kích thước bằng thanh trượt.</p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!percentRect || isExporting || realismBusy}
            className="px-4 py-2 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Tải ảnh về
          </button>
        </div>

        {background && percentRect && cutout ? (
          <>
            <div
              ref={previewRef}
              className="relative mx-auto overflow-hidden rounded-xl border border-[#e2e0ea] select-none"
              style={{
                aspectRatio: `${background.width} / ${background.height}`,
                width: `min(100%, ${(PREVIEW_MAX_HEIGHT_PX * background.width) / background.height}px)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={background.src} alt="Ảnh background" draggable={false} className="absolute inset-0 w-full h-full" />
              {layers?.shadowUrl && (
                // Lớp bóng kéo dài xuống dưới chân: cùng vị trí/chiều rộng với sản phẩm, cao hơn theo tỉ lệ.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={layers.shadowUrl}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${percentRect.x}%`,
                    top: `${percentRect.y}%`,
                    width: `${percentRect.width}%`,
                    height: `${percentRect.height * layers.shadowHeightRatio}%`,
                  }}
                />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={layers?.productUrl ?? cutout.src}
                alt="Sản phẩm"
                draggable={false}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute cursor-move touch-none outline-dashed outline-1 outline-transparent hover:outline-[#4441cc]"
                style={{
                  left: `${percentRect.x}%`,
                  top: `${percentRect.y}%`,
                  width: `${percentRect.width}%`,
                  height: `${percentRect.height}%`,
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-3 flex-1 min-w-[240px] text-sm text-[#464554]">
                <span className="font-semibold whitespace-nowrap">Kích thước</span>
                <input
                  type="range"
                  min={Math.round(PLACEMENT_SCALE_MIN * 100)}
                  max={Math.round(PLACEMENT_SCALE_MAX * 100)}
                  value={scalePercent}
                  onChange={(e) => setPlacement((p) => clampPlacement({ ...p, scale: Number(e.target.value) / 100 }))}
                  className="flex-1 accent-[#4441cc]"
                />
                <span className="w-10 text-right tabular-nums">{scalePercent}%</span>
              </label>
              <button
                type="button"
                onClick={() => setPlacement((p) => ({ ...p, centerX: 0.5, centerY: 0.5 }))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e0ea] text-sm font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc]"
              >
                <Crosshair className="w-4 h-4" />
                Căn giữa
              </button>
              <button
                type="button"
                onClick={() => setPlacement(DEFAULT_PLACEMENT)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e0ea] text-sm font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc]"
              >
                <RotateCcw className="w-4 h-4" />
                Đặt lại
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#e2e0ea] bg-[#fcfbff] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-[#1b1b1d]">Cho giống ảnh chụp thật</h4>
                <div className="flex items-center gap-3">
                  {realismBusy && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#9c9aa8]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang xử lý…
                    </span>
                  )}
                  <button type="button" onClick={resetRealism} className="text-xs font-semibold text-[#4441cc] hover:underline">
                    Về mặc định
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-[#1b1b1d]">
                <input
                  type="checkbox"
                  checked={realism.shadow}
                  onChange={(e) => setRealism((prev) => ({ ...prev, shadow: e.target.checked }))}
                  className="accent-[#4441cc]"
                />
                Bóng dưới chân sản phẩm
              </label>
              <RangeRow
                label="Độ đậm"
                min={0}
                max={150}
                step={5}
                value={Math.round(realism.shadowStrength * 100)}
                display={`${Math.round(realism.shadowStrength * 100)}%`}
                disabled={!realism.shadow}
                onChange={(v) => setRealism((prev) => ({ ...prev, shadowStrength: v / 100 }))}
              />
              <RangeRow
                label="Độ cao"
                min={5}
                max={25}
                step={1}
                value={Math.round(realism.shadowHeight * 10)}
                display={`${realism.shadowHeight.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}×`}
                disabled={!realism.shadow}
                onChange={(v) => setRealism((prev) => ({ ...prev, shadowHeight: v / 10 }))}
              />

              <label className="flex items-center gap-2 text-sm font-semibold text-[#1b1b1d] pt-1">
                <input
                  type="checkbox"
                  checked={realism.look}
                  onChange={(e) => setRealism((prev) => ({ ...prev, look: e.target.checked }))}
                  className="accent-[#4441cc]"
                />
                Khớp ánh sáng với nền
              </label>
              <RangeRow
                label="Ánh vàng ấm"
                min={0}
                max={100}
                step={5}
                value={Math.round(realism.warmth * 100)}
                display={`${Math.round(realism.warmth * 100)}%`}
                disabled={!realism.look}
                onChange={(v) => {
                  warmthTouchedRef.current = true;
                  setRealism((prev) => ({ ...prev, warmth: v / 100 }));
                }}
              />
              <p className="text-[11px] text-[#9c9aa8]">
                Độ đậm 100% = tối đúng như bóng trong ảnh chụp thật của media. Ánh vàng ấm tự đặt theo màu ảnh nền
                {autoWarmth !== null ? ` (${Math.round(autoWarmth * 100)}%)` : ''}; nền trắng thì để 0%.
              </p>
            </div>
          </>
        ) : (
          <div
            className="h-[420px] rounded-xl border border-[#e2e0ea] flex flex-col items-center justify-center text-center px-6"
            style={cutout && !background ? CHECKERBOARD_STYLE : { background: '#fafafb' }}
          >
            {cutout && !background ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cutout.src} alt="Sản phẩm đã tách nền" className="max-h-full max-w-full object-contain" />
            ) : (
              <>
                <ImageOff className="w-8 h-8 text-[#c7c4d7] mb-2" />
                <p className="text-sm text-[#9c9aa8]">Chọn ảnh sản phẩm và ảnh background để ghép.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RangeRow({
  label,
  min,
  max,
  step,
  value,
  display,
  disabled,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={`flex items-center gap-3 text-sm text-[#464554] pl-6 ${disabled ? 'opacity-40' : ''}`}>
      <span className="w-24 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#4441cc]"
      />
      <span className="w-12 text-right tabular-nums">{display}</span>
    </label>
  );
}
