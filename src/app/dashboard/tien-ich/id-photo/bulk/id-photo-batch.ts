/**
 * Logic thuần cho luồng "Tạo ảnh thẻ hàng loạt" (tab "Tạo hàng loạt" của module id-photo).
 *
 * Tách khỏi component để test được bằng hàm giả (không cần axios / jsdom render):
 *  - `uploadBatchImages`  — upload TUẦN TỰ ảnh gốc từng người → lấy uploadId (batch KHÔNG nhận
 *    base64 trực tiếp: body JSON giới hạn 2MB ở BE, xem id-photo-batch.service.ts).
 *  - `createBatch`        — gọi POST /id-photo/batch, trả batchJobId.
 *  - `pollIdPhotoBatch`   — poll GET /id-photo/batch/:id mỗi ~3.5s, cập nhật lưới, dừng khi
 *    COMPLETED/FAILED; chịu được lỗi mạng tạm thời (retry nhẹ) trước khi bỏ cuộc.
 *  - save/load/clearActiveBatch — nhớ batchJobId đang chạy vào localStorage để resume khi F5 /
 *    rời trang rồi quay lại (cùng pattern `ct_active_job` của content-transform/transform-job.ts).
 *  - `batchRetryPath`     — dựng path endpoint "thử lại 1 người".
 */

import { IdPhotoPosition } from '../components/constants';

export type IdPhotoBatchOverallStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type IdPhotoItemStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface BatchPersonStatus {
  /** = historyId của IdPhotoHistory con — dùng cho retry + tải thumbnail (GET /id-photo/:id). */
  id: string;
  employee_name: string;
  employee_team: string;
  employee_id: string;
  // [ĐÃ BỎ] employee_title_prefix — field "Tiền tố chức danh" đã gỡ, BE không trả nữa.
  position: IdPhotoPosition;
  status: IdPhotoItemStatus;
  error_message: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchStatusResponse {
  id: string;
  status: IdPhotoBatchOverallStatus;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
  counts: { pending: number; processing: number; success: number; failed: number };
  people: BatchPersonStatus[];
}

export interface BatchCreatePerson {
  uploadId: string;
  employeeName: string;
  employeeTeam: string;
  employeeId: string;
  position: IdPhotoPosition;
}

/** Thông tin 1 người trên form trái, trước khi upload/submit. */
export interface BatchCardInput {
  key: string;
  file: File | null;
  employeeName: string;
  employeeTeam: string;
  employeeId: string;
  position: IdPhotoPosition;
}

export const ID_PHOTO_BATCH_MAX_PEOPLE = 20;

/** Lỗi có message hiển thị được cho người dùng (batch lỗi hẳn / mất mạng lâu / quá giờ). */
export class BatchError extends Error {}
/** Lượt poll đã lỗi thời (đổi tab / bắt đầu lượt mới) — không hiện toast lỗi. */
export class BatchAbort extends Error {}
/** Batch không còn trên máy chủ (404 — id sai / đã hết hạn). Khác lỗi mạng: resume gặp cái này
 *  thì dọn localStorage + về màn nhập, KHÔNG hiện lỗi to. */
export class BatchGone extends Error {}

function statusOf(err: any): number | undefined {
  return err?.response?.status ?? err?.status;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Chuẩn bị dữ liệu: upload ảnh gốc tuần tự ────────────────────────────────

export interface UploadBatchProgress {
  done: number;
  total: number;
  /** Tên người vừa upload xong (để hiện "Đang tải ảnh: Nguyễn Văn A..."). */
  name: string;
}

/**
 * Với mỗi card: kiểm tra có ảnh chưa → upload lấy uploadId → gom thành mảng `people` gửi cho
 * POST /id-photo/batch. Upload TUẦN TỰ (không Promise.all): mỗi ảnh tới 10MB, bắn song song 20
 * cái dễ nghẽn mạng người dùng và làm BE ôm 20 buffer cùng lúc.
 *
 * Ném `BatchError` với message chỉ rõ người nào nếu thiếu ảnh hoặc upload hỏng — dừng ngay,
 * không tạo batch nửa vời.
 */
export async function uploadBatchImages(
  uploadFn: (file: File) => Promise<string>,
  cards: BatchCardInput[],
  onProgress?: (p: UploadBatchProgress) => void,
): Promise<BatchCreatePerson[]> {
  if (cards.length === 0) {
    throw new BatchError('Chưa có nhân viên nào trong danh sách.');
  }
  if (cards.length > ID_PHOTO_BATCH_MAX_PEOPLE) {
    throw new BatchError(`Tối đa ${ID_PHOTO_BATCH_MAX_PEOPLE} người mỗi lần (đang có ${cards.length}).`);
  }

  const people: BatchCreatePerson[] = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const who = c.employeeName.trim() || `Người thứ ${i + 1}`;
    if (!c.file) {
      throw new BatchError(`${who} chưa chọn ảnh gốc.`);
    }
    if (!c.employeeName.trim() || !c.employeeTeam.trim() || !c.employeeId.trim()) {
      throw new BatchError(`${who} còn thiếu tên / team / mã nhân viên.`);
    }

    let uploadId: string;
    try {
      uploadId = await uploadFn(c.file);
    } catch (err: any) {
      throw new BatchError(
        `Tải ảnh của ${who} thất bại: ${err?.response?.data?.message || err?.message || 'lỗi không xác định'}.`,
      );
    }
    if (!uploadId) throw new BatchError(`Máy chủ không trả về mã ảnh cho ${who}.`);

    people.push({
      uploadId,
      employeeName: c.employeeName.trim(),
      employeeTeam: c.employeeTeam.trim(),
      employeeId: c.employeeId.trim(),
      position: c.position,
    });
    onProgress?.({ done: i + 1, total: cards.length, name: who });
  }
  return people;
}

/** POST /id-photo/batch — trả batchJobId ngay, chưa chờ xử lý. */
export async function createBatch(
  postFn: (people: BatchCreatePerson[]) => Promise<{ batchJobId: string }>,
  people: BatchCreatePerson[],
): Promise<string> {
  const res = await postFn(people);
  if (!res?.batchJobId) throw new BatchError('Máy chủ không trả về mã batch.');
  return res.batchJobId;
}

// ─── Poll trạng thái ────────────────────────────────────────────────────────

export interface PollBatchOptions {
  /** Gọi sau MỖI lần poll thành công — component vẽ lại lưới từ đây. */
  onUpdate: (r: BatchStatusResponse) => void;
  /** Gọi khi 1 lần poll lỗi mạng nhưng CHƯA bỏ cuộc (để hiện "đang thử kết nối lại..."). */
  onTransientError?: (consecutiveFailures: number) => void;
  /** true = lượt poll này đã lỗi thời (component tăng requestId). */
  isStale?: () => boolean;
  intervalMs?: number;
  /** Trần chờ tổng. Mặc định 20 phút (20 người × ~45s + backoff). */
  maxMs?: number;
  /** Số lần poll lỗi mạng LIÊN TIẾP tối đa trước khi ném BatchError. Mặc định 6 (~21s). */
  maxConsecutiveErrors?: number;
  sleepFn?: (ms: number) => Promise<void>;
  nowFn?: () => number;
}

/**
 * Poll `getStatus(batchJobId)` cho tới khi batch COMPLETED hoặc FAILED.
 * - COMPLETED / FAILED → onUpdate lần cuối rồi trả về response.
 * - isStale() → ném BatchAbort (không hiện lỗi).
 * - Mất mạng quá `maxConsecutiveErrors` lần liên tiếp / quá `maxMs` → ném BatchError.
 *
 * Poll NGAY lần đầu (không chờ interval) — để resume hiện trạng thái tức thì.
 */
export async function pollIdPhotoBatch(
  getStatus: (batchJobId: string) => Promise<BatchStatusResponse>,
  batchJobId: string,
  opts: PollBatchOptions,
): Promise<BatchStatusResponse> {
  const interval = opts.intervalMs ?? 3500;
  const maxMs = opts.maxMs ?? 20 * 60_000;
  const maxErrors = opts.maxConsecutiveErrors ?? 6;
  const doSleep = opts.sleepFn ?? sleep;
  const now = opts.nowFn ?? (() => Date.now());
  const startedAt = now();
  let failures = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (opts.isStale?.()) throw new BatchAbort('stale');

    let r: BatchStatusResponse;
    try {
      r = await getStatus(batchJobId);
      failures = 0;
    } catch (err) {
      // 404 = batch không còn → dừng ngay, không retry như lỗi mạng.
      if (statusOf(err) === 404) throw new BatchGone('batch không còn');
      failures += 1;
      if (failures >= maxErrors) {
        throw new BatchError(
          'Mất kết nối tới máy chủ quá lâu. Kiểm tra mạng rồi mở lại trang — batch vẫn đang chạy ở máy chủ.',
        );
      }
      opts.onTransientError?.(failures);
      await doSleep(interval);
      continue;
    }

    opts.onUpdate(r);
    if (r.status === 'COMPLETED' || r.status === 'FAILED') return r;

    if (now() - startedAt > maxMs) {
      throw new BatchError('Batch chạy lâu hơn dự kiến. Tải lại trang để xem trạng thái mới nhất.');
    }
    await doSleep(interval);
  }
}

// ─── Nhớ batch đang chạy để resume (localStorage) ───────────────────────────

const ACTIVE_BATCH_KEY = 'id_photo_active_batch';
/** Batch 20 người chạy tối đa ~15'; cho 30' biên để F5 muộn vẫn resume được. */
const ACTIVE_BATCH_MAX_AGE_MS = 30 * 60_000;

export interface ActiveBatch {
  batchJobId: string;
  startedAt: number;
}

export function saveActiveBatch(b: ActiveBatch): void {
  try {
    localStorage.setItem(ACTIVE_BATCH_KEY, JSON.stringify(b));
  } catch {
    /* private mode / quota — chỉ mất tính năng resume, không phải lỗi */
  }
}

export function clearActiveBatch(): void {
  try {
    localStorage.removeItem(ACTIVE_BATCH_KEY);
  } catch {
    /* noop */
  }
}

