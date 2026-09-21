import { User, UserRole } from '@/types/auth';
import { canAccessRoute } from '../permissions';
import { getDefaultPermissionsForRole } from '@/config/permission-tree';

/**
 * Kiểm thử quyền vào 3 màn hình báo cáo theo đúng hướng dẫn sử dụng (mục 5–7):
 *   - ?tab=daily_report      → báo cáo ngày (đầu việc + traffic)
 *   - ?tab=daily_checklist   → checklist chất lượng đầu ra
 *   - ?tab=daily_outstanding → vấn đề phát sinh & bài học win
 *
 * Ba tab dùng CHUNG một đường dẫn `/dashboard/manager/user-activity`, chỉ khác query `tab`.
 * Nếu bản đồ quyền chỉ khớp theo đường dẫn thì cấp quyền một tab là mở luôn cả ba — nên phải có
 * test riêng khoá từng tab lại.
 */
const BASE = '/dashboard/manager/user-activity';

function makeUser(roles: UserRole[], permissions?: string[]): User {
  return {
    id: 'u1',
    email: 'nguoi@vcbi.vn',
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

describe('Quyền vào các màn hình báo cáo theo vai trò', () => {
  const admin = makeUser([UserRole.ADMIN], []);
  const manager = makeUser([UserRole.MANAGER], getDefaultPermissionsForRole('MANAGER'));
  const leader = makeUser([UserRole.LEADER], getDefaultPermissionsForRole('LEADER'));
  const member = makeUser([UserRole.MEMBER], getDefaultPermissionsForRole('MEMBER'));
  const legacy = makeUser([UserRole.MEMBER], []); // tài khoản cũ chưa cấu hình quyền

  it('MEMBER điền được checklist và xem hiệu suất cá nhân', () => {
    expect(canAccessRoute(member, `${BASE}?tab=daily_checklist`)).toBe(true);
    expect(canAccessRoute(member, `${BASE}?tab=personal`)).toBe(true);
  });

  it('MEMBER KHÔNG vào được tab duyệt vấn đề và không xem hiệu suất toàn công ty', () => {
    expect(canAccessRoute(member, `${BASE}?tab=daily_outstanding`)).toBe(false);
    expect(canAccessRoute(member, `${BASE}?tab=performance`)).toBe(false);
    expect(canAccessRoute(member, `${BASE}?tab=ranking`)).toBe(false);
  });

  it('MEMBER PHẢI vào được tab daily_report — đó là form nộp báo cáo ngày của họ', () => {
    // Tab này render ChecklistContainer (form nộp traffic/doanh thu), không phải màn xem tổng hợp.
    // Gắn nhầm quyền 'portal:reports:view' ở đây là chặn đúng người bắt buộc phải nộp.
    expect(canAccessRoute(member, `${BASE}?tab=daily_report`)).toBe(true);
  });

  it('LEADER duyệt được vấn đề và xem được báo cáo tổng hợp', () => {
    expect(canAccessRoute(leader, `${BASE}?tab=daily_outstanding`)).toBe(true);
    expect(canAccessRoute(leader, `${BASE}?tab=daily_report`)).toBe(true);
    expect(canAccessRoute(leader, `${BASE}?tab=performance`)).toBe(true);
    expect(canAccessRoute(leader, `${BASE}?tab=ranking`)).toBe(true);
  });

  it('MANAGER và ADMIN vào được cả ba tab báo cáo', () => {
    for (const u of [manager, admin]) {
      expect(canAccessRoute(u, `${BASE}?tab=daily_report`)).toBe(true);
      expect(canAccessRoute(u, `${BASE}?tab=daily_checklist`)).toBe(true);
      expect(canAccessRoute(u, `${BASE}?tab=daily_outstanding`)).toBe(true);
    }
  });

  it('quyền tự nộp báo cáo mở đúng 2 tab nộp, KHÔNG mở tab duyệt hay xếp hạng', () => {
    const chiNopBaoCao = makeUser([UserRole.MEMBER], ['portal:checklist:fill']);

    // Hai tab này đều là việc "nộp báo cáo của chính mình" nên dùng chung một quyền — cố ý.
    expect(canAccessRoute(chiNopBaoCao, `${BASE}?tab=daily_checklist`)).toBe(true);
    expect(canAccessRoute(chiNopBaoCao, `${BASE}?tab=daily_report`)).toBe(true);

    // Còn đây là việc của quản lý — phải nằm ngoài tầm với.
    expect(canAccessRoute(chiNopBaoCao, `${BASE}?tab=daily_outstanding`)).toBe(false);
    expect(canAccessRoute(chiNopBaoCao, `${BASE}?tab=ranking`)).toBe(false);
    expect(canAccessRoute(chiNopBaoCao, `${BASE}?tab=performance`)).toBe(false);
  });

  it('bỏ query tab thì rơi về quyền của trang gốc, không mở toang', () => {
    const chiChecklist = makeUser([UserRole.MEMBER], ['portal:checklist:fill']);

    // /dashboard/manager cần portal:performance:view_team — Member không có.
    expect(canAccessRoute(chiChecklist, BASE)).toBe(false);
  });

  it('tab lạ không khớp mục nào thì áp quyền của trang gốc', () => {
    const chiChecklist = makeUser([UserRole.MEMBER], ['portal:checklist:fill']);

    expect(canAccessRoute(chiChecklist, `${BASE}?tab=khong_ton_tai`)).toBe(false);
  });

  it('tài khoản cũ chưa cấu hình quyền vẫn vào được như trước, không bị khoá', () => {
    for (const tab of ['daily_report', 'daily_checklist', 'daily_outstanding']) {
      expect(canAccessRoute(legacy, `${BASE}?tab=${tab}`)).toBe(true);
    }
  });

  it('chưa đăng nhập thì không vào được tab báo cáo nào', () => {
    for (const tab of ['daily_report', 'daily_checklist', 'daily_outstanding']) {
      expect(canAccessRoute(null, `${BASE}?tab=${tab}`)).toBe(false);
    }
  });
});
