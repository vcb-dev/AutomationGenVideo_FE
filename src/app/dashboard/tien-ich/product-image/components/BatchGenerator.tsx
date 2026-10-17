'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Coins,
  Download,
  FileArchive,
  ImageOff,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  StopCircle,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { apiErrorMessage, isCanceledRequest } from '@/lib/product-image/api-error';
import { exportFileName } from '@/lib/product-image/background-placement';
import {
  DEFAULT_BACKGROUND_PRESET_ID,
  UPLOADED_BACKGROUND_LAYOUT,
  findBackgroundPreset,
  placementForBody,
  placementForPreset,
  type BackgroundLayout,
  type BodyBox,
} from '@/lib/product-image/background-presets';
import {
  BATCH_CONCURRENCY,
  cutoutDetectionLabel,
  DEFAULT_BATCH_MODE,
  geminiBatchCostText,
  productNameFromFileName,
  requeueCutoutResults,
  BAG_SIZE_CLASSES,
  FALLBACK_SIZE_CLASS,
  SIZE_CM_RANGE,
  typicalWidthCm,
  widthCmFromName,
  type BagSizeClass,
  runWithConcurrency,
  shouldAutoRun,
  slugifyFileName,
  summarizeBatch,
  uniqueFileNames,
  type BatchItemStatus,
  type BatchMode,
  type GeminiEstimate,
} from '@/lib/product-image/batch';
import { formatGenerationCost, formatVnd } from '@/lib/product-image/cost-view';
import { HELD_PRODUCT_NOTE_MAX_LENGTH, PRODUCT_NAME_MAX_LENGTH, extensionForMime } from '@/lib/product-image/held-product-request';
import {
  DEFAULT_SHADOW_HEIGHT,
  DEFAULT_SHADOW_STRENGTH,
  addedWarmth,
  estimateWarmth,
  sameLightAsScene,
  type SceneLight,
} from '@/lib/product-image/realism';
import { buildScenePlacementFormData, validateScenePlacementInput } from '@/lib/product-image/scene-placement-request';
import { PRODUCT_IMAGE_ACCEPT, PRODUCT_IMAGE_MAX_BYTES } from '@/lib/product-image/upload-validation';
import { fitProductImageFile } from '@/lib/product-image/shrink-image';
import { createZip } from '@/lib/product-image/zip';
import { BackgroundPicker, UPLOADED_BACKGROUND } from './BackgroundPicker';
import { ModeOption } from './ModeOption';
import { analyzeBackgroundLight, averageColor, borderColor, buildRealismCanvases, readCutoutPixels, renderComposite } from './composite';
import { downloadUrl, loadImage } from './download';

interface ItemCost {
  usd: number | null;
  vnd: number | null;
  note: string | null;
}

interface BatchResult {
  /** data: (ảnh Gemini) hoặc blob: (ảnh ghép nền — phải thu hồi khi bỏ). */
  src: string;
  mimeType: string;
  mode: BatchMode;
  /** null khi ghép nền, hoặc khi BE không ghi được nhật ký lượt Gemini — không bấm "Đạt" được. */
  generationId: string | null;
  /** Tiền lượt AI của ảnh này: Gemini tạo ảnh; tách nền (model tự huấn luyện) luôn 0đ. */
  cost: ItemCost | null;
  approved: boolean;
  approving: boolean;
}

interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  /** Bề ngang thân túi thật (cm) — tự đọc từ mã SP trong tên file (TX018-25 → 25), sửa được; null = chưa biết. */
  widthCm: number | null;
  status: BatchItemStatus;
  error: string | null;
  /** Ảnh SP đã tách nền (blob:) — giữ lại để đổi nền thì ghép lại ngay, không tách nền lần nữa. */
  cutoutSrc: string | null;
  /** Tiền lần tách nền đó — ảnh ghép lại lên nền khác dùng lại, không tốn thêm. */
  cutoutCost: ItemCost | null;
  /** Lần tách nền đó có thể còn dính giá đỡ/đạo cụ (model chưa chắc nên chưa cắt phần dính liền túi) — lý do để hiện cảnh báo. */
  cutoutWarning: string | null;
  /** Khung thân túi trong ảnh tách nền (AI trả) — đặt theo thân để mọi túi cùng cỡ; null thì đặt theo cả SP. */
  cutoutBody: BodyBox | null;
  /** Ai nhận diện SP lần tách nền đó (model tự huấn luyện, 0đ) — hiện cạnh tiền lượt này. */
  cutoutDetectedBy: string | null;
  /** Ảnh gốc không đủ làm ảnh thương mại (AI báo: túi bị cắt ở mép ảnh gốc, túi quá nhỏ) — vẫn ghép, hiện cảnh báo. */
  sourceWarnings: string[];
  result: BatchResult | null;
}

/** Thông tin cảnh dùng chung cho mọi SP của một lượt chạy — chuẩn bị một lần khi bắt đầu chạy. */
type RunContext =
  | { mode: 'gemini'; sceneFile: File; note: string; release: () => void }
  | {
      mode: 'cutout';
      background: { src: string; width: number; height: number };
      layout: BackgroundLayout;
      warmth: number;
      /** Ánh sáng cảnh của ảnh nền — null khi không phân tích được (vẫn ghép, chỉ không chỉnh sáng theo cảnh). */
      scene: SceneLight | null;
      /** Thu hồi URL tạm của ảnh nền tự tải lên khi lượt chạy xong. */
      release: () => void;
    };

type ItemOutcome = 'done' | 'error' | 'canceled';

