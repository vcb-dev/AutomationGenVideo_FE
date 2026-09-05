/**
 * Ai được KHAI BÁO & QUẢN LÝ kho thiết bị: thêm thiết bị, sửa, xóa, duyệt phiếu, bàn giao, nhận trả...
 *
 * Quy định: Chỉ dành cho:
 * 1. ADMIN (toàn quyền hệ thống).
 * 2. LEADER hoặc MANAGER thuộc Team MEDIA (user.team có chứa 'MEDIA').
 */

/**
 * Phải KHỚP TỪNG PHẦN TỬ với `MEDIA_TEAM_NAMES` trong `src/common/mems/media-team.ts` bên BE.
 * Lệch nhau thì hoặc hiện nút rồi bấm vào ăn 403, hoặc ẩn nút của người thật sự có quyền.
 */
const MEDIA_TEAM_NAMES = ['media'];

/**
 * So khớp CHÍNH XÁC tên team, không dùng "có chứa": tên team do người dùng đặt được, nên đặt là
 * "Social Media" hay "Multimedia" là leo thẳng lên quyền quản lý kho.
 */
export function isMediaTeam(team?: string | null): boolean {
  if (!team) return false;
  return team.split(',').some((t) => MEDIA_TEAM_NAMES.includes(t.trim().toLowerCase()));
}

export function canManageCatalog(
  roles: string[] | undefined | null,
  team?: string | null,
): boolean {
  if (!roles?.length) return false;
  const upperRoles = roles.map((r) => r.toUpperCase());
  if (upperRoles.includes('ADMIN')) return true;

  const isLeaderOrManager = upperRoles.includes('LEADER') || upperRoles.includes('MANAGER');
  if (isLeaderOrManager && isMediaTeam(team)) {
    return true;
  }

  return false;
}
