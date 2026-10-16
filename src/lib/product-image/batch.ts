/**
 * Tab "Tạo hàng loạt": nhiều ảnh SP + một ảnh cảnh → mỗi SP một ảnh, không chỉnh tay. Phần thuần
 * logic (đặt tên, chạy song song có giới hạn, tóm tắt lô) tách ra đây để test được.
 */
import { formatUsd, formatVnd } from './cost-view';
import { PRODUCT_NAME_MAX_LENGTH } from './held-product-request';

/**
 * - cutout (mặc định): rembg tách nền rồi tự đặt lên mặt hộp của nền có sẵn — 0đ, thả ảnh là tự
 *   chạy, chỉ dùng với nền có sẵn.
 * - gemini: Gemini đặt SP vào cảnh (khớp ánh sáng/phối cảnh/bóng) — tính phí mỗi ảnh, xác nhận một
 *   lần mỗi lô.
 */
export type BatchMode = 'cutout' | 'gemini';

export const DEFAULT_BATCH_MODE: BatchMode = 'cutout';

/** Ghép nền 0đ tự chạy ngay khi có ảnh mới; Gemini tốn tiền nên luôn chờ người dùng xác nhận lô. */
export function shouldAutoRun(mode: BatchMode): boolean {
  return mode === 'cutout';
}

export type BatchItemStatus = 'pending' | 'running' | 'done' | 'error';

/** Bước nhận diện SP khi tách nền — AI trả trong `detection`, BE chuyển nguyên. */
export interface CutoutDetection {
  /** skipped: model chưa chắc nên chưa cắt phần dính liền túi — có thể còn dính giá đỡ/đạo cụ. */
  status: 'applied' | 'skipped';
  /** model: model tự huấn luyện chạy trên AI service (0đ) — tách nền không gọi dịch vụ tính phí nào. */
  source?: 'model';
  reason?: string;
  model_reasons?: string[];
}

/**
 * Ai đã nhận diện SP của ảnh tách nền — hiện cạnh tiền lượt đó. Ảnh có cảnh báo (skipped) thì null: đã có
 * dòng cảnh báo vàng riêng kèm lý do.
 */
export function cutoutDetectionLabel(detection: CutoutDetection | null | undefined): string | null {
  if (!detection || detection.status !== 'applied' || detection.source !== 'model') return null;
  return 'model tự huấn luyện (0đ)';
}

/**
 * Số ảnh chạy cùng lúc. Gemini mỗi lượt 10–30s nên chạy song song cho nhanh, nhưng không dồn cả lô
 * vào một lúc để khỏi chạm hạn mức theo phút của Gemini và khỏi giành CPU tách nền của AI service.
 */
export const BATCH_CONCURRENCY = 2;

/**
 * Đổi nền khi đang ở chế độ ghép nền: mọi ảnh đã ghép nền đưa về hàng chờ để tự ghép lại lên nền
 * mới (giữ ảnh cũ trên màn hình tới khi có ảnh mới). Ảnh Gemini giữ nguyên — tạo lại là tốn tiền.
 */
export function requeueCutoutResults<T extends { status: BatchItemStatus; result: { mode: BatchMode } | null }>(
  items: readonly T[],
): T[] {
  return items.map((item) =>
    item.status === 'done' && item.result?.mode === 'cutout' ? { ...item, status: 'pending' as const } : item,
  );
}

/** "tui_hermes-birkin 30.jpg" → "tui hermes birkin 30" — tên SP mặc định, người dùng sửa được. */
export function productNameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^./\\]+$/, '');
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, PRODUCT_NAME_MAX_LENGTH);
}

/**
 * Bề ngang thân túi (cm) đọc từ mã SP của shop: số 2 chữ số ngay sau mã — "TX018-25-CS-02" → 25, "TK9001-23-B-02" → 23,
 * "T103002-1-24" → 24 (có số phiên bản), "WA9001-11-B" → 11. Đo 15/10 trên ảnh chụp thật 15/16 mẫu khớp (bề ngang thân
 * túi / bề ngang hộp gỗ ~31cm). Nhận cả "_" và dấu cách thay "-" (tên SP mặc định đổi "-" thành dấu cách). Không thấy mã
 * hoặc số ngoài SIZE_CM_RANGE → null.
 */
export const SIZE_CM_RANGE = [6, 60] as const;
const SIZE_CODE = /(?:^|[^A-Za-z0-9])[A-Za-z]{1,3}\d{3,6}[-_ ](?:\d[-_ ])?(\d{2})(?=[-_ .]|$)/;

export function widthCmFromName(text: string): number | null {
  const match = SIZE_CODE.exec(text);
  if (!match) return null;
  const cm = Number(match[1]);
  return cm >= SIZE_CM_RANGE[0] && cm <= SIZE_CM_RANGE[1] ? cm : null;
}

