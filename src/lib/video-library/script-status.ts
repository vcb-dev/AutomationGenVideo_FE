import { UserRole } from '@/types/auth';

/** Kịch bản từ voice: trạng thái kịch bản chạy nền sau khi duyệt đề xuất. */
export type ScriptStatus = 'PROCESSING' | 'DONE' | 'FAILED';

/** Dòng content cũ (trước khi có kịch bản chạy nền) không có script_status → coi là DONE. */
export function scriptStatusOf(item: { script_status?: ScriptStatus | null }): ScriptStatus {
  return item.script_status ?? 'DONE';
}

/** Còn content đang tạo kịch bản → tab Content tự làm mới cho tới khi xong. */
export function hasProcessingScript(items: { script_status?: ScriptStatus | null }[]): boolean {
  return items.some((c) => c.script_status === 'PROCESSING');
}

/** Leader/manager/admin được Thử lại / Tạo lại kịch bản (khớp @Roles của POST approved-content/:id/regenerate ở BE). */
export function canRetryScript(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((r) => [UserRole.ADMIN, UserRole.LEADER, UserRole.MANAGER].includes(r as UserRole));
}
