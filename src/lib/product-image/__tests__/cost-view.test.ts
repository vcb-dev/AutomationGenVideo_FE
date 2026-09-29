/**
 * Chức năng: Tạo ảnh sản phẩm — tab Chi phí và chi phí từng lượt: chỉ ADMIN/MANAGER thấy tab,
 * `?tab=` mở đúng tab (không mở được tab Chi phí khi không có quyền), định dạng tiền, lượt chưa
 * tính được tiền hiện chữ "Chưa tính được" thay vì 0đ, và tóm tắt các lượt trong phiên.
 */
import { UserRole } from '@/types/auth';
import {
  canViewProductImageCosts,
  formatGenerationCost,
  formatRatio,
  formatUsd,
  formatVnd,
  productImageTabFromParam,
  productImageTabQuery,
  summarizeSession,
} from '../cost-view';

describe('canViewProductImageCosts', () => {
  it.each([[UserRole.ADMIN], [UserRole.MANAGER]])('%s xem được tab Chi phí', (role) => {
    expect(canViewProductImageCosts([role])).toBe(true);
  });

  it.each([[[UserRole.LEADER]], [[UserRole.MEMBER]], [[]], [undefined]])('%p không xem được', (roles) => {
    expect(canViewProductImageCosts(roles as string[] | undefined)).toBe(false);
  });
});

describe('productImageTabFromParam / productImageTabQuery', () => {
  it('mở đúng tab theo ?tab=', () => {
    expect(productImageTabFromParam('held', false)).toBe('held');
    expect(productImageTabFromParam('costs', true)).toBe('costs');
  });

  it('không có quyền thì ?tab=costs rơi về tab mặc định', () => {
    expect(productImageTabFromParam('costs', false)).toBe('background');
  });

  it('thiếu hoặc lạ → tab mặc định', () => {
    expect(productImageTabFromParam(null, true)).toBe('background');
    expect(productImageTabFromParam('khong-co', true)).toBe('background');
  });

  it('tab mặc định không cần query', () => {
    expect(productImageTabQuery('background')).toBe('');
    expect(productImageTabQuery('costs')).toBe('?tab=costs');
  });
});

describe('định dạng', () => {
  it('tiền VNĐ và USD', () => {
    expect(formatVnd(1773.2)).toBe('1.773đ');
    expect(formatVnd(null)).toBe('0đ');
    expect(formatUsd(0.0682)).toBe('$0.0682');
    expect(formatUsd(12.5)).toBe('$12.50');
  });

  it('tỉ số lượt / ảnh đạt; chưa có ảnh đạt thì gạch ngang', () => {
    expect(formatRatio(2.33)).toBe('2,33');
    expect(formatRatio(3)).toBe('3');
    expect(formatRatio(null)).toBe('—');
  });

  it('lượt chưa tính được tiền không bị hiện thành 0đ', () => {
    expect(formatGenerationCost(null)).toBe('Chưa tính được');
    expect(formatGenerationCost(0)).toBe('0đ');
    expect(formatGenerationCost(1773)).toBe('1.773đ');
  });
});

describe('summarizeSession', () => {
  it('cộng tiền đã biết, đếm lượt chưa biết tiền và ảnh đạt', () => {
    expect(
      summarizeSession([
        { cost: { vnd: 1773 }, approved: true },
        { cost: { vnd: 1773 }, approved: false },
        { cost: { vnd: null }, approved: false },
      ]),
    ).toEqual({ count: 3, knownVnd: 3546, unknown: 1, approved: 1 });
  });
});
