import { canManageCatalog } from '../catalog-permissions';

/**
 * Khai báo kho — thêm thiết bị, thêm danh mục, thêm vị trí — chỉ leader và admin.
 *
 * Kiểm ở FE là để KHÔNG hiện nút, không phải để canh cửa: cửa nằm ở `@Roles` phía BE. Hiện một
 * cái nút bấm vào là 403 thì người dùng tưởng hệ thống hỏng chứ không hiểu là mình không có quyền.
 */
describe('canManageCatalog', () => {
  it('leader khai báo được', () => {
    expect(canManageCatalog(['LEADER'])).toBe(true);
  });

  it('admin khai báo được', () => {
    expect(canManageCatalog(['ADMIN'])).toBe(true);
  });

  it('manager KHÔNG khai báo được', () => {
    // Manager điều phối công việc hằng ngày, nhưng nhập máy vào kho là chuyện tài sản.
    expect(canManageCatalog(['MANAGER'])).toBe(false);
  });

  it('member không khai báo được', () => {
    expect(canManageCatalog(['MEMBER'])).toBe(false);
  });

  it('vừa manager vừa leader thì vẫn được', () => {
    // Vai trò cộng dồn chứ không loại trừ nhau — chặn theo vai trò THIẾU thì người này oan.
    expect(canManageCatalog(['MANAGER', 'LEADER'])).toBe(true);
  });

  it('chưa nạp xong hồ sơ thì coi như không có quyền', () => {
    // Lúc trang vừa mở, store còn rỗng. Mặc định là ẩn nút: hiện rồi ẩn đi trông như lỗi,
    // còn ẩn rồi hiện ra thì không ai để ý.
    expect(canManageCatalog([])).toBe(false);
    expect(canManageCatalog(undefined)).toBe(false);
  });

  it('không phân biệt hoa thường', () => {
    // Một vài chỗ trong hệ thống trả role viết thường; chặn oan leader vì cái đó thì vô lý.
    expect(canManageCatalog(['leader'])).toBe(true);
  });
});
