/**
 * Ai được KHAI BÁO kho: thêm thiết bị, thêm danh mục, thêm model, thêm vị trí lưu kho.
 *
 * Đây là bản sao của `CATALOG_WRITE_ROLES` bên BE (`mems-catalog.controller.ts`). Cửa canh thật
 * nằm ở `@Roles` phía BE; hàm này chỉ để KHÔNG hiện nút. Bấm vào rồi ăn 403 thì người dùng
 * tưởng hệ thống hỏng chứ không hiểu là mình không có quyền.
 *
 * Manager cố ý nằm ngoài: manager điều phối công việc hằng ngày — duyệt phiếu, kiểm tra máy trả
 * về — nhưng nhập một chiếc máy vào kho là chuyện tài sản, sai ở đây thì mọi phép đếm khả dụng
 * về sau lệch theo.
 */
const CATALOG_WRITE_ROLES = ['LEADER', 'ADMIN'];

export function canManageCatalog(roles: string[] | undefined | null): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => CATALOG_WRITE_ROLES.includes(role.toUpperCase()));
}
