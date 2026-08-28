/**
 * Poll 1 job nền content-transform (transcribe / upgrade) qua BE.
 *
 * Vì sao: transcribe file dài + upgrade kịch bản dài chạy hàng trăm giây. Trước đây FE giữ 1
 * `await apiClient.post(...)` suốt thời gian đó — Django chạm ngân sách ~415s là tự trả 504,
 * và người dùng chỉ thấy spinner "đứng hình", đóng tab là mất trắng. Nay BE tạo job, trả
 * job_id ngay; FE gọi hàm này để poll mỗi ~3s cho tới khi xong.
 *
 * Tách khỏi page.tsx để test được bằng 1 `getStatus` giả (không cần axios/jsdom).
 */

export type TransformJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'not_found';

export interface TransformJobPoll {
  status: TransformJobStatus;
  message?: string | null;
  kind?: string | null;
  /** transcribe: { transcript, duration_seconds, char_count }. */
  result?: any;
  /** upgrade completed: shape khớp response /upgrade đồng bộ. */
  previous?: any;
  upgraded?: any;
}

/** Lỗi có message hiển thị được cho người dùng (job error / not_found / quá giờ). */
export class TransformJobError extends Error {}
/** Người dùng đã huỷ, hoặc lượt này đã lỗi thời (đổi tab / chọn file khác). */
export class TransformJobAbort extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PollOptions {
  /** Gọi mỗi lần BE trả message tiến độ mới. */
  onProgress?: (message: string) => void;
  /** true = lượt này đã lỗi thời (page.tsx tăng requestId khi đổi tab/chọn file khác). */
  isStale?: () => boolean;
  intervalMs?: number;
  /** Trần chờ tổng — quá mốc này coi như job treo. Mặc định 12 phút. */
  maxMs?: number;
  /** Bơm từ ngoài để test không phải chờ thật. */
  sleepFn?: (ms: number) => Promise<void>;
  nowFn?: () => number;
}

/**
 * Poll `getStatus(jobId)` cho tới trạng thái cuối.
 * - completed  → trả nguyên object poll (page.tsx tự đọc result / upgraded).
 * - error / not_found / quá giờ → ném TransformJobError (message hiển thị được).
 * - cancelled / isStale() → ném TransformJobAbort (không hiện toast lỗi).
 */
export async function pollTransformJob(
  getStatus: (jobId: string) => Promise<TransformJobPoll>,
  jobId: string,
  opts: PollOptions = {},
): Promise<TransformJobPoll> {
  const interval = opts.intervalMs ?? 3000;
  const maxMs = opts.maxMs ?? 12 * 60_000;
  const doSleep = opts.sleepFn ?? sleep;
  const now = opts.nowFn ?? (() => Date.now());
  const startedAt = now();
  let lastProgress = '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await doSleep(interval);
    if (opts.isStale?.()) throw new TransformJobAbort('stale');

    const poll = await getStatus(jobId);

    if (poll.status === 'completed') return poll;
    if (poll.status === 'cancelled') throw new TransformJobAbort('cancelled');
    if (poll.status === 'error') {
      throw new TransformJobError(poll.message || 'Xử lý thất bại. Vui lòng thử lại.');
    }
    if (poll.status === 'not_found') {
      throw new TransformJobError('Lượt xử lý bị mất dấu (máy chủ có thể đã khởi động lại). Vui lòng chạy lại.');
    }

    if (poll.message && poll.message !== lastProgress) {
      lastProgress = poll.message;
      opts.onProgress?.(poll.message);
    }
    if (now() - startedAt > maxMs) {
      throw new TransformJobError('Xử lý lâu hơn dự kiến. Vui lòng thử lại sau.');
    }
  }
}

// ── Lưu/khôi phục job đang chạy khi F5 / đóng-mở lại tab ──────────────────────
const ACTIVE_JOB_KEY = 'ct_active_job';
const ACTIVE_JOB_MAX_AGE_MS = 15 * 60_000;

export interface ActiveJob {
  jobId: string;
  kind: 'transcribe' | 'upgrade';
  /** Với upgrade: history_id của bản ghi placeholder. */
  historyId?: string | null;
  /** Với transcribe: tab đang chọn ('video' | 'audio') — để resume mở lại đúng tab. */
  inputMode?: 'text' | 'video' | 'audio';
  startedAt: number;
}

export function saveActiveJob(job: ActiveJob): void {
  try {
    localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(job));
  } catch {
    /* private mode / quota — bỏ qua, chỉ mất tính năng resume */
  }
}

export function clearActiveJob(): void {
  try {
    localStorage.removeItem(ACTIVE_JOB_KEY);
  } catch {
    /* noop */
  }
}

/** Trả job đang chạy còn hạn resume, hoặc null. Tự dọn entry quá cũ/hỏng. */
export function loadActiveJob(nowFn: () => number = () => Date.now()): ActiveJob | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(ACTIVE_JOB_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const job = JSON.parse(raw) as ActiveJob;
    if (!job?.jobId || !job?.kind || typeof job.startedAt !== 'number') {
      clearActiveJob();
      return null;
    }
    if (nowFn() - job.startedAt > ACTIVE_JOB_MAX_AGE_MS) {
      clearActiveJob();
      return null;
    }
    return job;
  } catch {
    clearActiveJob();
    return null;
  }
}
