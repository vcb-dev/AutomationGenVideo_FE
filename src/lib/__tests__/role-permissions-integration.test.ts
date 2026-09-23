import { User, UserRole } from '@/types/auth';
import {
  canAccessRoute,
  hasPermission,
  canAccessExternalPlatform,
  canAccessInternalPlatform,
  hasGranularPermissions,
  filterNavMenusByPermissions,
} from '../permissions';
import { getDashboardPathForRoles } from '../post-login-redirect';
import { getDefaultPermissionsForRole, PERMISSION_TREE, getAllLeafPermissions } from '@/config/permission-tree';
import { getRequiredPermissionForPath, getRouteRuleForPath } from '@/config/permission-routes';

function makeUserWithRole(role: UserRole, permissions?: string[]): User {
  return {
    id: `u-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@vcbi.vn`,
    full_name: `User ${role}`,
    roles: [role],
    permissions: permissions ?? getDefaultPermissionsForRole(role),
    is_active: true,
    total_login_count: 1,
    total_action_count: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

describe('KIỂM THỬ TOÀN DIỆN HỆ THỐNG PHÂN QUYỀN (RBAC & GRANULAR PERMISSIONS)', () => {
  const member = makeUserWithRole(UserRole.MEMBER);
  const leader = makeUserWithRole(UserRole.LEADER);
  const manager = makeUserWithRole(UserRole.MANAGER);
  const admin = makeUserWithRole(UserRole.ADMIN);

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 1: CÁC VAI TRÒ CHUẨN MẶC ĐỊNH
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Member (Nhân viên thông thường)', () => {
    it('Đích sau đăng nhập phải truy cập được (Không bị chặn / Không đá sang khong-co-quyen)', () => {
      const redirectPath = getDashboardPathForRoles(member.roles);
      expect(canAccessRoute(member, redirectPath)).toBe(true);
      expect(redirectPath).toContain('tab=personal');
    });

    it('Truy cập Kênh của tôi /dashboard/channel-team/my phải thành công', () => {
      expect(canAccessRoute(member, '/dashboard/channel-team/my')).toBe(true);
    });

    it('Bị chặn khỏi Quản trị đội nhóm /dashboard/channel-team', () => {
      expect(canAccessRoute(member, '/dashboard/channel-team')).toBe(false);
    });

    it('Truy cập trang Tiến độ cá nhân và nộp báo cáo / checklist thành công', () => {
      expect(canAccessRoute(member, '/dashboard/manager/user-activity?tab=personal')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/manager/user-activity?tab=daily_checklist')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/manager/user-activity?tab=daily_report')).toBe(true);
    });

    it('Truy cập được Hiệu suất, Bảng xếp hạng, Báo cáo và Vấn đề & Win theo menu thực tế', () => {
      expect(canAccessRoute(member, '/dashboard/manager/user-activity?tab=performance')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/manager/user-activity?tab=ranking')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/manager/user-activity?tab=daily_outstanding')).toBe(true);
    });

    it('Bị chặn khỏi trang Admin, Leader, Quản lý nhân sự, Đăng bài hàng loạt và Cài đặt nhiệm vụ', () => {
      expect(canAccessRoute(member, '/dashboard/admin')).toBe(false);
      expect(canAccessRoute(member, '/dashboard/leader')).toBe(false);
      expect(canAccessRoute(member, '/dashboard/hr-management')).toBe(false);
      expect(canAccessRoute(member, '/dashboard/social/bulk')).toBe(false);
      expect(canAccessRoute(member, '/dashboard/task-auto/settings')).toBe(false);
    });

    it('Vào được phân hệ Nhiệm vụ và Đăng bài MXH theo menu thực tế', () => {
      expect(canAccessRoute(member, '/dashboard/task-auto')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/task-auto/teams')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/task-auto/catalog')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/task-auto/my-catalog')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/task-auto/kpi')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/social/channels')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/social/compose')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/social/schedule')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/social/calendar')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/social/history')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/social/stats')).toBe(true);
    });

    it('Vào được Kho thiết bị, Bảng điều khiển và tạo yêu cầu mượn thiết bị', () => {
      expect(canAccessRoute(member, '/dashboard/equipment')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/equipment/overview')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/equipment/new-request')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/equipment/borrow-history')).toBe(true);
      // Nhưng bị chặn duyệt và bàn giao thiết bị
      expect(canAccessRoute(member, '/dashboard/equipment/approvals')).toBe(false);
      expect(canAccessRoute(member, '/dashboard/equipment/handover')).toBe(false);
    });

    it('Vào được các tiện ích: Clone Voice, Transform, Downloader, Vòng quay nhưng bị chặn Tạo ảnh thẻ', () => {
      expect(canAccessRoute(member, '/dashboard/ai/clone-voice')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/ai/overview')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/ai/content-transform')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/tools/video-downloader')).toBe(true);
      expect(canAccessRoute(member, '/dashboard/tools/lucky-spin')).toBe(true);
      // Bị chặn tạo ảnh thẻ nhân sự (chỉ dành cho Leader/Admin)
      expect(canAccessRoute(member, '/dashboard/tien-ich/id-photo')).toBe(false);
    });
  });

  describe('2. Leader (Trưởng nhóm)', () => {
    it('Đích sau đăng nhập phải truy cập được', () => {
      const redirectPath = getDashboardPathForRoles(leader.roles);
      expect(canAccessRoute(leader, redirectPath)).toBe(true);
      expect(redirectPath).toBe('/dashboard/leader');
    });

    it('Truy cập được trang Leader Dashboard', () => {
      expect(canAccessRoute(leader, '/dashboard/leader')).toBe(true);
    });

    it('Truy cập được cả Kênh của tôi và Quản lý kênh đội nhóm', () => {
      expect(canAccessRoute(leader, '/dashboard/channel-team/my')).toBe(true);
      expect(canAccessRoute(leader, '/dashboard/channel-team')).toBe(true);
    });

    it('Truy cập được Hiệu suất đội ngũ, Bảng xếp hạng và Duyệt vấn đề & win', () => {
      expect(canAccessRoute(leader, '/dashboard/manager/user-activity?tab=performance')).toBe(true);
      expect(canAccessRoute(leader, '/dashboard/manager/user-activity?tab=ranking')).toBe(true);
      expect(canAccessRoute(leader, '/dashboard/manager/user-activity?tab=daily_outstanding')).toBe(true);
      expect(canAccessRoute(leader, '/dashboard/manager/user-activity?tab=personal')).toBe(true);
    });

    it('Duyệt và bàn giao thiết bị', () => {
      expect(canAccessRoute(leader, '/dashboard/equipment/approvals')).toBe(true);
    });

    it('Bị chặn khỏi Admin Panel và Quản lý nhân sự', () => {
      expect(canAccessRoute(leader, '/dashboard/admin')).toBe(false);
      expect(canAccessRoute(leader, '/dashboard/hr-management')).toBe(false);
    });
  });

  describe('3. Manager (Trưởng phòng/Quản lý)', () => {
    it('Truy cập được Quản lý nhân sự, Báo cáo và Quản trị đội nhóm', () => {
      expect(canAccessRoute(manager, '/dashboard/hr-management')).toBe(true);
      expect(canAccessRoute(manager, '/dashboard/channel-team')).toBe(true);
      expect(canAccessRoute(manager, '/dashboard/manager/user-activity?tab=performance')).toBe(true);
      expect(canAccessRoute(manager, '/dashboard/manager/user-activity?tab=dashboard')).toBe(true);
    });

    it('Bị chặn khỏi trang Admin Panel tuyệt đối', () => {
      expect(canAccessRoute(manager, '/dashboard/admin')).toBe(false);
    });
  });

  describe('4. Admin (Toàn quyền)', () => {
    it('Admin vào được mọi route trong hệ thống', () => {
      expect(canAccessRoute(admin, '/dashboard/admin')).toBe(true);
      expect(canAccessRoute(admin, '/dashboard/leader')).toBe(true);
      expect(canAccessRoute(admin, '/dashboard/hr-management')).toBe(true);
      expect(canAccessRoute(admin, '/dashboard/channel-team')).toBe(true);
      expect(canAccessRoute(admin, '/dashboard/channel-team/my')).toBe(true);
      expect(canAccessRoute(admin, '/dashboard/manager/user-activity?tab=performance')).toBe(true);
      expect(canAccessRoute(admin, '/dashboard/equipment/approvals')).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 2: TRƯỜNG HỢP TÙY BIẾN QUYỀN (CUSTOM PERMISSIONS)
  // ──────────────────────────────────────────────────────────────────────────
  describe('5. Trường hợp tùy biến: Nhân sự chỉ được cấp duy nhất TikTok', () => {
    const tiktokOnly = makeUserWithRole(UserRole.MEMBER, ['social:external:tiktok']);

    it('Vào được trang Kênh ngoài và tab TikTok', () => {
      expect(canAccessRoute(tiktokOnly, '/dashboard/externalChannels')).toBe(true);
      expect(canAccessRoute(tiktokOnly, '/dashboard/externalChannels/tiktok')).toBe(true);
      expect(canAccessExternalPlatform(tiktokOnly, 'tiktok')).toBe(true);
    });

    it('Bị chặn khỏi các nền tảng khác (Facebook, YouTube, Douyin...)', () => {
      expect(canAccessExternalPlatform(tiktokOnly, 'facebook')).toBe(false);
      expect(canAccessExternalPlatform(tiktokOnly, 'youtube')).toBe(false);
      expect(canAccessExternalPlatform(tiktokOnly, 'douyin')).toBe(false);
    });

    it('Bị chặn khỏi tất cả các phân hệ khác', () => {
      expect(canAccessRoute(tiktokOnly, '/dashboard/task-auto')).toBe(false);
      expect(canAccessRoute(tiktokOnly, '/dashboard/social/compose')).toBe(false);
      expect(canAccessRoute(tiktokOnly, '/dashboard/equipment')).toBe(false);
      expect(canAccessRoute(tiktokOnly, '/dashboard/admin')).toBe(false);
    });

    it('Chỉ xem được bài hướng dẫn Khám phá video, không xem được hướng dẫn khác', () => {
      expect(canAccessRoute(tiktokOnly, '/dashboard/user-guide/video-discovery')).toBe(true);
      expect(canAccessRoute(tiktokOnly, '/dashboard/user-guide/tasks')).toBe(false);
      expect(canAccessRoute(tiktokOnly, '/dashboard/user-guide/equipment')).toBe(false);
    });
  });

  describe('6. Trường hợp tùy biến: Nhân sự chỉ được cấp Đầu việc cá nhân (Nhiệm vụ)', () => {
    const tasksOnly = makeUserWithRole(UserRole.MEMBER, [
      'tasks:my_catalog',
      'tasks:list',
    ]);

    it('Vào được Tổng quan nhiệm vụ và Đầu việc cá nhân', () => {
      expect(canAccessRoute(tasksOnly, '/dashboard/task-auto')).toBe(true);
      expect(canAccessRoute(tasksOnly, '/dashboard/task-auto/my-catalog')).toBe(true);
      expect(canAccessRoute(tasksOnly, '/dashboard/task-auto/tasks')).toBe(true);
    });

    it('Bị chặn khỏi KPI, Danh mục tổng, Đội nhóm và Cài đặt', () => {
      expect(canAccessRoute(tasksOnly, '/dashboard/task-auto/kpi')).toBe(false);
      expect(canAccessRoute(tasksOnly, '/dashboard/task-auto/catalog')).toBe(false);
      expect(canAccessRoute(tasksOnly, '/dashboard/task-auto/teams')).toBe(false);
      expect(canAccessRoute(tasksOnly, '/dashboard/task-auto/settings')).toBe(false);
    });

    it('Bị chặn khỏi Kênh ngoài và MXH', () => {
      expect(canAccessRoute(tasksOnly, '/dashboard/externalChannels')).toBe(false);
      expect(canAccessRoute(tasksOnly, '/dashboard/social/compose')).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 3: HÀNH ĐỘNG NHẠY CẢM (SENSITIVE ACTIONS - CHẶN CÀO TAY TRỘM)
  // ──────────────────────────────────────────────────────────────────────────
  describe('7. Quyền nhạy cảm: Tuyệt đối không cho phép tự động thừa hưởng cào tay (crawl_all)', () => {
    it('Có quyền cha social:external:all nhưng KHÔNG CÓ crawl_all thì hasPermission trả về false', () => {
      const userWatchOnly = makeUserWithRole(UserRole.MEMBER, ['social:external:all']);
      expect(hasPermission(userWatchOnly, 'social:external:crawl_all')).toBe(false);
    });

    it('Chỉ khi được cấp đích danh social:external:crawl_all mới được phép cào tay', () => {
      const userCrawlAllowed = makeUserWithRole(UserRole.MEMBER, [
        'social:external:all',
        'social:external:crawl_all',
      ]);
      expect(hasPermission(userCrawlAllowed, 'social:external:crawl_all')).toBe(true);
    });

    it('Admin luôn có quyền cào tay dữ liệu', () => {
      expect(hasPermission(admin, 'social:external:crawl_all')).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 4: NỀN TẢNG KÊNH NỘI BỘ (INTERNAL CHANNELS)
  // ──────────────────────────────────────────────────────────────────────────
  describe('8. Nền tảng Kênh nội bộ (Internal Channels)', () => {
    it('Tài khoản có quyền social:internal:threads chỉ vào được tab threads', () => {
      const threadsUser = makeUserWithRole(UserRole.MEMBER, [
        'social:internal:overview',
        'social:internal:threads',
      ]);
      expect(canAccessInternalPlatform(threadsUser, 'threads')).toBe(true);
      expect(canAccessInternalPlatform(threadsUser, 'facebook')).toBe(false);
      expect(canAccessInternalPlatform(threadsUser, 'tiktok')).toBe(false);
    });

    it('Tài khoản có quyền social:internal:view vào được tab "all"', () => {
      const allUser = makeUserWithRole(UserRole.MEMBER, ['social:internal:view']);
      expect(canAccessInternalPlatform(allUser, 'all')).toBe(true);
    });

    it('Tài khoản không có social:internal:view bị chặn khỏi tab "all"', () => {
      const singlePlatform = makeUserWithRole(UserRole.MEMBER, ['social:internal:facebook']);
      expect(canAccessInternalPlatform(singlePlatform, 'all')).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 5: TÀI KHOẢN CŨ CHƯA PHÂN QUYỀN (BACKWARD COMPATIBILITY)
  // ──────────────────────────────────────────────────────────────────────────
  describe('9. Tài khoản cũ (permissions rỗng) giữ nguyên hoạt động, không bị khóa', () => {
    const legacy = makeUserWithRole(UserRole.MEMBER, []);

    it('hasGranularPermissions trả về false', () => {
      expect(hasGranularPermissions(legacy)).toBe(false);
    });

    it('canAccessRoute cho phép truy cập các trang công việc thường ngày', () => {
      expect(canAccessRoute(legacy, '/dashboard/task-auto')).toBe(true);
      expect(canAccessRoute(legacy, '/dashboard/equipment')).toBe(true);
    });

    it('canAccessExternalPlatform và canAccessInternalPlatform cho phép xem', () => {
      expect(canAccessExternalPlatform(legacy, 'tiktok')).toBe(true);
      expect(canAccessInternalPlatform(legacy, 'threads')).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 6: BẢO VỆ KHI CHƯA ĐĂNG NHẬP HOẶC TÀI KHOẢN BỊ KHÓA
  // ──────────────────────────────────────────────────────────────────────────
  describe('10. Bảo vệ khi chưa đăng nhập (user = null)', () => {
    it('canAccessRoute từ chối mọi yêu cầu', () => {
      expect(canAccessRoute(null, '/dashboard/task-auto')).toBe(false);
      expect(canAccessRoute(null, '/dashboard/admin')).toBe(false);
      expect(canAccessRoute(null, '/dashboard/equipment')).toBe(false);
    });

    it('filterNavMenusByPermissions trả về mảng rỗng', () => {
      const sampleMenu = [{ id: 'menu1', sections: [{ section: 'S', items: [{ href: '/dashboard/task-auto' }] }] }];
      expect(filterNavMenusByPermissions(null, sampleMenu)).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 7: MULTI-ROLE (TÀI KHOẢN CÓ NHIỀU VAI TRÒ CÙNG LÚC)
  // ──────────────────────────────────────────────────────────────────────────
  describe('11. Multi-Role: Tài khoản kết hợp nhiều vai trò', () => {
    it('User vừa là MEMBER vừa là LEADER: ưu tiên đích Leader và mở được cả 2 khu vực', () => {
      const multiUser: User = {
        ...member,
        roles: [UserRole.MEMBER, UserRole.LEADER],
        permissions: getDefaultPermissionsForRole('LEADER'),
      };
      // Đích đăng nhập ưu tiên Leader
      expect(getDashboardPathForRoles(multiUser.roles)).toBe('/dashboard/leader');
      expect(canAccessRoute(multiUser, '/dashboard/leader')).toBe(true);
      // Vẫn vào được Tiến độ cá nhân của Member
      expect(canAccessRoute(multiUser, '/dashboard/manager/user-activity?tab=personal')).toBe(true);
      // Vào được cả Duyệt vấn đề của Leader
      expect(canAccessRoute(multiUser, '/dashboard/manager/user-activity?tab=daily_outstanding')).toBe(true);
    });

    it('User có LEADER và ADMIN: Admin luôn có quyền ưu tiên cao nhất', () => {
      const adminLeader: User = {
        ...admin,
        roles: [UserRole.LEADER, UserRole.ADMIN],
      };
      expect(getDashboardPathForRoles(adminLeader.roles)).toBe('/dashboard/admin');
      expect(canAccessRoute(adminLeader, '/dashboard/admin')).toBe(true);
      expect(canAccessRoute(adminLeader, '/dashboard/leader')).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 8: SUB-PANEL BÁO CÁO NGÀY VỚI QUERY PARAMETERS ĐẦY ĐỦ
  // ──────────────────────────────────────────────────────────────────────────
  describe('12. Báo cáo ngày với đa dạng tham số query (traffic, tasks, monthly)', () => {
    it('Nhân sự có quyền portal:checklist:fill mở được tất cả các dạng báo cáo con', () => {
      const u = makeUserWithRole(UserRole.MEMBER, ['portal:checklist:fill']);
      const base = '/dashboard/manager/user-activity';
      expect(canAccessRoute(u, `${base}?tab=daily_report&report=daily&type=traffic`)).toBe(true);
      expect(canAccessRoute(u, `${base}?tab=daily_report&report=daily&type=tasks`)).toBe(true);
      expect(canAccessRoute(u, `${base}?tab=daily_report&report=monthly`)).toBe(true);
    });

    it('Nhân sự không có portal:checklist:fill bị chặn khỏi tất cả các báo cáo con', () => {
      const u = makeUserWithRole(UserRole.MEMBER, ['tasks:list']);
      const base = '/dashboard/manager/user-activity';
      expect(canAccessRoute(u, `${base}?tab=daily_report&report=daily&type=traffic`)).toBe(false);
      expect(canAccessRoute(u, `${base}?tab=daily_report&report=daily&type=tasks`)).toBe(false);
      expect(canAccessRoute(u, `${base}?tab=daily_report&report=monthly`)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 9: CÁC QUYỀN HÀNH ĐỘNG ĐẶC THÙ NHẠY CẢM KHÁC
  // ──────────────────────────────────────────────────────────────────────────
  describe('13. Quyền hành động nhạy cảm khác (sync kênh nội bộ, xoá nhân sự)', () => {
    it('social:internal:sync không tự động thừa hưởng từ social:internal:view', () => {
      const viewOnly = makeUserWithRole(UserRole.MEMBER, ['social:internal:view']);
      expect(hasPermission(viewOnly, 'social:internal:sync')).toBe(false);
    });

    it('social:internal:sync chỉ cho phép khi được cấp đích danh', () => {
      const syncAllowed = makeUserWithRole(UserRole.MEMBER, [
        'social:internal:view',
        'social:internal:sync',
      ]);
      expect(hasPermission(syncAllowed, 'social:internal:sync')).toBe(true);
    });

    it('portal:hr:delete không tự động thừa hưởng từ portal:hr:manage', () => {
      const hrManage = makeUserWithRole(UserRole.MANAGER, ['portal:hr:manage']);
      expect(hasPermission(hrManage, 'portal:hr:delete')).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NHÓM 10: WILDCARD (*) VÀ QUYỀN TIỀN TỐ PHÂN HỆ
  // ──────────────────────────────────────────────────────────────────────────
  describe('14. Wildcard toàn cục (*) và Tiền tố phân hệ (:*)', () => {
    it('Wildcard toàn cục (*) mở khoá tất cả mọi quyền kể cả nhạy cảm', () => {
      const superUser = makeUserWithRole(UserRole.MEMBER, ['*']);
      expect(hasPermission(superUser, 'social:external:crawl_all')).toBe(true);
      expect(hasPermission(superUser, 'social:internal:sync')).toBe(true);
      expect(hasPermission(superUser, 'portal:hr:delete')).toBe(true);
      expect(canAccessRoute(superUser, '/dashboard/admin')).toBe(true);
    });

    it('Wildcard phân hệ publishing:* mở khoá toàn bộ các chức năng đăng bài', () => {
      const publisher = makeUserWithRole(UserRole.MEMBER, ['publishing:*']);
      expect(canAccessRoute(publisher, '/dashboard/social/compose')).toBe(true);
      expect(canAccessRoute(publisher, '/dashboard/social/bulk')).toBe(true);
      expect(canAccessRoute(publisher, '/dashboard/social/schedule')).toBe(true);
      expect(canAccessRoute(publisher, '/dashboard/social/calendar')).toBe(true);
      // Nhưng bị chặn khỏi Nhiệm vụ hay Thiết bị
      expect(canAccessRoute(publisher, '/dashboard/task-auto')).toBe(false);
      expect(canAccessRoute(publisher, '/dashboard/equipment')).toBe(false);
    });
  });
});
