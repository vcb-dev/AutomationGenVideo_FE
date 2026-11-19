import { UserRole } from '@/types/auth';

/** Tab Chi phí (TikHub + Gemini của menu Khám phá Video): quyền xem và định dạng số tiền. */

/** Chỉ ADMIN/MANAGER thấy tab Chi phí (khớp @Roles(ADMIN, MANAGER) của GET video-library/costs ở BE). */
export function canViewCosts(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((r) => [UserRole.ADMIN, UserRole.MANAGER].includes(r as UserRole));
}

/** 1234.6 → "1.235đ" (làm tròn, phân tách hàng nghìn kiểu Việt Nam). */
export function formatVnd(n: number | null | undefined): string {
  return `${Math.round(n ?? 0).toLocaleString('vi-VN')}đ`;
}

/** Dưới 1 USD giữ 4 số lẻ (một lượt TikHub chỉ 0,001 USD), còn lại 2 số lẻ. */
export function formatUsd(n: number | null | undefined): string {
  const v = n ?? 0;
  return `$${v.toFixed(v > 0 && v < 1 ? 4 : 2)}`;
}

export function formatCount(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('vi-VN');
}

/** "/api/v1/tiktok/app/v3/fetch_one_video" → "tiktok/app/v3/fetch_one_video". */
export function shortEndpoint(endpoint: string): string {
  return endpoint.replace('/api/v1/', '');
}
