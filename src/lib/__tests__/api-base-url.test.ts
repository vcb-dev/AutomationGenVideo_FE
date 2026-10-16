/**
 * Chức năng: địa chỉ API lấy từ NEXT_PUBLIC_API_URL (bắt buộc, không có localhost mặc định trong code).
 */
import { apiBaseUrl } from '../api-base-url';

describe('apiBaseUrl', () => {
  const original = process.env.NEXT_PUBLIC_API_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = original;
  });

  it('dùng đúng giá trị cấu hình, bỏ khoảng trắng và dấu / cuối', () => {
    process.env.NEXT_PUBLIC_API_URL = ' https://be.example.com/api/ ';
    expect(apiBaseUrl()).toBe('https://be.example.com/api');
  });

  it('production đặt đường dẫn tương đối /api (rewrite cùng origin) → giữ nguyên', () => {
    process.env.NEXT_PUBLIC_API_URL = '/api';
    expect(apiBaseUrl()).toBe('/api');
  });

  it('thiếu hoặc rỗng → báo lỗi nêu tên biến, không tự gọi localhost', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(() => apiBaseUrl()).toThrow('Thiếu NEXT_PUBLIC_API_URL');
    process.env.NEXT_PUBLIC_API_URL = '   ';
    expect(() => apiBaseUrl()).toThrow('Thiếu NEXT_PUBLIC_API_URL');
  });
});