/** Trả batch đang chạy còn hạn resume, hoặc null. Tự dọn entry hỏng / quá cũ. */
export function loadActiveBatch(nowFn: () => number = () => Date.now()): ActiveBatch | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(ACTIVE_BATCH_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as ActiveBatch;
    if (!b?.batchJobId || typeof b.startedAt !== 'number') {
      clearActiveBatch();
      return null;
    }
    if (nowFn() - b.startedAt > ACTIVE_BATCH_MAX_AGE_MS) {
      clearActiveBatch();
      return null;
    }
    return b;
  } catch {
    clearActiveBatch();
    return null;
  }
}

// ─── Thử lại 1 người ────────────────────────────────────────────────────────

/** Path endpoint "xuất 1 file PDF gộp N trang (chỉ người SUCCESS)" — POST, responseType blob. */
export function batchExportPdfPath(batchJobId: string): string {
  if (!batchJobId) throw new BatchError('Thiếu mã batch để xuất PDF.');
  return `/id-photo/batch/${batchJobId}/export-pdf`;
}

/** Đọc số đã xuất / bỏ qua từ header BE (X-Exported-Count / X-Skipped-Count); thiếu thì lấy
 *  theo `counts` đang có ở FE. */
export function parseExportPdfCounts(
  headers: Headers | Record<string, unknown>,
  fallback: { success: number; failed: number },
): { exported: number; skipped: number } {
  const get = (k: string): unknown =>
    headers instanceof Headers ? headers.get(k) : (headers as Record<string, unknown>)?.[k];
  const num = (k: string) => Number(get(k));
  const exported = Number.isFinite(num('x-exported-count')) ? num('x-exported-count') : fallback.success;
  const skipped = Number.isFinite(num('x-skipped-count')) ? num('x-skipped-count') : fallback.failed;
  return { exported, skipped };
}

/**
 * Tải 1 file PDF gộp cho cả đợt.
 *
 * DÙNG `fetch` CHỨ KHÔNG dùng axios apiClient: axios (XHR adapter) + `responseType:'blob'` +
 * response CHẬM (BE kéo ~10MB ảnh từ pooler Supabase mất 5-60s, chỉ gửi byte đầu sau khi xong)
 * → Chromium huỷ XHR với CORS error giả `MissingAllowOriginHeader` DÙ response có đủ header
 * ACAO (đã xác minh bằng Playwright APIRequest: server trả 201 + ACAO đúng). `fetch` cùng
 * request thì chạy bình thường. POST không body + không header lạ = "simple request", không
 * cần preflight; BE trả ACAO cho origin FE nên đọc được.
 */
export async function downloadBatchPdf(
  batchJobId: string,
  fallbackCounts: { success: number; failed: number },
): Promise<{ blob: Blob; exported: number; skipped: number }> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const res = await fetch(`${base}${batchExportPdfPath(batchJobId)}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    let msg = `Xuất PDF hàng loạt thất bại (mã ${res.status}).`;
    try {
      msg = (await res.json())?.message || msg;
    } catch {
      /* body không phải JSON — giữ message mặc định */
    }
    throw new BatchError(msg);
  }
  const { exported, skipped } = parseExportPdfCounts(res.headers, fallbackCounts);
  return { blob: await res.blob(), exported, skipped };
}

/** Path endpoint "thử lại đúng 1 người bị LỖI" — POST, không body. */
export function batchRetryPath(batchJobId: string, historyId: string): string {
  if (!batchJobId || !historyId) throw new BatchError('Thiếu mã batch hoặc mã người để thử lại.');
  return `/id-photo/batch/${batchJobId}/retry/${historyId}`;
}

/** Path endpoint "GHÉP ÁO LẠI cho 1 người đã SUCCESS" (ảnh không ưng ý) — POST, không body.
 *  TỐN 1 lượt Gemini: component phải bắt xác nhận 2 lần trước khi gọi. */
export function batchRemergePath(batchJobId: string, historyId: string): string {
  if (!batchJobId || !historyId) throw new BatchError('Thiếu mã batch hoặc mã người để ghép áo lại.');
  return `/id-photo/batch/${batchJobId}/remerge/${historyId}`;
}

/**
 * Gọi retry / remerge cho 1 người. Cả hai đưa người đó về PENDING ở BE → worker chạy lại đủ
 * bước (ghép áo → ghép khung → PDF). Trả về true để component biết cần KHỞI ĐỘNG LẠI vòng poll
 * (batch có thể đã dừng vì COMPLETED, giờ có người quay lại PENDING).
 */
export async function retryBatchPerson(
  postFn: (path: string) => Promise<unknown>,
  batchJobId: string,
  historyId: string,
): Promise<true> {
  await postFn(batchRetryPath(batchJobId, historyId));
  return true;
}

export async function remergeBatchPerson(
  postFn: (path: string) => Promise<unknown>,
  batchJobId: string,
  historyId: string,
): Promise<true> {
  await postFn(batchRemergePath(batchJobId, historyId));
  return true;
}
