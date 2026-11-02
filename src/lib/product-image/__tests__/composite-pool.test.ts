/**
 * Chức năng: Tạo ảnh sản phẩm — chia việc dựng lớp ảnh cho Web Worker, worker hỏng thì không treo lô.
 */
import { createCompositePool, type CompositeJob } from '../composite-pool';
import type { RealismSettings } from '../realism-layers';

class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  jobs: CompositeJob[] = [];
  terminated = false;
  postMessage(job: CompositeJob) {
    this.jobs.push(job);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.onmessage?.({ data });
  }
}

const base = () => {
  const data = new Uint8ClampedArray(10 * 10 * 4);
  for (let i = 0; i < data.length; i += 4) data.set([120, 110, 100, 255], i);
  return { width: 10, height: 10, data };
};
const settings: RealismSettings = { shadow: false, shadowStrength: 0.7, shadowHeight: 1.8, look: false, warmth: 0 };
const target = { width: 10, height: 10 };

function setup(timeoutMs = 1000) {
  const workers: FakeWorker[] = [];
  const run = createCompositePool(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker as unknown as Worker;
  }, 2, timeoutMs);
  return { run, workers };
}

describe('createCompositePool', () => {
  afterEach(() => jest.useRealTimers());

  it('chia việc cho worker rảnh hơn và trả kết quả của worker', async () => {
    const { run, workers } = setup();
    const first = run(base(), settings, target);
    const second = run(base(), settings, target);
    expect(workers.map((w) => w.jobs.length)).toEqual([1, 1]);
    const layers = { brightness: 3 };
    workers[0].reply({ id: workers[0].jobs[0].id, layers });
    workers[1].reply({ id: workers[1].jobs[0].id, error: 'hỏng' });
    await expect(first).resolves.toBe(layers);
    await expect(second).rejects.toThrow('hỏng');
  });

  it('worker lỗi tải hoặc chết thì việc dở tính ở luồng chính, việc sau không qua worker nữa', async () => {
    const { run, workers } = setup();
    const pending = run(base(), settings, target);
    workers[0].onerror?.();
    await expect(pending).resolves.toMatchObject({ product: { width: 10 } });
    expect(workers[0].terminated).toBe(true);
    await expect(run(base(), settings, target)).resolves.toMatchObject({ product: { width: 10 } });
    expect(workers[1].jobs).toHaveLength(0);
  });

  it('worker treo quá giờ thì không kẹt mãi', async () => {
    jest.useFakeTimers();
    const { run, workers } = setup(500);
    const pending = run(base(), settings, target);
    jest.advanceTimersByTime(500);
    await expect(pending).resolves.toMatchObject({ product: { width: 10 } });
    expect(workers[0].terminated).toBe(true);
  });

  it('bấm dừng thì thoát ngay, kết quả về muộn bị bỏ qua', async () => {
    const { run, workers } = setup();
    const controller = new AbortController();
    const pending = run(base(), settings, target, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow('Đã dừng');
    expect(() => workers[0].reply({ id: workers[0].jobs[0].id, layers: {} })).not.toThrow();
    await expect(run(base(), settings, target, controller.signal)).rejects.toThrow('Đã dừng');
  });

  it('không tạo được worker thì tính ở luồng chính', async () => {
    const run = createCompositePool(() => {
      throw new Error('no worker');
    }, 2);
    await expect(run(base(), settings, target)).resolves.toMatchObject({ product: { width: 10 } });
  });
});
