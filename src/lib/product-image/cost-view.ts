import { UserRole } from '@/types/auth';

/**
 * Tab Chi phí của trang Tạo ảnh sản phẩm: quyền xem, chọn tab theo `?tab=`, định dạng tiền.
 * Kiểu dữ liệu khớp GET /product-image/costs (product-image-cost.util.ts#buildCostStats ở BE).
 */

export interface Money {
  cost_usd: number;
  cost_vnd: number;
}

export interface ProductImageCostStats {
  range: { date_from: string | null; date_to: string | null };
  pricing: { usd_vnd_rate: number; note: string };
  totals: Money & {
    attempts: number;
    success: number;
    failed: number;
    approved: number;
    unpriced: number;
    input_tokens: number;
    output_tokens: number;
    cutouts: number;
    cutout_failed: number;
    per_attempt: Money | null;
    per_approved: (Money & { attempts: number | null }) | null;
  };
  by_day: (Money & { date: string; attempts: number; approved: number })[];
  by_product: (Money & {
    product_name: string;
    attempts: number;
    success: number;
    approved: number;
    per_approved: (Money & { attempts: number | null }) | null;
  })[];
  by_user: (Money & { user_id: string; name: string; attempts: number; approved: number; cutouts: number })[];
  unpriced_notes: { note: string; count: number }[];
  recent: {
    id: string;
    created_at: string;
    mode: 'CUTOUT' | 'HELD_PRODUCT' | string;
    status: 'SUCCESS' | 'FAILED' | string;
    product_name: string | null;
    user_name: string;
    model: string | null;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number | null;
    cost_vnd: number | null;
    cost_note: string | null;
    approved: boolean;
    error_message: string | null;
  }[];
}

/** Khớp @Roles(ADMIN, MANAGER) của GET /product-image/costs — chỉ để ẩn tab, BE mới là chốt chặn. */
export function canViewProductImageCosts(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((r) => r === UserRole.ADMIN || r === UserRole.MANAGER);
}

export type ProductImageTab = 'background' | 'held' | 'costs';

/** `?tab=held|costs` → tab; lạ/thiếu → tab mặc định. Không có quyền xem chi phí thì không mở tab đó. */
export function productImageTabFromParam(param: string | null | undefined, canViewCosts: boolean): ProductImageTab {
  if (param === 'held') return 'held';
  if (param === 'costs' && canViewCosts) return 'costs';
  return 'background';
}

/** Query cho từng tab — tab mặc định không cần query, để link gọn. */
export function productImageTabQuery(tab: ProductImageTab): string {
  return tab === 'background' ? '' : `?tab=${tab}`;
}

/** 1234.6 → "1.235đ" (làm tròn, phân tách hàng nghìn kiểu Việt Nam). */
export function formatVnd(value: number | null | undefined): string {
  return `${Math.round(value ?? 0).toLocaleString('vi-VN')}đ`;
}

/** Một lượt Gemini chỉ vài xu → dưới 1 USD giữ 4 số lẻ. */
export function formatUsd(value: number | null | undefined): string {
  const v = value ?? 0;
  return `$${v.toFixed(v > 0 && v < 1 ? 4 : 2)}`;
}

export function formatCount(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('vi-VN');
}

/** 2.33 → "2,33"; null (chưa có ảnh đạt) → "—". */
export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

/** Tiền một lượt: chưa tính được (thiếu đơn giá, hết giờ chờ...) thì nói thẳng, không ghi 0đ. */
export function formatGenerationCost(costVnd: number | null | undefined): string {
  return costVnd === null || costVnd === undefined ? 'Chưa tính được' : formatVnd(costVnd);
}

export interface SessionResultCost {
  cost: { vnd: number | null };
  approved: boolean;
}

/** Tóm tắt các lượt trong phiên đang mở (tab Chị Nhạm): tổng tiền đã biết, số lượt chưa biết tiền, số ảnh đạt. */
export function summarizeSession(results: readonly SessionResultCost[]) {
  let knownVnd = 0;
  let unknown = 0;
  let approved = 0;
  for (const result of results) {
    if (result.cost.vnd === null) unknown += 1;
    else knownVnd += result.cost.vnd;
    if (result.approved) approved += 1;
  }
  return { count: results.length, knownVnd, unknown, approved };
}
