import {
  uploadBatchImages,
  createBatch,
  pollIdPhotoBatch,
  batchRetryPath,
  batchRemergePath,
  batchExportPdfPath,
  parseExportPdfCounts,
  downloadBatchPdf,
  retryBatchPerson,
  remergeBatchPerson,
  saveActiveBatch,
  loadActiveBatch,
  clearActiveBatch,
  BatchError,
  BatchAbort,
  BatchGone,
  ID_PHOTO_BATCH_MAX_PEOPLE,
  type BatchCardInput,
  type BatchStatusResponse,
} from './id-photo-batch';

const noSleep = () => Promise.resolve();

function card(over: Partial<BatchCardInput> = {}): BatchCardInput {
  return {
    key: over.key ?? Math.random().toString(36),
    file: 'file' in over ? (over.file as File | null) : new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' }),
    employeeName: over.employeeName ?? 'Nguyễn Văn A',
    employeeTeam: over.employeeTeam ?? 'Team Content',
    employeeId: over.employeeId ?? 'NV-1',
    position: over.position ?? 'STAFF_OVER_3M',
  };
}

function status(over: Partial<BatchStatusResponse> = {}): BatchStatusResponse {
  return {
    id: 'b1',
    status: 'PROCESSING',
    totalCount: 2,
    createdAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z',
    counts: { pending: 1, processing: 1, success: 0, failed: 0 },
    people: [],
    ...over,
  };
}

/** getStatus giả: trả lần lượt `seq`, lần cuối lặp mãi. Đếm số lần gọi. */
function fakeStatus(seq: BatchStatusResponse[]) {
  let i = 0;
  const calls: string[] = [];
  const fn = async (id: string) => {
    calls.push(id);
    const item = seq[Math.min(i, seq.length - 1)];
    i += 1;
    return item;
  };
  return Object.assign(fn, { calls });
}

describe('uploadBatchImages', () => {
  it('upload tuần tự từng card → trả mảng people đúng thứ tự + uploadId', async () => {
    const order: string[] = [];
    const uploadFn = jest.fn(async (f: File) => {
      order.push(f.name);
      return `uid-${f.name}`;
    });
    const cards = [
      card({ file: new File([], '1.png', { type: 'image/png' }), employeeName: 'A' }),
      card({ file: new File([], '2.png', { type: 'image/png' }), employeeName: 'B' }),
    ];

    const people = await uploadBatchImages(uploadFn, cards);

    expect(order).toEqual(['1.png', '2.png']); // tuần tự, đúng thứ tự
    expect(people).toEqual([
      expect.objectContaining({ uploadId: 'uid-1.png', employeeName: 'A', position: 'STAFF_OVER_3M' }),
      expect.objectContaining({ uploadId: 'uid-2.png', employeeName: 'B' }),
    ]);
  });

  it('card thiếu ảnh → BatchError chỉ rõ người nào, không gọi upload', async () => {
    const uploadFn = jest.fn();
    const cards = [card({ employeeName: 'Trần B', file: null })];
    await expect(uploadBatchImages(uploadFn as any, cards)).rejects.toThrow(/Trần B chưa chọn ảnh/);
    expect(uploadFn).not.toHaveBeenCalled();
  });

  it('card thiếu tên/team/mã → BatchError', async () => {
    const cards = [card({ employeeTeam: '  ' })];
    await expect(uploadBatchImages(jest.fn(async () => 'x'), cards)).rejects.toThrow(/thiếu tên \/ team/);
  });

  it('quá 20 người → BatchError', async () => {
    const cards = Array.from({ length: ID_PHOTO_BATCH_MAX_PEOPLE + 1 }, (_, i) => card({ employeeName: `NV${i}` }));
    await expect(uploadBatchImages(jest.fn(async () => 'x'), cards)).rejects.toThrow(/Tối đa 20/);
  });

  it('upload 1 ảnh hỏng → BatchError kèm tên người, dừng ngay (không upload tiếp)', async () => {
    const uploadFn = jest
      .fn()
      .mockResolvedValueOnce('uid-1')
      .mockRejectedValueOnce({ response: { data: { message: 'File hỏng' } } });
    const cards = [card({ employeeName: 'A' }), card({ employeeName: 'B' }), card({ employeeName: 'C' })];

    await expect(uploadBatchImages(uploadFn, cards)).rejects.toThrow(/Tải ảnh của B thất bại: File hỏng/);
    expect(uploadFn).toHaveBeenCalledTimes(2); // không đụng tới C
  });
});

describe('createBatch', () => {
  it('trả batchJobId từ response', async () => {
    const id = await createBatch(async () => ({ batchJobId: 'batch-9' }), []);
    expect(id).toBe('batch-9');
  });
  it('response thiếu batchJobId → BatchError', async () => {
    await expect(createBatch(async () => ({} as any), [])).rejects.toBeInstanceOf(BatchError);
  });
});

