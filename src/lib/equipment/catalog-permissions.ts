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
 *
 * Danh sách này TỪNG lệch: FE nhận thêm 'team media', 'media team', 'bộ phận media' trong khi BE
 * chỉ nhận 'media'. Hệ quả là leader của team đặt tên theo ba biến thể đó nhìn thấy nhóm Duyệt và
 * bàn giao trên thanh điều hướng, bấm vào thì ăn 403 — đúng cái mà chú thích ngay trên cảnh báo.
 * Đã siết về khớp BE. BE mới là nơi quyết định quyền, nên siết ở đây không lấy mất quyền của ai.
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

/**
 * Chỉ cho phép ADMIN xóa Danh mục và Model thiết bị
 */
export function canDeleteCatalog(roles: string[] | undefined | null): boolean {
  if (!roles?.length) return false;
  return roles.map((r) => r.toUpperCase()).includes('ADMIN');
}
