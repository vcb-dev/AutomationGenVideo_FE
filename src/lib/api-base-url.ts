/**
 * Địa chỉ API NestJS (`…/api`) cho code chạy trên trình duyệt — lấy từ NEXT_PUBLIC_API_URL, BẮT BUỘC.
 *
 * Không có giá trị mặc định trong code: thiếu biến thì báo lỗi nêu tên biến thay vì âm thầm gọi
 * `localhost:3000` (production đặt `/api` để đi qua rewrite cùng origin của Vercel).
 * Gọi trong hàm (không đọc ở cấp module) để lỗi cấu hình hiện ở đúng thao tác, không làm trắng trang.
 */
export const API_URL_ENV = 'NEXT_PUBLIC_API_URL';

export function apiBaseUrl(): string {
  // Phải viết nguyên văn process.env.NEXT_PUBLIC_API_URL để Next nhúng giá trị lúc build.
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw || !raw.trim()) {
    throw new Error(`Thiếu ${API_URL_ENV} trong .env của FE (địa chỉ API, vd /api hoặc http://localhost:3000/api).`);
  }
  // Bỏ dấu / cuối để nơi gọi luôn ghép được `${apiBaseUrl()}/...` mà không sinh dấu // đôi.
  return raw.trim().replace(/\/$/, '');
}
