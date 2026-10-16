/**
 * Chức năng: tab Chi phí TikHub/Gemini — chỉ ADMIN/MANAGER xem được, số tiền hiển thị đúng định dạng.
 */
import { UserRole } from '@/types/auth';
import { canViewCosts, formatCount, formatUsd, formatVnd, shortEndpoint } from '../cost-format';

describe('canViewCosts', () => {
  it('ADMIN, MANAGER thấy tab Chi phí', () => {
    expect(canViewCosts([UserRole.ADMIN])).toBe(true);
    expect(canViewCosts([UserRole.MANAGER])).toBe(true);
  });

  it('LEADER, MEMBER, chưa đăng nhập → không thấy (BE trả 403)', () => {
    expect(canViewCosts([UserRole.LEADER])).toBe(false);
    expect(canViewCosts([UserRole.MEMBER])).toBe(false);
    expect(canViewCosts(null)).toBe(false);
  });
});

describe('formatVnd', () => {
  it('làm tròn và phân tách hàng nghìn kiểu Việt Nam', () => {
    expect(formatVnd(1234.6)).toBe('1.235đ');
    expect(formatVnd(26)).toBe('26đ');
  });

  it('thiếu số liệu → 0đ', () => {
    expect(formatVnd(null)).toBe('0đ');
    expect(formatVnd(undefined)).toBe('0đ');
  });
});

describe('formatUsd', () => {
  it('dưới 1 USD giữ 4 số lẻ để thấy được giá một lượt TikHub', () => {
    expect(formatUsd(0.001)).toBe('$0.0010');
    expect(formatUsd(0.002839)).toBe('$0.0028');
  });

  it('từ 1 USD hoặc bằng 0 → 2 số lẻ', () => {
    expect(formatUsd(12.345)).toBe('$12.35');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(undefined)).toBe('$0.00');
  });
});

describe('formatCount / shortEndpoint', () => {
  it('số lượt phân tách hàng nghìn', () => {
    expect(formatCount(12345)).toBe('12.345');
    expect(formatCount(null)).toBe('0');
  });

  it('bỏ tiền tố /api/v1/ cho gọn bảng endpoint TikHub', () => {
    expect(shortEndpoint('/api/v1/tiktok/app/v3/fetch_one_video')).toBe('tiktok/app/v3/fetch_one_video');
    expect(shortEndpoint('tikhub/user/get_user_info')).toBe('tikhub/user/get_user_info');
  });
});