/** Số cm dùng được để đặt cỡ (trong SIZE_CM_RANGE), còn lại coi như chưa biết. */
const usableWidthCm = (cm: number | null) => (cm !== null && cm >= SIZE_CM_RANGE[0] && cm <= SIZE_CM_RANGE[1] ? cm : null);
/** Số cm đặt cỡ khi ghép: số người dùng/mã SP cho, chưa có thì theo cỡ tạm (FALLBACK_SIZE_CLASS). */
const placementWidthCm = (cm: number | null) => usableWidthCm(cm) ?? typicalWidthCm(FALLBACK_SIZE_CLASS);

const revokeBlob = (url: string | null | undefined) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
};

const releaseItem = (item: BatchItem) => {
  URL.revokeObjectURL(item.previewUrl);
  revokeBlob(item.cutoutSrc);
  revokeBlob(item.result?.src);
};

/** Lỗi axios → lời BE/AI; lỗi dựng ảnh ở trình duyệt → lời của chính lỗi đó. */
const errorText = (err: any, fallback: string) =>
  err?.isAxiosError ? apiErrorMessage(err, fallback) : err?.message || fallback;

/**
 * Tab "Ghép background" (mặc định khi mở trang, tab DUY NHẤT của việc ghép nền) — thả nhiều ảnh SP,
 * mỗi SP ra một ảnh, không chỉnh tay gì:
 *  - Tách nền (mặc định): thả ảnh là tự chạy — rembg tách nền + model tự huấn luyện nhận diện đúng SP
 *    (bỏ giá trưng bày, đạo cụ; 0đ — không gọi Gemini), SP tự đứng lên mặt hộp của nền có
 *    sẵn (nền tự tải lên: giữa ảnh, sát đáy — UPLOADED_BACKGROUND_LAYOUT), bóng + ánh sáng mặc định
 *    (composite.ts). Đổi nền thì ảnh đã ghép tự ghép lại từ ảnh đã tách nền, không tách nền lần nữa.
 *  - Gemini (tính phí mỗi ảnh): Gemini tự tách SP, đặt lên mặt phẳng, khớp ánh sáng/phối cảnh/bóng.
 *    Hỏi xác nhận một lần mỗi lô, kèm tiền ước tính theo các lượt thật gần nhất.
 * Chạy BATCH_CONCURRENCY ảnh cùng lúc, mỗi ảnh một request ngắn tới BE; đang chạy vẫn thả thêm ảnh
 * được — ảnh mới vào hàng chờ, lượt sau tự chạy tiếp.
 */