/** Hai cỡ túi của shop theo bề ngang đáy túi (người dùng chốt 15/10) — ảnh không có mã SP thì chọn nhanh một trong hai. */
export const BAG_SIZE_CLASSES = [
  { id: 'small', label: 'Túi nhỏ', minCm: 22, maxCm: 26 },
  { id: 'large', label: 'Túi lớn', minCm: 32, maxCm: 40 },
] as const;
export type BagSizeClass = (typeof BAG_SIZE_CLASSES)[number];

/** Số cm đại diện cho một cỡ: giữa khoảng (túi nhỏ 24, túi lớn 36). */
export function typicalWidthCm(size: BagSizeClass): number {
  return (size.minCm + size.maxCm) / 2;
}

/**
 * Ảnh chưa rõ cỡ tạm coi là túi nhỏ: không có cm thì túi nào cũng ra cùng một cỡ thân (bodySize), không theo hộp — lấy
 * túi nhỏ thì ít nhất đúng cỡ so với hộp cho phần lớn hàng; người dùng bấm "Túi lớn" hoặc gõ cm để sửa.
 */
export const FALLBACK_SIZE_CLASS: BagSizeClass = BAG_SIZE_CLASSES[0];

/** "Túi Đeo Chéo  #2" → "tui-deo-cheo-2" — tên file an toàn trên mọi hệ điều hành. */
export function slugifyFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return slug || 'anh-sp';
}

/** Tên file trong ZIP theo tên SP, trùng thì thêm -2, -3... để không file nào đè file nào. */
export function uniqueFileNames(entries: readonly { name: string; extension: string }[]): string[] {
  const used = new Set<string>();
  return entries.map(({ name, extension }) => {
    const base = slugifyFileName(name);
    let candidate = `${base}.${extension}`;
    for (let n = 2; used.has(candidate); n += 1) candidate = `${base}-${n}.${extension}`;
    used.add(candidate);
    return candidate;
  });
}

/**
 * Chạy `worker` cho từng phần tử, tối đa `limit` phần tử cùng lúc, theo đúng thứ tự danh sách.
 * `isStopped()` trả true thì không nhận thêm phần tử mới (phần tử đang chạy vẫn chạy nốt — bên gọi
 * tự huỷ request nếu muốn). Lỗi của một phần tử không làm dừng cả lô: worker tự ghi lỗi vào phần tử
 * đó; lỗi lọt ra ngoài worker cũng bị nuốt để các phần tử còn lại vẫn chạy.
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
  isStopped: () => boolean = () => false,
): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < items.length && !isStopped()) {
      const item = items[next];
      next += 1;
      try {
        await worker(item);
      } catch {
        // worker tự báo lỗi theo từng phần tử
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
}

/** GET /product-image/gemini-estimate — trung bình tiền thật của các lượt Gemini gần nhất. */
export interface GeminiEstimate {
  per_image_usd: number | null;
  per_image_vnd: number | null;
  sample_size: number;
  /** Lý do chưa quy ra VNĐ (vd thiếu tỷ giá trên BE). */
  note: string | null;
}

/**
 * Câu trong hộp xác nhận lô Gemini: "N ảnh, khoảng X đ". `estimate` null = không lấy được giá ước
 * tính (lỗi mạng...) — vẫn cho chạy, chỉ nói thẳng là chưa có số. Không bao giờ tự bịa đơn giá.
 */
export function geminiBatchCostText(count: number, estimate: GeminiEstimate | null): string {
  const head = `Lô này là ${count} lượt tính phí Gemini, kể cả ảnh ra chưa đạt.`;
  if (!estimate) return `${head} Chưa lấy được giá ước tính.`;
  const basis = `theo trung bình ${estimate.sample_size} lượt gần nhất`;
  if (estimate.per_image_vnd !== null) {
    return `${head} Khoảng ${formatVnd(count * estimate.per_image_vnd)} (≈${formatVnd(estimate.per_image_vnd)}/ảnh, ${basis}).`;
  }
  if (estimate.per_image_usd !== null) {
    const usd = `Khoảng ${formatUsd(count * estimate.per_image_usd)} (≈${formatUsd(estimate.per_image_usd)}/ảnh, ${basis})`;
    return `${head} ${usd}${estimate.note ? ` — ${estimate.note}` : ''}.`;
  }
  return `${head} Chưa có lượt Gemini nào để ước tính giá — tiền thật hiện dưới từng ảnh sau khi tạo.`;
}

export interface BatchSummaryItem {
  status: BatchItemStatus;
  result: { cost: { vnd: number | null } | null; approved: boolean } | null;
}

/** Đếm theo trạng thái + tiền Gemini đã biết / số lượt chưa biết tiền + số ảnh đạt. */
export function summarizeBatch(items: readonly BatchSummaryItem[]) {
  const summary = { total: items.length, pending: 0, running: 0, done: 0, error: 0, knownVnd: 0, unknownCost: 0, approved: 0 };
  for (const item of items) {
    summary[item.status] += 1;
    const cost = item.result?.cost;
    if (cost) {
      if (cost.vnd === null) summary.unknownCost += 1;
      else summary.knownVnd += cost.vnd;
    }
    if (item.result?.approved) summary.approved += 1;
  }
  return summary;
}
