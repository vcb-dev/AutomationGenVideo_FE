import { UpcomingReturnsAlerts, BorrowRequest } from './request-api';

/**
 * Kiểm tra tính hợp lệ của thời gian xin gia hạn.
 * Phải là ngày giờ hợp lệ và phải sau thời gian trả hiện tại.
 */
export function validateExtensionTime(
  currentToIso: string,
  newToIso: string,
): { valid: boolean; error?: string } {
  if (!newToIso) {
    return { valid: false, error: 'Vui lòng chọn thời gian trả mới.' };
  }

  const currentDate = new Date(currentToIso);
  const newDate = new Date(newToIso);

  if (isNaN(newDate.getTime())) {
    return { valid: false, error: 'Định dạng ngày giờ không hợp lệ.' };
  }

  if (newDate.getTime() <= currentDate.getTime()) {
    return {
      valid: false,
      error: 'Thời gian trả mới phải sau thời gian trả hiện tại.',
    };
  }

  return { valid: true };
}

/**
 * Tính và định dạng khoảng thời gian gia hạn thêm (VD: "Gia hạn thêm 4 giờ", "Gia hạn thêm 1 ngày 2 giờ").
 */
export function formatExtensionDuration(currentToIso: string, newToIso: string): string {
  const diffMs = new Date(newToIso).getTime() - new Date(currentToIso).getTime();
  if (diffMs <= 0) return '0 giờ';

  const diffHours = Math.round(diffMs / (3600 * 1000));
  if (diffHours < 24) {
    return `${diffHours} giờ`;
  }
  const days = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  if (remainingHours === 0) {
    return `${days} ngày`;
  }
  return `${days} ngày ${remainingHours} giờ`;
}

/**
 * Phân loại và tổng hợp trạng thái cảnh báo trả thiết bị cho banner.
 */
export function categorizeAlerts(alerts?: UpcomingReturnsAlerts | null): {
  hasCriticalAlerts: boolean;
  totalAlerts: number;
  summaryText: string;
} {
  if (!alerts) {
    return { hasCriticalAlerts: false, totalAlerts: 0, summaryText: 'Không có cảnh báo nào.' };
  }

  const overdueCount = alerts.overdue?.length || 0;
  const expiringCount = alerts.expiringSoon?.length || 0;
  const total = overdueCount + expiringCount;

  if (total === 0) {
    return { hasCriticalAlerts: false, totalAlerts: 0, summaryText: 'Không có thiết bị quá hạn.' };
  }

  if (overdueCount > 0) {
    return {
      hasCriticalAlerts: true,
      totalAlerts: total,
      summaryText: `Có ${overdueCount} phiếu mượn đã quá hạn trả!${
        expiringCount > 0 ? ` (và ${expiringCount} phiếu sắp hết hạn)` : ''
      }`,
    };
  }

  return {
    hasCriticalAlerts: false,
    totalAlerts: total,
    summaryText: `Có ${expiringCount} phiếu mượn sắp đến hạn trả trong 2 giờ tới.`,
  };
}

/**
 * Ánh xạ mức độ sự cố sang nhãn tiếng Việt và tone màu.
 */
export function getSeverityBadge(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): {
  label: string;
  tone: 'ok' | 'busy' | 'maint' | 'bad';
} {
  switch (severity) {
    case 'LOW':
      return { label: 'Thấp (Trầy xước/bụi)', tone: 'ok' };
    case 'MEDIUM':
      return { label: 'Vừa (Chập chờn/lỗi nhẹ)', tone: 'maint' };
    case 'HIGH':
      return { label: 'Nặng (Rơi vỡ/hư hỏng)', tone: 'bad' };
    case 'CRITICAL':
      return { label: 'Khẩn cấp (Cháy nổ/mất máy)', tone: 'bad' };
    default:
      return { label: 'Chưa rõ', tone: 'busy' };
  }
}

/**
 * Kiểm tra xem phiếu có đang trong trạng thái chờ duyệt gia hạn hay không.
 */
export function isExtensionPending(request?: BorrowRequest | null): boolean {
  return request?.extension?.status === 'PENDING';
}
