import { buildRealismLayers, type CutoutPixels, type RealismLayers, type RealismSettings } from './realism-layers';

export interface CompositeJob {
  id: number;
  base: CutoutPixels;
  settings: RealismSettings;
  target: { width: number; height: number };
}

export type CompositeReply = { id: number; layers: RealismLayers } | { id: number; error: string };

/** Lâu hơn mức này thì coi worker đã treo. */
export const COMPOSITE_JOB_TIMEOUT_MS = 30_000;

export type BuildLayers = (
  base: CutoutPixels,
  settings: RealismSettings,
  target: { width: number; height: number },
  signal?: AbortSignal,
) => Promise<RealismLayers>;

interface Job {
  resolve: (layers: RealismLayers) => void;
  reject: (error: Error) => void;
  /** Worker hỏng giữa chừng: tính lại ở luồng chính. */
  recover: () => void;
  timer: ReturnType<typeof setTimeout>;
}

interface Slot {
  worker: Worker;
  jobs: Map<number, Job>;
}

const stopped = () => new Error('Đã dừng');

/**
 * Chia việc dựng lớp ảnh cho `size` worker. Worker không tải được, chết hoặc treo quá `timeoutMs` thì bỏ hẳn,
 * việc đang dở và việc sau tính ở luồng chính.
 */
export function createCompositePool(createWorker: () => Worker, size: number, timeoutMs = COMPOSITE_JOB_TIMEOUT_MS): BuildLayers {
  let slots: Slot[] = [];
  let broken = false;
  let nextId = 0;

  const retire = (slot: Slot) => {
    broken = true;
    slots = slots.filter((other) => other !== slot);
    slot.worker.terminate();
    const jobs = [...slot.jobs.values()];
    slot.jobs.clear();
    jobs.forEach((job) => {
      clearTimeout(job.timer);
      job.recover();
    });
  };

  const createSlot = (): Slot => {
    const slot: Slot = { worker: createWorker(), jobs: new Map() };
    slot.worker.onmessage = ({ data }: MessageEvent<CompositeReply>) => {
      const job = slot.jobs.get(data.id);
      if (!job) return;
      slot.jobs.delete(data.id);
      clearTimeout(job.timer);
      if ('layers' in data) job.resolve(data.layers);
      else job.reject(new Error(data.error));
    };
    slot.worker.onerror = () => retire(slot);
    slot.worker.onmessageerror = () => retire(slot);
    return slot;
  };

  return (base, settings, target, signal) => {
    if (signal?.aborted) return Promise.reject(stopped());
    const local = () => new Promise<RealismLayers>((resolve) => resolve(buildRealismLayers(base, settings, target)));
    if (broken) return local();
    if (!slots.length) {
      try {
        slots = Array.from({ length: size }, createSlot);
      } catch {
        broken = true;
        return local();
      }
    }
    const slot = slots.reduce((least, candidate) => (candidate.jobs.size < least.jobs.size ? candidate : least));
    const id = (nextId += 1);
    return new Promise<RealismLayers>((resolve, reject) => {
      const abort = () => {
        const job = slot.jobs.get(id);
        if (!job) return;
        slot.jobs.delete(id);
        clearTimeout(job.timer);
        reject(stopped());
      };
      const settle = <T>(finish: (value: T) => void) => (value: T) => {
        signal?.removeEventListener('abort', abort);
        finish(value);
      };
      signal?.addEventListener('abort', abort, { once: true });
      slot.jobs.set(id, {
        resolve: settle(resolve),
        reject: settle(reject),
        recover: () => {
          signal?.removeEventListener('abort', abort);
          local().then(resolve, reject);
        },
        timer: setTimeout(() => retire(slot), timeoutMs),
      });
      // Chép điểm ảnh vì `base` còn được dùng ở luồng chính.
      const copy = base.data.slice();
      const job: CompositeJob = { id, base: { ...base, data: copy }, settings, target };
      slot.worker.postMessage(job, [copy.buffer]);
    });
  };
}
