import {
  pollTransformJob,
  TransformJobError,
  TransformJobAbort,
  loadActiveJob,
  saveActiveJob,
  clearActiveJob,
  type TransformJobPoll,
} from './transform-job';

const noSleep = () => Promise.resolve();

/** getStatus giả: trả lần lượt các poll trong `seq`, lần cuối lặp lại mãi. */
function fakeStatus(seq: TransformJobPoll[]) {
  let i = 0;
  const calls: string[] = [];
  const fn = async (jobId: string) => {
    calls.push(jobId);
    const item = seq[Math.min(i, seq.length - 1)];
    i += 1;
    return item;
  };
  return Object.assign(fn, { calls });
}

describe('pollTransformJob', () => {
  it('poll qua queued/running rồi completed → trả object completed', async () => {
    const getStatus = fakeStatus([
      { status: 'queued', message: 'Đang chờ...' },
      { status: 'running', message: 'Đang nghe...' },
      { status: 'completed', result: { transcript: 'xin chào' } },
    ]);
    const progress: string[] = [];

    const res = await pollTransformJob(getStatus, 'job-1', {
      sleepFn: noSleep,
      onProgress: (m) => progress.push(m),
    });

    expect(res.status).toBe('completed');
    expect(res.result.transcript).toBe('xin chào');
    expect(progress).toEqual(['Đang chờ...', 'Đang nghe...']);
    expect(getStatus.calls).toEqual(['job-1', 'job-1', 'job-1']);
  });

  it('onProgress không bắn lại khi message không đổi', async () => {
    const getStatus = fakeStatus([
      { status: 'running', message: 'Đang xử lý...' },
      { status: 'running', message: 'Đang xử lý...' },
      { status: 'completed' },
    ]);
    const progress: string[] = [];
    await pollTransformJob(getStatus, 'j', { sleepFn: noSleep, onProgress: (m) => progress.push(m) });
    expect(progress).toEqual(['Đang xử lý...']);
  });

  it('status error → ném TransformJobError kèm message của BE', async () => {
    const getStatus = fakeStatus([{ status: 'error', message: 'DeepSeek không trả lời kịp.' }]);
    await expect(pollTransformJob(getStatus, 'j', { sleepFn: noSleep })).rejects.toThrow(
      new TransformJobError('DeepSeek không trả lời kịp.'),
    );
  });

  it('status not_found → TransformJobError "mất dấu"', async () => {
    const getStatus = fakeStatus([{ status: 'not_found' }]);
    await expect(pollTransformJob(getStatus, 'j', { sleepFn: noSleep })).rejects.toThrow(/mất dấu/);
  });

  it('status cancelled → TransformJobAbort (không phải lỗi hiển thị)', async () => {
    const getStatus = fakeStatus([{ status: 'cancelled' }]);
    await expect(pollTransformJob(getStatus, 'j', { sleepFn: noSleep })).rejects.toBeInstanceOf(TransformJobAbort);
  });

  it('isStale() true → dừng poll ngay bằng TransformJobAbort, không đọc status', async () => {
    const getStatus = fakeStatus([{ status: 'running' }]);
    await expect(
      pollTransformJob(getStatus, 'j', { sleepFn: noSleep, isStale: () => true }),
    ).rejects.toBeInstanceOf(TransformJobAbort);
    expect(getStatus.calls).toHaveLength(0);
  });

  it('quá maxMs mà job vẫn chạy → TransformJobError "lâu hơn dự kiến"', async () => {
    const getStatus = fakeStatus([{ status: 'running', message: 'vẫn chạy' }]);
    let t = 0;
    const nowFn = () => (t += 60_000); // mỗi lần gọi +60s
    await expect(
      pollTransformJob(getStatus, 'j', { sleepFn: noSleep, nowFn, maxMs: 120_000 }),
    ).rejects.toThrow(/lâu hơn dự kiến/);
  });
});

describe('active job persistence', () => {
  beforeEach(() => localStorage.clear());

  it('save → load trả lại đúng job khi còn hạn', () => {
    saveActiveJob({ jobId: 'j1', kind: 'transcribe', startedAt: 1000 });
    expect(loadActiveJob(() => 5000)).toEqual({ jobId: 'j1', kind: 'transcribe', startedAt: 1000 });
  });

  it('job quá 15 phút → loadActiveJob trả null và tự xoá', () => {
    saveActiveJob({ jobId: 'j1', kind: 'upgrade', historyId: 'h1', startedAt: 0 });
    expect(loadActiveJob(() => 16 * 60_000)).toBeNull();
    expect(localStorage.getItem('ct_active_job')).toBeNull();
  });

  it('entry hỏng → null + tự dọn', () => {
    localStorage.setItem('ct_active_job', '{not json');
    expect(loadActiveJob()).toBeNull();
    expect(localStorage.getItem('ct_active_job')).toBeNull();
  });

  it('clearActiveJob xoá entry', () => {
    saveActiveJob({ jobId: 'j1', kind: 'transcribe', startedAt: Date.now() });
    clearActiveJob();
    expect(loadActiveJob()).toBeNull();
  });
});
