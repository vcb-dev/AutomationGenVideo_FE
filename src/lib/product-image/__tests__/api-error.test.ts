/**
 * Chức năng: Tạo ảnh sản phẩm — hiện đúng lý do lỗi BE/AI trả về (vd lời Gemini, tên biến cấu
 * hình cần sửa) thay vì một câu chung chung.
 */
import { apiErrorMessage, isCanceledRequest } from '../api-error';

describe('apiErrorMessage', () => {
  it('lấy nguyên message của BE', () => {
    const err = { response: { data: { message: 'GEMINI_MODEL=abc không dùng được' } } };
    expect(apiErrorMessage(err, 'fallback')).toBe('GEMINI_MODEL=abc không dùng được');
  });

  it('gộp message dạng mảng (lỗi validate)', () => {
    const err = { response: { data: { message: ['note must be shorter', 'x'] } } };
    expect(apiErrorMessage(err, 'fallback')).toBe('note must be shorter; x');
  });

  it('quá thời gian chờ', () => {
    expect(apiErrorMessage({ code: 'ECONNABORTED' }, 'fallback')).toContain('quá lâu');
  });

  it('mất kết nối (không có response)', () => {
    expect(apiErrorMessage({ message: 'Network Error' }, 'fallback')).toContain('Không kết nối được');
  });

  it('có response nhưng không có message thì dùng câu dự phòng', () => {
    expect(apiErrorMessage({ response: { data: {} } }, 'Tách nền thất bại')).toBe('Tách nền thất bại');
  });
});

describe('isCanceledRequest', () => {
  it('nhận ra request bị huỷ bằng AbortController', () => {
    expect(isCanceledRequest({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isCanceledRequest({ name: 'CanceledError' })).toBe(true);
    expect(isCanceledRequest({ code: 'ECONNABORTED' })).toBe(false);
  });
});