export function BatchGenerator() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<BatchMode>(DEFAULT_BATCH_MODE);
  const [sceneChoice, setSceneChoice] = useState<string>(DEFAULT_BACKGROUND_PRESET_ID);
  const [sceneFile, setSceneFile] = useState<File | null>(null);
  const [note, setNote] = useState('');

  const [running, setRunning] = useState(false);
  /** Người dùng bấm "Dừng" (hoặc chuẩn bị cảnh hỏng) → thôi tự chạy tới khi thêm ảnh / bấm Tiếp tục. */
  const [autoPaused, setAutoPaused] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [confirm, setConfirm] = useState<{ ids: string[]; replacing: boolean; estimate: GeminiEstimate | null } | null>(null);
  const [preparingConfirm, setPreparingConfirm] = useState(false);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  // Chốt đồng bộ: setRunning chỉ có hiệu lực ở lần vẽ sau, mà effect tự chạy có thể bắn lại trước đó.
  const runningRef = useRef(false);
  const stopRef = useRef(false);
  const controllersRef = useRef(new Map<string, AbortController>());
  const nextIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rời trang: dừng lô, huỷ request, thu hồi URL ảnh tạm.
  useEffect(
    () => () => {
      stopRef.current = true;
      controllersRef.current.forEach((controller) => controller.abort());
      itemsRef.current.forEach(releaseItem);
    },
    [],
  );

  const patchItem = (id: string, patch: Partial<BatchItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const patchResult = (id: string, patch: Partial<BatchResult>) =>
    setItems((prev) => prev.map((item) => (item.id === id && item.result ? { ...item, result: { ...item.result, ...patch } } : item)));

  const addFiles = async (files: FileList | null) => {
    // Chép ra mảng ngay: input bị xoá value sau khi gọi hàm này, còn ở dưới phải chờ nén ảnh.
    const picked = Array.from(files ?? []);
    if (!picked.length) return;
    const accepted: BatchItem[] = [];
    const rejected: string[] = [];
    const big = picked.filter((file) => file.size > PRODUCT_IMAGE_MAX_BYTES).length;
    const shrinkToast = big ? toast.loading(`Đang nén ${big} ảnh trên 10MB…`) : undefined;
    let shrunk = 0;
    // Nén lần lượt từng ảnh — ảnh máy ảnh giải nén ra ~100MB bộ nhớ, nén song song dễ treo tab.
    for (const original of picked) {
      const fitted = await fitProductImageFile(original);
      if (fitted.error !== undefined) {
        rejected.push(fitted.error);
        continue;
      }
      if (fitted.notice) shrunk += 1;
      const file = fitted.file;
      nextIdRef.current += 1;
      accepted.push({
        id: `item-${nextIdRef.current}`,
        file,
        previewUrl: URL.createObjectURL(file),
        // Tên SP lấy theo tên file gốc (bản nén có thể đổi đuôi .png/.webp → .jpg).
        name: productNameFromFileName(original.name),
        widthCm: widthCmFromName(original.name),
        status: 'pending',
        error: null,
        cutoutSrc: null,
        cutoutCost: null,
        cutoutWarning: null,
        cutoutBody: null,
        cutoutDetectedBy: null,
        sourceWarnings: [],
        result: null,
      });
    }
    if (shrinkToast) toast.dismiss(shrinkToast);
    if (shrunk) toast.success(`Đã tự nén ${shrunk} ảnh trên 10MB cho vừa giới hạn tải lên.`);
    if (rejected.length === 1) toast.error(rejected[0]);
    if (rejected.length > 1) toast.error(`Bỏ qua ${rejected.length} file không hợp lệ — chỉ nhận ảnh JPG, PNG, WebP.`);
    if (!accepted.length) return;
    setItems((prev) => [...prev, ...accepted]);
    setSelectedId((prev) => prev ?? accepted[0].id);
    setAutoPaused(false);
  };

  /** Sửa cm: ảnh đã ghép (tách nền) thì ghép lại theo cỡ mới — dùng lại ảnh đã tách, không gọi AI. */
  const changeWidth = (item: BatchItem, raw: string) => {
    // Giữ cả số đang gõ dở (gõ "25" đi qua "2"); chỉ số trong SIZE_CM_RANGE mới dùng để đặt cỡ (usableWidthCm).
    const value = raw.trim() === '' ? null : Math.round(Number(raw));
    const widthCm = value !== null && Number.isFinite(value) && value > 0 && value < 1000 ? value : null;
    const requeue = item.status === 'done' && item.result?.mode === 'cutout' && placementWidthCm(widthCm) !== placementWidthCm(item.widthCm);
    patchItem(item.id, requeue ? { widthCm, status: 'pending' } : { widthCm });
    if (requeue) setAutoPaused(false);
  };

  /** Đặt một cỡ (túi nhỏ/lớn) cho mọi ảnh chưa rõ cm — ảnh đã ghép thì ghép lại nếu cỡ khác cỡ tạm đang dùng. */
  const setUnknownSize = (size: BagSizeClass) => {
    const widthCm = typicalWidthCm(size);
    const targets = items.filter((i) => i.status !== 'running' && usableWidthCm(i.widthCm) === null);
    for (const item of targets) changeWidth(item, String(widthCm));
  };

  const removeItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.status === 'running') return;
    releaseItem(item);
    const rest = items.filter((i) => i.id !== id);
    setItems(rest);
    if (selectedId === id) setSelectedId(rest[0]?.id ?? null);
  };


  const clearAll = () => {
    if (running) return;
    items.forEach(releaseItem);
    setItems([]);
    setSelectedId(null);
  };

  const scenePreset = findBackgroundPreset(sceneChoice) ?? null;

  const changeScene = (choice: string) => {
    setSceneChoice(choice);
    // Tách nền: đổi nền là ghép lại cả lô lên nền mới (dùng lại ảnh đã tách, không gọi AI lần nữa).
    if (mode === 'cutout') {
      setItems((prev) => requeueCutoutResults(prev));
      setAutoPaused(false);
    }
  };

  /** Lý do chưa chạy được (hiện cạnh nút chạy), null = chạy được. */
  const blockReason = (() => {
    if (!items.length) return 'Thêm ảnh sản phẩm để bắt đầu.';
    if (!scenePreset && !sceneFile) return 'Chọn ảnh background.';
    return null;
  })();

  const prepareRun = async (): Promise<RunContext> => {
    const noop = () => undefined;
    if (mode === 'gemini') {
      if (!scenePreset) {
        if (!sceneFile) throw new Error('Chưa chọn ảnh background.');
        return { mode, sceneFile, note: note.trim(), release: noop };
      }
      const res = await fetch(scenePreset.src);
      if (!res.ok) throw new Error('Không tải được nền có sẵn, tải lại trang thử lại.');
      const blob = await res.blob();
      const file = new File([blob], `${scenePreset.id}.jpg`, { type: blob.type || 'image/jpeg' });
      return { mode, sceneFile: file, note: note.trim(), release: noop };
    }
    if (!scenePreset && !sceneFile) throw new Error('Chưa chọn ảnh background.');
    const src = scenePreset ? scenePreset.src : URL.createObjectURL(sceneFile as File);
    const release = scenePreset ? noop : () => URL.revokeObjectURL(src);
    try {
      const image = await loadImage(src);
      const [r, g, b] = await averageColor(src);
      const layout = scenePreset ?? UPLOADED_BACKGROUND_LAYOUT;
      const scene = await analyzeBackgroundLight(src).catch(() => null);
      return {
        mode,
        background: { src, width: image.naturalWidth, height: image.naturalHeight },
        layout,
        warmth: estimateWarmth(r, g, b),
        scene,
        release,
      };
    } catch {
      release();
      throw scenePreset ? new Error('Không tải được nền có sẵn, tải lại trang thử lại.') : new Error('Không đọc được ảnh background đã tải lên, thử ảnh khác.');
    }
  };

  const generateWithGemini = async (item: BatchItem, ctx: Extract<RunContext, { mode: 'gemini' }>, signal: AbortSignal): Promise<BatchResult> => {
    const form = buildScenePlacementFormData({ productImage: item.file, sceneImage: ctx.sceneFile, productName: item.name, note: ctx.note });
    const res = await apiClient.post('/product-image/scene-placement', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    });
    return {
      src: res.data.imageData,
      mimeType: res.data.mimeType,
      mode: 'gemini',
      generationId: res.data.generationId ?? null,
      cost: res.data.cost ?? { usd: null, vnd: null, note: null },
      approved: false,
      approving: false,
    };
  };

  const composeWithCutout = async (item: BatchItem, ctx: Extract<RunContext, { mode: 'cutout' }>, signal: AbortSignal): Promise<BatchResult> => {
    let cutoutSrc = item.cutoutSrc;
    let cutoutCost = item.cutoutCost;
    let cutoutBody = item.cutoutBody;
    if (!cutoutSrc) {
      const form = new FormData();
      form.append('file', item.file);
      const res = await apiClient.post('/product-image/cutout', form, { headers: { 'Content-Type': 'multipart/form-data' }, signal });
      // data URI base64 vài MB → blob để đỡ tốn bộ nhớ khi lô có nhiều ảnh.
      const fresh = URL.createObjectURL(await (await fetch(res.data.imageData)).blob());
      cutoutSrc = fresh;
      cutoutCost = res.data.cost ?? { usd: null, vnd: null, note: null };
      const detection = res.data.detection;
      cutoutBody = Array.isArray(res.data.bodyBox) && res.data.bodyBox.length === 4 ? (res.data.bodyBox as BodyBox) : null;
      patchItem(item.id, {
        cutoutSrc: fresh,
        cutoutCost,
        cutoutWarning: detection?.status === 'skipped' ? detection.reason || 'Có thể còn dính giá đỡ/đạo cụ.' : null,
        cutoutBody,
        cutoutDetectedBy: cutoutDetectionLabel(detection),
        sourceWarnings: Array.isArray(res.data.qualityWarnings) ? res.data.qualityWarnings : [],
      });
    }
    const pixels = await readCutoutPixels(cutoutSrc);
    // Chỉ nhuộm ấm phần nền ấm hơn nơi chụp SP (addedWarmth) — ảnh chụp sẵn dưới đèn vàng không bị nhuộm lần nữa.
    const [sr, sg, sb] = await borderColor(item.previewUrl).catch(() => [0, 0, 0] as [number, number, number]);
    const sourceWarmth = sr + sg + sb > 0 ? estimateWarmth(sr, sg, sb) : 0;
    const warmth = addedWarmth(ctx.warmth, sourceWarmth);
    // Chụp dưới cùng kiểu đèn với nền → giữ ánh sáng gốc của SP (sameLightAsScene), chỉ thêm bóng.
    const keepOriginalLight = sameLightAsScene(ctx.warmth, sourceWarmth);
    // "Cho giống ảnh chụp thật" theo mặc định người dùng chốt (bóng đậm 100%, cao 1,8×), ánh ấm theo màu nền;
    // phân bố sáng trên thân theo kiểu đèn studio (đèn chính diện, cao), độ sáng SP theo độ sáng cảnh.
    const layers = buildRealismCanvases(pixels, {
      shadow: true,
      shadowStrength: DEFAULT_SHADOW_STRENGTH,
      shadowHeight: DEFAULT_SHADOW_HEIGHT,
      look: !keepOriginalLight,
      warmth,
      body: cutoutBody,
      scene: ctx.scene,
    });
    // Có khung thân túi thì đặt theo thân (biết cm thì đúng cỡ thật so với hộp, không thì mọi túi cùng cỡ; đáy thân đúng
    // mặt hộp); không thì theo cả SP.
    const placement = cutoutBody
      ? placementForBody(ctx.layout, ctx.background, pixels, cutoutBody, placementWidthCm(item.widthCm))
      : placementForPreset(ctx.layout, ctx.background, pixels);
    const blob = await renderComposite(ctx.background, pixels, placement, layers);
    // Tiền là của lần tách nền (0đ) — ghép lại lên nền khác không tốn thêm.
    return { src: URL.createObjectURL(blob), mimeType: 'image/jpeg', mode: 'cutout', generationId: null, cost: cutoutCost, approved: false, approving: false };
  };

  const processItem = async (id: string, ctx: RunContext): Promise<ItemOutcome> => {
    const item = itemsRef.current.find((i) => i.id === id);
    // Bị bỏ khỏi lô trong lúc chờ.
    if (!item) return 'canceled';
    const controller = new AbortController();
    controllersRef.current.set(id, controller);
    patchItem(id, { status: 'running', error: null });
    try {
      const result =
        ctx.mode === 'gemini'
          ? await generateWithGemini(item, ctx, controller.signal)
          : await composeWithCutout(item, ctx, controller.signal);
      const previous = itemsRef.current.find((i) => i.id === id)?.result;
      revokeBlob(previous?.src);
      patchItem(id, { status: 'done', error: null, result });
      return 'done';
    } catch (err) {
      if (isCanceledRequest(err) || controller.signal.aborted) {
        patchItem(id, { status: 'pending' });
        return 'canceled';
      }
      patchItem(id, { status: 'error', error: errorText(err, 'Tạo ảnh thất bại, vui lòng thử lại.') });
      return 'error';
    } finally {
      controllersRef.current.delete(id);
    }
  };

  const startRun = async (ids: string[]) => {
    if (runningRef.current || !ids.length) return;
    runningRef.current = true;
    setConfirm(null);
    setAutoPaused(false);
    stopRef.current = false;
    setRunning(true);
    try {
      let ctx: RunContext;
      try {
        ctx = await prepareRun();
      } catch (err: any) {
        setAutoPaused(true); // không để tự chạy lặp lại rồi báo lỗi liên tục
        toast.error(err?.message || 'Không chuẩn bị được ảnh background, thử lại.');
        return;
      }
      // Ảnh lỗi bấm "Thử lại" hiện lại là "đang chờ" trong lúc đợi tới lượt.
      setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, status: 'pending', error: null } : i)));
      const counts = { done: 0, error: 0, canceled: 0 };
      try {
        await runWithConcurrency(
          ids,
          BATCH_CONCURRENCY,
          async (id) => {
            counts[await processItem(id, ctx)] += 1;
          },
          () => stopRef.current,
        );
      } finally {
        ctx.release();
      }
      if (counts.error) toast.error(`Xong ${counts.done} ảnh, ${counts.error} ảnh lỗi — bấm vào ảnh lỗi để xem lý do và thử lại.`);
      else if (counts.done && !stopRef.current && ctx.mode === 'gemini') toast.success(`Đã tạo xong ${counts.done} ảnh.`);
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  };

  // Tách nền: có ảnh chờ là tự chạy — không nút nào phải bấm.
  useEffect(() => {
    if (!shouldAutoRun(mode) || running || runningRef.current || autoPaused || blockReason) return;
    const pending = items.filter((i) => i.status === 'pending').map((i) => i.id);
    if (pending.length) startRun(pending);
    // startRun đọc state mới nhất qua ref/closure của lần vẽ này — chỉ cần chạy lại khi các giá trị dưới đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mode, running, autoPaused, blockReason]);

  const requestRun = async (ids: string[], replacing: boolean) => {
    if (!ids.length || running) return;
    if (blockReason) {
      toast.error(blockReason);
      return;
    }
    if (mode !== 'gemini') {
      startRun(ids);
      return;
    }
    for (const id of ids) {
      const item = items.find((i) => i.id === id);
      const problem = item && validateScenePlacementInput({ productName: item.name, note });
      if (problem) {
        setSelectedId(id);
        toast.error(`Ảnh "${item.file.name}": ${problem}`);
        return;
      }
    }
    // Gemini tốn tiền: hỏi một lần cho cả lô, kèm tiền ước tính theo các lượt thật gần nhất.
    setPreparingConfirm(true);
    let estimate: GeminiEstimate | null = null;
    try {
      estimate = (await apiClient.get('/product-image/gemini-estimate')).data;
    } catch {
      estimate = null; // không có số ước tính vẫn cho chạy, hộp xác nhận nói rõ
    } finally {
      setPreparingConfirm(false);
    }
    setConfirm({ ids, replacing, estimate });
  };

  const stop = () => {
    stopRef.current = true;
    setAutoPaused(true);
    controllersRef.current.forEach((controller) => controller.abort());
    if (mode === 'gemini') toast('Đã dừng. Lượt đã gửi tới Gemini vẫn có thể bị tính phí.', { icon: 'ℹ️' });
  };

  const toggleApproved = async (item: BatchItem) => {
    const result = item.result;
    if (!result?.generationId || result.approving) return;
    const next = !result.approved;
    patchResult(item.id, { approving: true });
    try {
      const res = await apiClient.patch(`/product-image/generations/${result.generationId}`, { approved: next });
      patchResult(item.id, { approved: Boolean(res.data?.approved), approving: false });
    } catch (err) {
      patchResult(item.id, { approving: false });
      toast.error(apiErrorMessage(err, 'Không lưu được đánh dấu "Đạt", vui lòng thử lại.'));
    }
  };

  const downloadZip = async (onlyApproved: boolean) => {
    // Chỉ ảnh đã xong — ảnh đang chờ ghép lại lên nền mới vẫn hiện ảnh cũ nhưng không đóng gói.
    const ready = items.filter((i) => i.status === 'done' && i.result && (!onlyApproved || i.result.approved));
    if (!ready.length || zipping) return;
    setZipping(true);
    try {
      const names = uniqueFileNames(ready.map((i) => ({ name: i.name, extension: extensionForMime(i.result!.mimeType) })));
      const entries = await Promise.all(
        ready.map(async (i, index) => ({ name: names[index], data: new Uint8Array(await (await fetch(i.result!.src)).arrayBuffer()) })),
      );
      const url = URL.createObjectURL(new Blob([createZip(entries)], { type: 'application/zip' }));
      downloadUrl(url, exportFileName(onlyApproved ? 'anh-sp-dat' : 'anh-sp-tu-dong', 'zip'));
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err: any) {
      toast.error(err?.message || 'Không đóng gói được file ZIP, vui lòng thử lại.');
    } finally {
      setZipping(false);
    }
  };

  const summary = summarizeBatch(items);
  const unfiltered = items.filter((i) => i.status === 'done' && i.result?.mode === 'cutout' && i.cutoutWarning);
  const weakSources = items.filter((i) => i.status === 'done' && i.result?.mode === 'cutout' && i.sourceWarnings.length > 0);
  const unsized = items.filter((i) => i.status !== 'running' && usableWidthCm(i.widthCm) === null);
  const pendingIds = items.filter((i) => i.status === 'pending').map((i) => i.id);
  const errorIds = items.filter((i) => i.status === 'error').map((i) => i.id);
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const confirmCount = confirm?.ids.length ?? 0;
  const auto = shouldAutoRun(mode);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
      <div className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-[#1b1b1d] mb-0.5">1. Ảnh sản phẩm ({items.length})</h3>
            {items.length > 0 && !running && (
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-[#9c9aa8] hover:text-rose-600">
                Xoá hết
              </button>
            )}
          </div>
          <p className="text-xs text-[#9c9aa8] mb-2">
            {auto
              ? 'Thả bao nhiêu ảnh cũng được, máy tự tách nền và ghép ngay — kể cả khi đang chạy.'
              : 'Thả bao nhiêu ảnh cũng được. Tên SP lấy theo tên file (dùng cho thống kê chi phí), sửa được.'}
          </p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={PRODUCT_IMAGE_ACCEPT}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 rounded-2xl border-2 border-dashed border-[#d5d3e0] hover:border-[#4441cc] bg-[#fcfaff] flex flex-col items-center justify-center gap-1 text-center"
            >
              <UploadCloud className="w-5 h-5 text-[#4441cc]" />
              <span className="text-sm text-[#1b1b1d]">
                Kéo thả ảnh vào đây hoặc <span className="text-[#4441cc] font-semibold underline underline-offset-2">chọn nhiều file</span>
              </span>
              <span className="text-xs text-[#9c9aa8]">JPG, PNG, WebP · ảnh trên 10MB tự nén</span>
            </button>
          </div>

          {items.length > 0 && (
            <ul className="mt-3 max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${
                    item.id === selectedId ? 'border-[#4441cc] bg-[#f6f5ff]' : 'border-[#e2e0ea]'
                  }`}
                >
                  <button type="button" onClick={() => setSelectedId(item.id)} className="shrink-0" title="Xem ảnh này">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.result?.src ?? item.previewUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-[#fafafb]" />
                  </button>
                  <input
                    value={item.name}
                    maxLength={PRODUCT_NAME_MAX_LENGTH}
                    disabled={item.status === 'running'}
                    onFocus={() => setSelectedId(item.id)}
                    onChange={(e) => patchItem(item.id, { name: e.target.value })}
                    placeholder="Tên sản phẩm"
                    aria-label={`Tên sản phẩm của ảnh ${item.file.name}`}
                    className="flex-1 min-w-0 rounded-lg border border-transparent hover:border-[#e2e0ea] focus:border-[#4441cc] px-2 py-1 text-sm focus:outline-none disabled:bg-transparent"
                  />
                  <label className="shrink-0 flex items-center gap-0.5 text-xs text-[#9c9aa8]" title="Bề ngang đáy/thân túi thật (cm) — để túi đúng cỡ so với hộp gỗ 31cm. Tự đọc từ mã SP (vd TX018-25 → 25cm). Túi nhỏ 22–26cm, túi lớn 32–40cm.">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={SIZE_CM_RANGE[0]}
                      max={SIZE_CM_RANGE[1]}
                      value={item.widthCm ?? ''}
                      disabled={item.status === 'running'}
                      onFocus={() => setSelectedId(item.id)}
                      onChange={(e) => changeWidth(item, e.target.value)}
                      placeholder="?"
                      aria-label={`Bề ngang thân túi (cm) của ảnh ${item.file.name}`}
                      className={`w-11 rounded-lg border px-1 py-1 text-sm text-right focus:outline-none focus:border-[#4441cc] disabled:bg-transparent ${
                        usableWidthCm(item.widthCm) ? 'border-[#e2e0ea] text-[#1b1b1d]' : 'border-amber-300 bg-amber-50'
                      }`}
                    />
                    cm
                  </label>
                  <StatusIcon item={item} />
                  <button
                    type="button"
                    disabled={item.status === 'running'}
                    onClick={() => removeItem(item.id)}
                    aria-label={`Bỏ ảnh ${item.file.name}`}
                    className="shrink-0 p-1 rounded-lg text-[#9c9aa8] hover:text-rose-600 disabled:opacity-30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {unsized.length > 0 && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p>
                {unsized.length} ảnh chưa rõ cỡ (tên file không có mã SP như TX018-25) — đang tạm ghép như{' '}
                {FALLBACK_SIZE_CLASS.label.toLowerCase()} {typicalWidthCm(FALLBACK_SIZE_CLASS)}cm. Chọn cỡ cho các ảnh này, hoặc gõ số cm ở từng ảnh:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {BAG_SIZE_CLASSES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setUnknownSize(size)}
                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:border-[#4441cc] hover:text-[#4441cc]"
                  >
                    {size.label} · đáy {size.minCm}–{size.maxCm}cm
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <BackgroundPicker
          title="2. Ảnh background"
          hint={
            auto
              ? 'Dùng chung cho cả lô. Đổi nền là ảnh đã ghép tự ghép lại lên nền mới.'
              : 'Dùng chung cho cả lô. Chọn nền có sẵn của phòng media hoặc tải ảnh khác.'
          }
          selected={sceneChoice}
          uploadFile={sceneFile}
          onSelect={changeScene}
          onUploadFile={(file) => {
            setSceneFile(file);
            changeScene(UPLOADED_BACKGROUND);
          }}
          disabled={running}
        />

        <fieldset disabled={running} className="space-y-2">
          <h3 className="text-sm font-bold text-[#1b1b1d]">3. Cách tạo</h3>
          <ModeOption
            active={mode === 'cutout'}
            onSelect={() => setMode('cutout')}
            icon={<Layers className="w-4 h-4" />}
            title="Tách nền — tự động"
            badge={
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                0đ
              </span>
            }
            description="Thả ảnh là ra ảnh, 0đ. Model tự huấn luyện nhận diện đúng túi, tự bỏ giá trưng bày và đạo cụ trong ảnh gốc; túi giữ nguyên từng điểm ảnh, bóng và ánh sáng khớp nền. Ảnh model chưa chắc có dấu cảnh báo để xem lại."
          />
          {/* Gemini (tính phí) tạm ẩn — người dùng 13/10: chỉ dùng model tự huấn luyện, 0đ. */}
        </fieldset>

        {mode === 'gemini' && (
          <div>
            <label htmlFor="batch-note" className="text-sm font-bold text-[#1b1b1d]">
              Ghi chú cho AI <span className="font-normal text-[#9c9aa8]">(không bắt buộc, áp dụng cả lô)</span>
            </label>
            <textarea
              id="batch-note"
              value={note}
              maxLength={HELD_PRODUCT_NOTE_MAX_LENGTH}
              onChange={(e) => setNote(e.target.value)}
              disabled={running}
              rows={2}
              placeholder="vd túi cao khoảng 25cm"
              className="mt-1 w-full rounded-xl border border-[#e2e0ea] px-3 py-2 text-sm focus:outline-none focus:border-[#4441cc] disabled:bg-[#fafafb]"
            />
          </div>
        )}

        {blockReason && items.length > 0 && <p className="text-xs text-rose-600">{blockReason}</p>}

        <div className="flex flex-col gap-2">
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="w-full px-5 py-2.5 rounded-xl font-semibold text-sm text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 inline-flex items-center justify-center gap-2"
            >
              <StopCircle className="w-4 h-4" />
              Dừng ({summary.running} ảnh đang tạo, {summary.pending} ảnh đang chờ)
            </button>
          ) : pendingIds.length > 0 && (!auto || autoPaused) ? (
            <button
              type="button"
              onClick={() => requestRun(pendingIds, false)}
              disabled={!!blockReason || preparingConfirm}
              className="w-full px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {preparingConfirm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {auto ? `Tiếp tục ghép ${pendingIds.length} ảnh` : `Tạo ${pendingIds.length} ảnh bằng Gemini`}
            </button>
          ) : (
            !auto &&
            items.length > 0 && (
              <button
                type="button"
                onClick={() => requestRun(items.map((i) => i.id), true)}
                disabled={!!blockReason || preparingConfirm}
                className="w-full px-5 py-2.5 rounded-xl font-semibold text-sm text-[#4441cc] border border-[#c7c4d7] hover:border-[#4441cc] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {preparingConfirm ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Tạo lại cả lô bằng Gemini ({items.length} ảnh)
              </button>
            )
          )}
          {!running && errorIds.length > 0 && (
            <button
              type="button"
              onClick={() => requestRun(errorIds, false)}
              disabled={!!blockReason || preparingConfirm}
              className="w-full px-5 py-2 rounded-xl font-semibold text-sm text-rose-700 border border-rose-200 hover:bg-rose-50 disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Thử lại {errorIds.length} ảnh lỗi
            </button>
          )}
          {auto && !running && !pendingIds.length && items.length > 0 && !errorIds.length && (
            <p className="text-xs text-emerald-700 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Đã ghép xong cả lô. Thả thêm ảnh là máy tự ghép tiếp.
            </p>
          )}
        </div>
      </div>

      <div className="border border-[#e2e0ea] rounded-2xl bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1b1b1d]">Kết quả</h3>
            <p className="text-xs text-[#9c9aa8]">
              {items.length
                ? `Xong ${summary.done}/${summary.total}` +
                  (summary.error ? ` · ${summary.error} lỗi` : '') +
                  (summary.knownVnd || summary.unknownCost ? ` · Chi phí AI ${formatVnd(summary.knownVnd)}` : '') +
                  (summary.unknownCost ? ` (+${summary.unknownCost} lượt chưa tính được tiền)` : '') +
                  (summary.approved ? ` · ${summary.approved} ảnh đạt` : '')
                : 'Chưa có ảnh nào.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.approved > 0 && (
              <button
                type="button"
                onClick={() => downloadZip(true)}
                disabled={zipping}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
              >
                <FileArchive className="w-4 h-4" />
                Tải ZIP ảnh đạt ({summary.approved})
              </button>
            )}
            <button
              type="button"
              onClick={() => downloadZip(false)}
              disabled={!summary.done || zipping}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
              Tải ZIP ({summary.done} ảnh)
            </button>
          </div>
        </div>

        {unfiltered.length > 0 && (
          <div className="mb-4 flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 min-w-[200px]">
              {unfiltered.length} ảnh có thể còn dính giá đỡ/đạo cụ — xem lại các ảnh có dấu cảnh báo: {unfiltered[0].cutoutWarning}
            </span>
          </div>
        )}

        {weakSources.length > 0 && (
          <div className="mb-4 flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 min-w-[200px]">
              {weakSources.length} ảnh gốc quá nhỏ hoặc bị cắt mất một phần túi — vẫn ghép được nhưng ảnh ra sẽ mờ/cụt. Bấm
              vào ảnh có dấu cảnh báo để xem lý do và cách lấy ảnh lớn hơn.
            </span>
          </div>
        )}

        <div className="relative h-[520px] rounded-xl border border-[#e2e0ea] bg-[#fafafb] flex items-center justify-center overflow-hidden">
          {selected ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.result?.src ?? selected.previewUrl}
                alt={selected.name}
                className={`max-w-full max-h-full object-contain ${selected.result ? '' : 'opacity-60'}`}
              />
              {!selected.result && selected.status !== 'error' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-[#464554]">
                    {selected.status === 'running' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#4441cc]" />
                        Đang tạo ảnh...
                      </>
                    ) : (
                      'Ảnh gốc — đang chờ tạo'
                    )}
                  </span>
                </div>
              )}
              {selected.result && (selected.status === 'running' || selected.status === 'pending') && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#4441cc]">
                  {selected.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {selected.status === 'running' ? 'Đang tạo lại...' : 'Chờ ghép lại lên nền mới'}
                </span>
              )}
            </>
          ) : (
            <div className="text-center px-6">
              <ImageOff className="w-8 h-8 text-[#c7c4d7] mx-auto mb-2" />
              <p className="text-sm text-[#9c9aa8]">Thả ảnh sản phẩm vào ô bên trái — máy tự tạo ảnh.</p>
            </div>
          )}
        </div>

        {selected && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#464554] min-w-0">
              <span className="font-semibold">{selected.name || selected.file.name}</span>
              {selected.result?.cost && (
                <>
                  {' '}
                  · Lượt này: <span className="font-semibold">{formatGenerationCost(selected.result.cost.vnd)}</span>
                  {selected.result.cost.note && <span className="text-amber-700"> — {selected.result.cost.note}</span>}
                </>
              )}
              {selected.result?.mode === 'cutout' && selected.cutoutDetectedBy && (
                <span className="text-[#9c9aa8]"> · Nhận diện: {selected.cutoutDetectedBy}</span>
              )}

            </p>
            <div className="flex flex-wrap gap-2">
              {selected.result?.generationId && (
                <button
                  type="button"
                  onClick={() => toggleApproved(selected)}
                  disabled={selected.result.approving}
                  aria-pressed={selected.result.approved}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold disabled:opacity-50 ${
                    selected.result.approved
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-[#e2e0ea] text-[#464554] hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  {selected.result.approving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : selected.result.approved ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  {selected.result.approved ? 'Đã đạt' : 'Đạt'}
                </button>
              )}
              {/* Tách nền cho ra đúng một ảnh nên chỉ cần "Thử lại" khi lỗi; Gemini mỗi lượt ra ảnh khác nên có "Tạo lại". */}
              {(selected.status === 'error' || (selected.status === 'done' && mode === 'gemini')) && (
                <button
                  type="button"
                  onClick={() => requestRun([selected.id], selected.status === 'done')}
                  disabled={running || !!blockReason || preparingConfirm}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e2e0ea] text-sm font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] disabled:opacity-40"
                >
                  <RefreshCw className="w-4 h-4" />
                  {selected.status === 'error' ? 'Thử lại' : 'Tạo lại bằng Gemini'}
                </button>
              )}
              {selected.result && (
                <button
                  type="button"
                  onClick={() =>
                    downloadUrl(selected.result!.src, `${slugifyFileName(selected.name)}.${extensionForMime(selected.result!.mimeType)}`)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-[#4441cc] hover:bg-[#4441cc]/90"
                >
                  <Download className="w-4 h-4" />
                  Tải ảnh
                </button>
              )}
              {selected.status !== 'running' && (
                <button
                  type="button"
                  onClick={() => removeItem(selected.id)}
                  aria-label="Bỏ ảnh này khỏi lô"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e2e0ea] text-sm font-semibold text-[#9c9aa8] hover:border-rose-300 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {selected?.result?.mode === 'cutout' && selected.cutoutWarning && selected.status === 'done' && (
          <div className="mt-3 flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 min-w-[200px]">Ảnh này có thể còn dính giá đỡ/đạo cụ: {selected.cutoutWarning}</span>
          </div>
        )}

        {selected?.result?.mode === 'cutout' && selected.status === 'done' && selected.sourceWarnings.length > 0 && (
          <div className="mt-3 flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <ul className="flex-1 min-w-[200px] space-y-0.5">
              {selected.sourceWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        )}

        {selected?.status === 'error' && selected.error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{selected.error}</span>
          </div>
        )}

        {items.length > 1 && (
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                title={item.name}
                className={`relative aspect-square rounded-lg border-2 overflow-hidden bg-[#fafafb] ${
                  item.id === selectedId ? 'border-[#4441cc]' : 'border-transparent hover:border-[#c7c4d7]'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.result?.src ?? item.previewUrl}
                  alt={item.name}
                  className={`w-full h-full object-cover ${item.result ? '' : 'opacity-50'}`}
                />
                <span className="absolute top-1 right-1 rounded-full bg-white">
                  <StatusIcon item={item} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && startRun(confirm.ids)}
        variant="primary"
        icon={<Coins className="w-5 h-5" />}
        title={`Tạo ${confirmCount} ảnh bằng Gemini?`}
        description={
          geminiBatchCostText(confirmCount, confirm?.estimate ?? null) +
          (confirm?.replacing ? ' Ảnh đã tạo trước đó sẽ được thay bằng ảnh mới.' : '')
        }
        confirmText={`Tạo ${confirmCount} ảnh`}
      />
    </div>
  );
}

function StatusIcon({ item }: { item: BatchItem }) {
  switch (item.status) {
    case 'running':
      return <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#4441cc]" aria-label="Đang tạo" />;
    case 'done':
      if (item.result?.mode === 'cutout' && item.cutoutWarning) {
        return <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" aria-label={`Có thể còn dính giá đỡ/đạo cụ: ${item.cutoutWarning}`} />;
      }
      if (item.result?.mode === 'cutout' && item.sourceWarnings.length > 0) {
        return <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" aria-label={item.sourceWarnings.join(' ')} />;
      }
      return item.result?.approved ? (
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 fill-emerald-100" aria-label="Đạt" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4441cc]" aria-label="Đã tạo" />
      );
    case 'error':
      return <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" aria-label={item.error ?? 'Lỗi'} />;
    default:
      return <Clock className="w-4 h-4 shrink-0 text-[#c7c4d7]" aria-label="Chờ tạo" />;
  }
}