describe('pollIdPhotoBatch', () => {
  it('poll ngay lần đầu, cập nhật mỗi vòng, dừng khi COMPLETED', async () => {
    const getStatus = fakeStatus([
      status({ status: 'PROCESSING' }),
      status({ status: 'PROCESSING' }),
      status({ status: 'COMPLETED', counts: { pending: 0, processing: 0, success: 2, failed: 0 } }),
    ]);
    const updates: string[] = [];

    const final = await pollIdPhotoBatch(getStatus, 'b1', {
      sleepFn: noSleep,
      onUpdate: (r) => updates.push(r.status),
    });

    expect(final.status).toBe('COMPLETED');
    expect(updates).toEqual(['PROCESSING', 'PROCESSING', 'COMPLETED']);
    expect(getStatus.calls).toEqual(['b1', 'b1', 'b1']);
  });

  it('dừng khi status tổng = FAILED (job chết cứng)', async () => {
    const getStatus = fakeStatus([status({ status: 'FAILED' })]);
    const final = await pollIdPhotoBatch(getStatus, 'b1', { sleepFn: noSleep, onUpdate: () => {} });
    expect(final.status).toBe('FAILED');
  });

  it('isStale() → BatchAbort ngay, không gọi getStatus', async () => {
    const getStatus = fakeStatus([status()]);
    await expect(
      pollIdPhotoBatch(getStatus, 'b1', { sleepFn: noSleep, onUpdate: () => {}, isStale: () => true }),
    ).rejects.toBeInstanceOf(BatchAbort);
    expect(getStatus.calls).toHaveLength(0);
  });

  it('lỗi mạng tạm thời < ngưỡng → onTransientError + poll tiếp, phục hồi được', async () => {
    let call = 0;
    const getStatus = jest.fn(async () => {
      call += 1;
      if (call <= 2) throw new Error('Network Error');
      return status({ status: 'COMPLETED' });
    });
    const transient: number[] = [];

    const final = await pollIdPhotoBatch(getStatus, 'b1', {
      sleepFn: noSleep,
      onUpdate: () => {},
      onTransientError: (n) => transient.push(n),
    });

    expect(transient).toEqual([1, 2]);
    expect(final.status).toBe('COMPLETED');
  });

  it('mất mạng quá maxConsecutiveErrors lần liên tiếp → BatchError "mất kết nối"', async () => {
    const getStatus = jest.fn(async () => {
      throw new Error('Network Error');
    });
    await expect(
      pollIdPhotoBatch(getStatus, 'b1', {
        sleepFn: noSleep,
        onUpdate: () => {},
        maxConsecutiveErrors: 3,
      }),
    ).rejects.toThrow(/Mất kết nối/);
    expect(getStatus).toHaveBeenCalledTimes(3);
  });

  it('1 lần lỗi rồi thành công → reset đếm lỗi (không tích luỹ)', async () => {
    let call = 0;
    const getStatus = jest.fn(async () => {
      call += 1;
      // lỗi ở lần 1 và 3, còn lại ok; maxConsecutiveErrors=2 → không bao giờ chạm vì không LIÊN TIẾP
      if (call === 1 || call === 3) throw new Error('blip');
      if (call >= 5) return status({ status: 'COMPLETED' });
      return status({ status: 'PROCESSING' });
    });

    const final = await pollIdPhotoBatch(getStatus, 'b1', {
      sleepFn: noSleep,
      onUpdate: () => {},
      maxConsecutiveErrors: 2,
    });
    expect(final.status).toBe('COMPLETED');
  });

  it('getStatus trả 404 → BatchGone ngay (không retry như lỗi mạng)', async () => {
    const getStatus = jest.fn(async () => {
      throw { response: { status: 404 } };
    });
    await expect(
      pollIdPhotoBatch(getStatus, 'b1', { sleepFn: noSleep, onUpdate: () => {}, maxConsecutiveErrors: 6 }),
    ).rejects.toBeInstanceOf(BatchGone);
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('quá maxMs mà vẫn PROCESSING → BatchError "lâu hơn dự kiến"', async () => {
    const getStatus = fakeStatus([status({ status: 'PROCESSING' })]);
    let t = 0;
    const nowFn = () => (t += 5 * 60_000);
    await expect(
      pollIdPhotoBatch(getStatus, 'b1', { sleepFn: noSleep, onUpdate: () => {}, nowFn, maxMs: 8 * 60_000 }),
    ).rejects.toThrow(/lâu hơn dự kiến/);
  });
});

describe('active batch persistence (resume)', () => {
  beforeEach(() => localStorage.clear());

  it('save → load trả lại đúng batch khi còn hạn', () => {
    saveActiveBatch({ batchJobId: 'b1', startedAt: 1000 });
    expect(loadActiveBatch(() => 5000)).toEqual({ batchJobId: 'b1', startedAt: 1000 });
  });

  it('quá 30 phút → load trả null + tự xoá', () => {
    saveActiveBatch({ batchJobId: 'b1', startedAt: 0 });
    expect(loadActiveBatch(() => 31 * 60_000)).toBeNull();
    expect(localStorage.getItem('id_photo_active_batch')).toBeNull();
  });

  it('entry hỏng → null + tự dọn', () => {
    localStorage.setItem('id_photo_active_batch', '{oops');
    expect(loadActiveBatch()).toBeNull();
    expect(localStorage.getItem('id_photo_active_batch')).toBeNull();
  });

  it('clearActiveBatch xoá entry', () => {
    saveActiveBatch({ batchJobId: 'b1', startedAt: Date.now() });
    clearActiveBatch();
    expect(loadActiveBatch()).toBeNull();
  });
});

describe('retry 1 người', () => {
  it('batchRetryPath dựng đúng path', () => {
    expect(batchRetryPath('b1', 'h9')).toBe('/id-photo/batch/b1/retry/h9');
  });

  it('batchRetryPath thiếu id → BatchError', () => {
    expect(() => batchRetryPath('', 'h9')).toThrow(BatchError);
    expect(() => batchRetryPath('b1', '')).toThrow(BatchError);
  });

  it('retryBatchPerson gọi đúng endpoint và báo cần restart poll', async () => {
    const postFn = jest.fn(async () => ({ status: 'PENDING' }));
    const shouldRestart = await retryBatchPerson(postFn, 'b1', 'h9');
    expect(postFn).toHaveBeenCalledWith('/id-photo/batch/b1/retry/h9');
    expect(shouldRestart).toBe(true);
  });

  it('retryBatchPerson để lỗi API ném ra ngoài cho component xử lý', async () => {
    const postFn = jest.fn(async () => {
      throw new Error('403');
    });
    await expect(retryBatchPerson(postFn, 'b1', 'h9')).rejects.toThrow('403');
  });
});

describe('ghép áo lại 1 người (SUCCESS, ảnh không ưng ý)', () => {
  it('batchRemergePath dựng đúng path (khác retry)', () => {
    expect(batchRemergePath('b1', 'h9')).toBe('/id-photo/batch/b1/remerge/h9');
    expect(batchRemergePath('b1', 'h9')).not.toBe(batchRetryPath('b1', 'h9'));
  });

  it('batchRemergePath thiếu id → BatchError', () => {
    expect(() => batchRemergePath('', 'h9')).toThrow(BatchError);
  });

  it('remergeBatchPerson gọi đúng endpoint remerge và báo cần restart poll', async () => {
    const postFn = jest.fn(async () => ({ status: 'PENDING' }));
    const shouldRestart = await remergeBatchPerson(postFn, 'b1', 'h9');
    expect(postFn).toHaveBeenCalledWith('/id-photo/batch/b1/remerge/h9');
    expect(shouldRestart).toBe(true);
  });
});

describe('xuất PDF hàng loạt', () => {
  it('batchExportPdfPath dựng đúng path; thiếu id → BatchError', () => {
    expect(batchExportPdfPath('b1')).toBe('/id-photo/batch/b1/export-pdf');
    expect(() => batchExportPdfPath('')).toThrow(BatchError);
  });

  it('parseExportPdfCounts đọc header BE khi có', () => {
    expect(
      parseExportPdfCounts({ 'x-exported-count': '7', 'x-skipped-count': '3' }, { success: 0, failed: 0 }),
    ).toEqual({ exported: 7, skipped: 3 });
  });

  it('parseExportPdfCounts fallback về counts FE khi thiếu header', () => {
    expect(parseExportPdfCounts({}, { success: 5, failed: 2 })).toEqual({ exported: 5, skipped: 2 });
  });

  it('parseExportPdfCounts đọc được từ đối tượng Headers (fetch)', () => {
    const h = new Headers({ 'x-exported-count': '4', 'x-skipped-count': '1' });
    expect(parseExportPdfCounts(h, { success: 0, failed: 0 })).toEqual({ exported: 4, skipped: 1 });
  });

  it('downloadBatchPdf: fetch OK → trả blob + counts từ header', async () => {
    const realFetch = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'x-exported-count': '3', 'x-skipped-count': '2' }),
      blob: async () => new Blob(['%PDF'], { type: 'application/pdf' }),
    })) as any;
    try {
      const r = await downloadBatchPdf('b1', { success: 0, failed: 0 });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/id-photo/batch/b1/export-pdf');
      expect((global.fetch as jest.Mock).mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(r.exported).toBe(3);
      expect(r.skipped).toBe(2);
      expect(r.blob.type).toBe('application/pdf');
    } finally {
      global.fetch = realFetch;
    }
  });

  it('downloadBatchPdf: BE trả lỗi JSON → BatchError kèm message của BE', async () => {
    const realFetch = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Chưa có ảnh thẻ nào thành công trong batch này để xuất PDF.' }),
    })) as any;
    try {
      await expect(downloadBatchPdf('b1', { success: 0, failed: 0 })).rejects.toThrow(/Chưa có ảnh thẻ nào/);
    } finally {
      global.fetch = realFetch;
    }
  });
});
