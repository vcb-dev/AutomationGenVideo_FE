import { BorrowRequest, IncidentKind, UpcomingReturnsAlerts } from './request-api';

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
 * Kiểm tra xem phiếu có đang trong trạng thái chờ duyệt gia hạn hay không.
 */
export function isExtensionPending(request?: BorrowRequest | null): boolean {
  return request?.extension?.status === 'PENDING';
}

export type ReportableIncidentKind = Exclude<IncidentKind, 'OVERDUE'>;

/** Loại sự cố người mượn tự báo được; trả trễ do hệ thống ghi. */
export const REPORTABLE_INCIDENT_KINDS: ReportableIncidentKind[] = ['CONDITION_WORSENED', 'MISSING_ACCESSORY'];

export const INCIDENT_KIND_LABEL: Record<IncidentKind, string> = {
  CONDITION_WORSENED: 'Hỏng / tình trạng tệ đi',
  MISSING_ACCESSORY: 'Mất / thiếu phụ kiện',
  OVERDUE: 'Trả trễ hạn',
};

/** Nhãn tiếng Việt của loại sự cố; loại lạ thì trả nguyên mã. */
export function incidentKindLabel(kind: string): string {
  return INCIDENT_KIND_LABEL[kind as IncidentKind] ?? kind;
}

/** Đổi số phút ra chữ ngắn gọn: "45 phút", "3 giờ", "2 ngày 4 giờ". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} phút`;
  const hours = Math.floor(m / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days} ngày` : `${days} ngày ${rest} giờ`;
}

/** Máy đã ghim vào phiếu, để người mượn chọn máy gặp sự cố. */
export function handedOverAssets(request?: BorrowRequest | null): Array<{ id: string; label: string }> {
  if (!request) return [];
  return request.lines.flatMap((line) =>
    (line.reservations ?? []).flatMap((r) =>
      r.asset ? [{ id: r.asset.id, label: `${line.model.name} · ${r.asset.asset_code}` }] : [],
    ),
  );
}
