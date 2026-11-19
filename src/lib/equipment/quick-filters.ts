import { HOLDING_STATUSES } from './request-status';
import type { BorrowRequest } from './request-api';

export type EquipmentQuickFilter =
  | 'ALL'
  | 'HAS_INCIDENT'
  | 'PENDING_EXTENSION'
  | 'OVERDUE'
  | 'EXPIRING_SOON';

export interface QuickFilterCounts {
  all: number;
  hasIncident: number;
  pendingExtension: number;
  overdue: number;
  expiringSoon: number;
}

/**
 * Kiểm tra xem phiếu có đang trong tình trạng quá hạn trả hay không.
 */
export function isRequestOverdue(
  toTime: string | Date,
  status: string,
  now: Date = new Date(),
): boolean {
  if (!HOLDING_STATUSES.includes(status)) return false;
  const to = new Date(toTime).getTime();
  return !Number.isNaN(to) && to < now.getTime();
}

/**
 * Kiểm tra xem phiếu có sắp hết hạn trong vòng 2 giờ hay không.
 */
export function isRequestExpiringSoon(
  toTime: string | Date,
  status: string,
  now: Date = new Date(),
  windowMs: number = 2 * 3600 * 1000,
): boolean {
  if (!HOLDING_STATUSES.includes(status)) return false;
  const to = new Date(toTime).getTime();
  if (Number.isNaN(to)) return false;
  const diff = to - now.getTime();
  return diff >= 0 && diff <= windowMs;
}

/**
 * Tính toán số lượng phiếu cho từng nhóm bộ lọc nhanh 1 chạm.
 */
export function computeQuickFilterCounts(
  requests: BorrowRequest[],
  now: Date = new Date(),
): QuickFilterCounts {
  let hasIncident = 0;
  let pendingExtension = 0;
  let overdue = 0;
  let expiringSoon = 0;

  for (const r of requests) {
    if (r.incidents && r.incidents.length > 0) {
      hasIncident++;
    }
    if (r.extension?.status === 'PENDING') {
      pendingExtension++;
    }
    if (isRequestOverdue(r.to_time, r.status, now)) {
      overdue++;
    } else if (isRequestExpiringSoon(r.to_time, r.status, now)) {
      expiringSoon++;
    }
  }

  return {
    all: requests.length,
    hasIncident,
    pendingExtension,
    overdue,
    expiringSoon,
  };
}

/**
 * Lọc danh sách phiếu theo bộ lọc nhanh đã chọn.
 */
export function filterRequestsByQuickFilter(
  requests: BorrowRequest[],
  quickFilter: EquipmentQuickFilter,
  now: Date = new Date(),
): BorrowRequest[] {
  switch (quickFilter) {
    case 'HAS_INCIDENT':
      return requests.filter((r) => Array.isArray(r.incidents) && r.incidents.length > 0);
    case 'PENDING_EXTENSION':
      return requests.filter((r) => r.extension?.status === 'PENDING');
    case 'OVERDUE':
      return requests.filter((r) => isRequestOverdue(r.to_time, r.status, now));
    case 'EXPIRING_SOON':
      return requests.filter((r) => isRequestExpiringSoon(r.to_time, r.status, now));
    case 'ALL':
    default:
      return requests;
  }
}

export interface QuickFilterOption {
  key: EquipmentQuickFilter;
  label: string;
  icon: string;
  badgeCount: (counts: QuickFilterCounts) => number;
  badgeStyle: string;
  activeClass: string;
}

export const QUICK_FILTER_OPTIONS: QuickFilterOption[] = [
  {
    key: 'ALL',
    label: 'Tất cả',
    icon: '📋',
    badgeCount: (c) => c.all,
    badgeStyle: 'bg-slate-200 text-slate-700 dark:bg-white/[0.1] dark:text-slate-300',
    activeClass: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 shadow-2xs font-semibold',
  },
  {
    key: 'HAS_INCIDENT',
    label: 'Có sự cố',
    icon: '⚠️',
    badgeCount: (c) => c.hasIncident,
    badgeStyle: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    activeClass: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40 shadow-2xs font-semibold',
  },
  {
    key: 'PENDING_EXTENSION',
    label: 'Chờ duyệt gia hạn',
    icon: '⏳',
    badgeCount: (c) => c.pendingExtension,
    badgeStyle: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    activeClass: 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 shadow-2xs font-semibold',
  },
  {
    key: 'OVERDUE',
    label: 'Quá hạn',
    icon: '🚨',
    badgeCount: (c) => c.overdue,
    badgeStyle: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
    activeClass: 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 shadow-2xs font-semibold',
  },
  {
    key: 'EXPIRING_SOON',
    label: 'Sắp hết hạn (<2h)',
    icon: '⚡',
    badgeCount: (c) => c.expiringSoon,
    badgeStyle: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
    activeClass: 'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/40 shadow-2xs font-semibold',
  },
];
