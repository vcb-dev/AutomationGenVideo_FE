import { canManageCatalog, canDeleteCatalog } from '../catalog-permissions';

/**
 * Khai báo & quản lý kho — chỉ leader/manager thuộc Team Media và Admin.
 */
describe('canManageCatalog', () => {
  it('leader Team Media khai báo và quản lý được', () => {
    expect(canManageCatalog(['LEADER'], 'MEDIA')).toBe(true);
    expect(canManageCatalog(['LEADER'], 'MEDIA,Scale Data')).toBe(true);
  });

  it('leader team khác KHÔNG quản lý kho được', () => {
    expect(canManageCatalog(['LEADER'], 'Team K1')).toBe(false);
    expect(canManageCatalog(['LEADER'], 'Team ADS')).toBe(false);
    expect(canManageCatalog(['LEADER'], null)).toBe(false);
  });

  it('admin luôn quản lý được bất kể team', () => {
    expect(canManageCatalog(['ADMIN'])).toBe(true);
    expect(canManageCatalog(['ADMIN'], null)).toBe(true);
    expect(canManageCatalog(['ADMIN'], 'Team K2')).toBe(true);
  });

  it('manager Team Media quản lý được', () => {
    expect(canManageCatalog(['MANAGER'], 'MEDIA')).toBe(true);
  });

  it('manager team khác KHÔNG quản lý được', () => {
    expect(canManageCatalog(['MANAGER'], 'Team K2')).toBe(false);
  });

  it('member Team Media không được quản lý', () => {
    expect(canManageCatalog(['MEMBER'], 'MEDIA')).toBe(false);
  });

  it('chưa nạp xong hồ sơ thì coi như không có quyền', () => {
    expect(canManageCatalog([])).toBe(false);
    expect(canManageCatalog(undefined)).toBe(false);
  });

  it('leader mà thiếu thông tin team thì coi như không có quyền', () => {
    // Mặc định phải là ĐÓNG. Bản BE từng coi "không biết team" là Media và cửa canh thành hình
    // thức mà không ai nhận ra. Hai bên nay cùng một quy ước.
    expect(canManageCatalog(['LEADER'], undefined)).toBe(false);
    expect(canManageCatalog(['LEADER'], null)).toBe(false);
    expect(canManageCatalog(['LEADER'], '')).toBe(false);
  });

  it('không phân biệt hoa thường với role và team', () => {
    expect(canManageCatalog(['leader'], 'media')).toBe(true);
  });
});

/**
 * Hàm này là bản sao của `isMediaTeam` bên BE (`src/common/mems/media-team.ts`) — hai bên phải
 * cho cùng kết quả, nếu không thì giao diện hiện nút mà bấm vào ăn 403, hoặc ẩn nút của người
 * thật sự có quyền.
 */
describe('canManageCatalog — khớp CHÍNH XÁC tên team', () => {
  it('tên team ghép nhiều giá trị bằng dấu phẩy vẫn nhận ra Media', () => {
    expect(canManageCatalog(['LEADER'], 'Scale Data, Media, Team K1')).toBe(true);
    expect(canManageCatalog(['LEADER'], ' media ')).toBe(true);
  });

  it('tên team chỉ CHỨA chữ media thì không còn được tính là Media', () => {
    // Trước đây hai dòng này trả về true và được ghi lại như "giới hạn đã biết". Nó không phải
    // giới hạn vô hại: tên team do người dùng đặt được, nên chỉ cần đặt là "Social Media" là
    // hiện đủ nút thêm/sửa/xoá thiết bị và duyệt phiếu. BE đã siết, bản này phải siết theo —
    // lệch nhau thì hoặc hiện nút rồi ăn 403, hoặc ẩn nút của người thật sự có quyền.
    expect(canManageCatalog(['LEADER'], 'Multimedia')).toBe(false);
    expect(canManageCatalog(['LEADER'], 'Social Media Marketing')).toBe(false);
    expect(canManageCatalog(['LEADER'], 'Team K1,Social Media')).toBe(false);
  });

  it('đổi tên team ra khỏi chữ media là mất quyền ngay', () => {
    expect(canManageCatalog(['LEADER'], 'Truyền thông')).toBe(false);
  });

  it.each(['Team Media', 'Media Team', 'Bộ phận Media'])(
    'team tên "%s" KHÔNG được tính là Media, vì BE cũng không tính',
    (ten) => {
      // Ba tên này TỪNG nằm trong danh sách của FE trong khi BE chỉ nhận đúng 'media'. Nhóm test
      // ngay trên khẳng định "khớp CHÍNH XÁC" nhưng không ca nào chạm tới chúng, nên lệch lọt
      // qua: leader của team đặt tên như vậy thấy đủ nút Duyệt và bàn giao rồi bấm vào ăn 403.
      //
      // Muốn cho những tên này có quyền thật thì phải sửa BE trước, rồi mới nới ở đây — không
      // bao giờ nới một mình FE.
      expect(canManageCatalog(['LEADER'], ten)).toBe(false);
    },
  );

  it('đúng tên team thật trong hệ thống thì vẫn có quyền', () => {
    // Trong 18 team đang có, chỉ duy nhất "MEDIA" chứa chữ media. Siết danh sách không lấy mất
    // quyền của ai đang dùng.
    expect(canManageCatalog(['LEADER'], 'MEDIA')).toBe(true);
  });

  it.each([
    'Team K1',
    'Team K2',
    'Team ADS',
    'Scale Data',
    'Global - Indo',
    'Global Thái Lan',
    'Đá Quý - Chung Thợ Đá',
    'Đồ Da',
    'AFF 01',
  ])('leader team "%s" không quản lý được kho Media', (ten) => {
    expect(canManageCatalog(['LEADER'], ten)).toBe(false);
  });
});

describe('canDeleteCatalog — chỉ cho phép ADMIN xóa Danh mục / Model', () => {
  it('admin có quyền xóa', () => {
    expect(canDeleteCatalog(['ADMIN'])).toBe(true);
    expect(canDeleteCatalog(['admin'])).toBe(true);
    expect(canDeleteCatalog(['LEADER', 'ADMIN'])).toBe(true);
  });

  it('leader và manager không có quyền xóa', () => {
    expect(canDeleteCatalog(['LEADER'])).toBe(false);
    expect(canDeleteCatalog(['MANAGER'])).toBe(false);
    expect(canDeleteCatalog(['MEMBER'])).toBe(false);
  });

  it('chưa nạp role hoặc rỗng thì không có quyền', () => {
    expect(canDeleteCatalog([])).toBe(false);
    expect(canDeleteCatalog(undefined)).toBe(false);
    expect(canDeleteCatalog(null)).toBe(false);
  });
});
