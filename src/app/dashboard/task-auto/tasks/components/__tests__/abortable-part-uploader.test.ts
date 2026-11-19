import { abortablePartUploader } from '../TaskSubmitModal';
import type { PartUploader } from '@/lib/storage/chunked-upload';

const cancelled = () => new Error('Đã huỷ upload');

function direct(over: Partial<PartUploader> = {}): PartUploader {
  return {
    sendPart: jest.fn(async () => undefined),
    progress: jest.fn(async () => ({ parts: [1, 2], completed: false })),
    ...over,
  };
}

describe('abortablePartUploader', () => {
  it('chuyển tiếp progress() của uploader gốc (kiểu PartUploader mới — không còn uploadedParts)', async () => {
    const d = direct();
    const u = abortablePartUploader(d, new AbortController().signal, cancelled);
    await expect(u.progress()).resolves.toEqual({ parts: [1, 2], completed: false });
    expect(d.progress).toHaveBeenCalledTimes(1);
    expect('uploadedParts' in u).toBe(false);
  });

  it('gửi khúc bình thường khi chưa huỷ', async () => {
    const d = direct();
    const blob = new Blob(['x']);
    await abortablePartUploader(d, new AbortController().signal, cancelled).sendPart(3, blob);
    expect(d.sendPart).toHaveBeenCalledWith(3, blob);
  });

  it('đã huỷ → không gửi khúc, ném lỗi huỷ', async () => {
    const d = direct();
    const ac = new AbortController();
    ac.abort();
    await expect(abortablePartUploader(d, ac.signal, cancelled).sendPart(1, new Blob(['x']))).rejects.toThrow('Đã huỷ upload');
    expect(d.sendPart).not.toHaveBeenCalled();
  });

  it('huỷ giữa chừng khi khúc đang gửi lỗi → báo lỗi huỷ thay vì lỗi mạng', async () => {
    const ac = new AbortController();
    const d = direct({ sendPart: jest.fn(async () => { ac.abort(); throw new Error('network'); }) });
    await expect(abortablePartUploader(d, ac.signal, cancelled).sendPart(1, new Blob(['x']))).rejects.toThrow('Đã huỷ upload');
  });

  it('lỗi gửi khúc khi chưa huỷ → giữ nguyên lỗi gốc', async () => {
    const d = direct({ sendPart: jest.fn(async () => { throw new Error('network'); }) });
    await expect(abortablePartUploader(d, new AbortController().signal, cancelled).sendPart(1, new Blob(['x']))).rejects.toThrow('network');
  });
});
