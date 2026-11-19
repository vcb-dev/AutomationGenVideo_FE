/**
 * Chức năng: Tạo ảnh sản phẩm — quyền truy cập. Người dùng chốt 2026-09-29: MỌI vai trò đều dùng
 * được, nên mã quyền của trang phải nằm trong bộ mặc định của từng vai trò; admin vẫn tắt được
 * cho từng tài khoản qua cây quyền.
 */
import { getRequiredPermissionForPath } from '@/config/permission-routes';
import { getAllLeafPermissions, getDefaultPermissionsForRole } from '@/config/permission-tree';
import { canAccessRoute } from '@/lib/permissions';
import { User, UserRole } from '@/types/auth';

const ROUTE = '/dashboard/tien-ich/product-image';
const PERMISSION = 'tools:product_image:use';

function makeUser(roles: UserRole[], permissions: string[]): User {
  return {
    id: 'u1',
    email: 'nguoi.dung@vcbi.vn',
    full_name: 'Người dùng',
    roles,
    permissions,
    is_active: true,
    total_login_count: 1,
    total_action_count: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

describe('Quyền vào trang Tạo ảnh sản phẩm', () => {
  it('trang gắn đúng mã quyền và mã đó có trong cây quyền', () => {
    expect(getRequiredPermissionForPath(ROUTE)).toBe(PERMISSION);
    expect(getAllLeafPermissions()).toContain(PERMISSION);
  });

  it.each(['ADMIN', 'MANAGER', 'LEADER', 'MEMBER', 'EDITOR'])('vai trò %s có quyền mặc định', (role) => {
    expect(getDefaultPermissionsForRole(role)).toContain(PERMISSION);
  });

  it('MEMBER với bộ quyền mặc định vào được trang', () => {
    const member = makeUser([UserRole.MEMBER], getDefaultPermissionsForRole('MEMBER'));
    expect(canAccessRoute(member, ROUTE)).toBe(true);
  });

  it('tài khoản bị admin bỏ tick quyền này thì không vào được', () => {
    const permissions = getDefaultPermissionsForRole('MEMBER').filter((p) => p !== PERMISSION);
    expect(canAccessRoute(makeUser([UserRole.MEMBER], permissions), ROUTE)).toBe(false);
  });
});
