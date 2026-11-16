import { borrowLogLoadError, viewForQuickFilter } from '../borrow-log-view';

/**
 * Bấm lọc nhanh từ bảng thiết bị: phải về bảng phiếu VÀ xoá bộ lọc trạng thái.
 * Lỗi từng gặp: chọn "Đang mượn" (HOLDING) ở bảng thiết bị rồi bấm "Tất cả" → bảng phiếu trống
 * vì lọc theo HOLDING, một trạng thái phiếu không có.
 */
describe('viewForQuickFilter', () => {
  it('từ bảng thiết bị: về bảng phiếu và xoá bộ lọc trạng thái', () => {
    expect(viewForQuickFilter('ASSET')).toEqual({ viewMode: 'REQUEST', resetStatus: true });
  });

  it('đang ở bảng phiếu: giữ nguyên bộ lọc trạng thái người dùng đã chọn', () => {
    expect(viewForQuickFilter('REQUEST')).toEqual({ viewMode: 'REQUEST', resetStatus: false });
  });
});

describe('borrowLogLoadError', () => {
  const fallback = 'Không đọc được danh sách phiếu mượn.';
  const http = (status: number) => ({ config: {}, response: { status, data: {} } });

  it('403 với quản lý kho: nhắc mục dành cho ai', () => {
    expect(borrowLogLoadError(http(403), { isManager: true, fallback })).toBe(
      'Mục này chỉ dành cho quản trị viên và Leader Media.',
    );
  });

  it('403 với thành viên thường: KHÔNG nói "chỉ dành cho Leader Media"', () => {
    const msg = borrowLogLoadError(http(403), { isManager: false, fallback });
    expect(msg).not.toContain('Leader Media');
    expect(msg).toContain('không có quyền');
  });

  it('mất kết nối máy chủ: nói đúng là không kết nối được', () => {
    expect(borrowLogLoadError({ config: {} }, { isManager: false, fallback })).toContain(
      'Không kết nối được máy chủ',
    );
  });

  it('lỗi 500: dùng câu chung, không lộ thông điệp nội bộ', () => {
    const err = { config: {}, response: { status: 500, data: { message: 'Internal server error' } } };
    expect(borrowLogLoadError(err, { isManager: true, fallback })).toBe(fallback);
  });
});
