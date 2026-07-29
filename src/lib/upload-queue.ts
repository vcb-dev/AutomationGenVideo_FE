/**
 * Client-side upload concurrency limiter.
 *
 * Limits each browser tab to MAX_CONCURRENT simultaneous uploads.
 * 200 users × 1 upload each = 200 concurrent (vs. unlimited without this).
 * When a user tries to upload multiple files, extras wait in queue.
 */

const MAX_CONCURRENT = 1;

let _running = 0;
type Job = { fn: () => Promise<unknown>; res: (v: unknown) => void; rej: (e: unknown) => void };
const _queue: Job[] = [];

function _drain() {
  while (_running < MAX_CONCURRENT && _queue.length > 0) {
    const job = _queue.shift()!;
    _running++;
    job.fn()
      .then(job.res)
      .catch(job.rej)
      .finally(() => { _running--; _drain(); });
  }
}

/** Wraps an upload function so it respects the concurrency limit. */
export function withUploadQueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((res, rej) => {
    _queue.push({ fn: fn as () => Promise<unknown>, res: res as (v: unknown) => void, rej });
    _drain();
  });
}

/** Number of uploads waiting (not yet started). */
export function uploadQueueSize(): number {
  return _queue.length;
}
