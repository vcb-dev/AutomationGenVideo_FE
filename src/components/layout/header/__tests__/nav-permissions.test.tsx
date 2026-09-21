/**
 * Kiểm thử RBAC trên CÂY MENU THẬT của ứng dụng (useNavMenus), không dùng menu giả.
 *
 * Lần trước bộ test chỉ chạy trên một mảng menu bịa ra 3 mục, nên không thể phát hiện việc một
 * mục có thật trong menu bị quên khai báo quyền — mà quên khai báo thì mục đó hiện với tất cả
 * mọi người, đúng triệu chứng "phân quyền không ăn".
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// t.nav dùng hàng chục khoá nhãn; Proxy trả lại chính tên khoá là đủ để dựng cấu trúc menu.
jest.mock('@/contexts/SocialLanguageContext', () => ({
  useSocialLang: () => ({
    t: new Proxy({}, { get: (_t, section: string) => new Proxy({}, { get: (_o, key: string) => `${section}.${key}` }) }),
  }),
}));

import { useNavMenus } from '../use-nav-menus';
import type { NavMenu } from '../types';
import { User, UserRole } from '@/types/auth';
import { canAccessRoute, filterNavMenusByPermissions } from '@/lib/permissions';
import { getRequiredPermissionForPath } from '@/config/permission-routes';
import { getDefaultPermissionsForRole } from '@/config/permission-tree';
import { canManageCatalog } from '@/lib/equipment/catalog-permissions';

// ─── Dựng menu thật bằng cách chạy hook trong một component tạm ────────────────

function buildNavMenus(user: User): NavMenu[] {
  let captured: NavMenu[] = [];

  function Probe() {
    const isManagerOrAdmin = user.roles?.some((r) => [UserRole.ADMIN, UserRole.MANAGER].includes(r));
    const isManagement = user.roles?.some((r) =>
      [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(r),
    );
    captured = useNavMenus(!!isManagerOrAdmin, !!isManagement, {
      isAdmin: user.roles?.includes(UserRole.ADMIN),
      isLeader: user.roles?.includes(UserRole.LEADER),
      isManager: user.roles?.includes(UserRole.MANAGER),
      isMediaLeaderOrAdmin: canManageCatalog(user.roles, user.team),
    });
    return null;
  }

  const container = document.createElement('div');
  const root: Root = createRoot(container);
  act(() => root.render(<Probe />));
  act(() => root.unmount());
  return captured;
}

function makeUser(roles: UserRole[], permissions?: string[], team?: string): User {
  return {
    id: 'u1',
    email: 'nguoi.dung@vcbi.vn',
    full_name: 'Người dùng',
    roles,
    permissions,
    team,
    is_active: true,
    total_login_count: 1,
    total_action_count: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

/** Mọi đường dẫn xuất hiện trong menu sau khi lọc. */
function visibleHrefs(menus: NavMenu[]): string[] {
  const hrefs: string[] = [];
  for (const menu of menus) {
    if (menu.directHref) hrefs.push(menu.directHref);
    for (const section of menu.sections) {
      for (const item of section.items) {
        if (item.href) hrefs.push(item.href);
        for (const card of item.subPanel ?? []) if (card.href) hrefs.push(card.href);
      }
    }
  }
  return hrefs;
}

const admin = makeUser([UserRole.ADMIN], []);
const allMenus = buildNavMenus(admin);

// ─────────────────────────────────────────────────────────────────────────────

describe('Độ phủ: mọi mục trong menu thật đều phải có quyền rõ ràng', () => {
  /** Trang ai đăng nhập cũng vào được — cố ý không gắn quyền. */
  const PUBLIC_PREFIXES = ['/dashboard/user-guide', '/dashboard/khong-co-quyen'];
  /** Khớp ĐÚNG đường dẫn, không tính mục con: /dashboard/ai là trang chính sau đăng nhập,
   *  nhưng /dashboard/ai/clone-voice thì vẫn phải có quyền riêng. */
  const PUBLIC_EXACT = ['/dashboard/ai', '/dashboard'];

  const isPublic = (href: string) =>
    PUBLIC_EXACT.includes(href.split('?')[0]) ||
    PUBLIC_PREFIXES.some((p) => href.startsWith(p));

  it('không còn mục nào bị quên khai báo quyền', () => {
    const chuaKhaiBao = visibleHrefs(allMenus)
      .filter((href) => href.startsWith('/dashboard'))
      .filter((href) => !isPublic(href))
      .filter((href) => getRequiredPermissionForPath(href) === null);

    expect(Array.from(new Set(chuaKhaiBao))).toEqual([]);
  });

  it('mọi quyền dùng trong bản đồ đường dẫn đều tồn tại trong cây quyền', () => {
    const { getAllLeafPermissions } = require('@/config/permission-tree');
    const leaves: string[] = getAllLeafPermissions();
    const { ROUTE_PERMISSIONS } = require('@/config/permission-routes');

    const thieu = ROUTE_PERMISSIONS
      .map((r: any) => r.permission)
      .filter((p: string) => !leaves.includes(p));

    expect(Array.from(new Set(thieu))).toEqual([]);
  });
});

describe('Kịch bản 1 — Admin tạo tài khoản MEMBER với quyền mặc định', () => {
  const member = makeUser([UserRole.MEMBER], getDefaultPermissionsForRole('MEMBER'));
  const menus = filterNavMenusByPermissions(member, buildNavMenus(member));
  const hrefs = visibleHrefs(menus);

  it('KHÔNG thấy Quản lý nhân sự', () => {
    expect(hrefs).not.toContain('/dashboard/hr-management');
    expect(canAccessRoute(member, '/dashboard/hr-management')).toBe(false);
  });

  it('KHÔNG thấy trang quản trị / điều hành', () => {
    expect(hrefs).not.toContain('/dashboard/admin');
    expect(hrefs).not.toContain('/dashboard/leader');
    expect(canAccessRoute(member, '/dashboard/admin')).toBe(false);
  });

  it('KHÔNG duyệt được thiết bị, nhưng vẫn mượn được', () => {
    expect(canAccessRoute(member, '/dashboard/equipment/approvals')).toBe(false);
    expect(canAccessRoute(member, '/dashboard/equipment/new-request')).toBe(true);
  });

  it('KHÔNG xem được hiệu suất toàn công ty, chỉ xem của mình', () => {
    const base = '/dashboard/manager/user-activity';
    expect(canAccessRoute(member, `${base}?tab=performance`)).toBe(false);
    expect(canAccessRoute(member, `${base}?tab=ranking`)).toBe(false);
    expect(canAccessRoute(member, `${base}?tab=personal`)).toBe(true);
  });

  it('VẪN làm được việc của mình: nhiệm vụ, đăng bài, khám phá video', () => {
    expect(canAccessRoute(member, '/dashboard/task-auto')).toBe(true);
    expect(canAccessRoute(member, '/dashboard/social/compose')).toBe(true);
    expect(canAccessRoute(member, '/dashboard/externalChannels')).toBe(true);
  });

  it('KHÔNG có quyền cào tay, KHÔNG điều phối nhiệm vụ', () => {
    const { hasPermission } = require('@/lib/permissions');
    expect(hasPermission(member, 'social:external:crawl_all')).toBe(false);
    expect(canAccessRoute(member, '/dashboard/task-auto/teams')).toBe(false);
    expect(canAccessRoute(member, '/dashboard/task-auto/settings')).toBe(false);
  });
});

describe('Kịch bản 2 — Admin chỉ tick đúng 2 ô cho một tài khoản', () => {
  // Đúng thao tác người dùng mô tả: chọn lẻ vài quyền rồi lưu.
  const hep = makeUser([UserRole.MEMBER], ['social:external:tiktok', 'tasks:list']);
  const menus = filterNavMenusByPermissions(hep, buildNavMenus(hep));
  const hrefs = visibleHrefs(menus);

  it('menu rút lại chỉ còn đúng phần được cấp', () => {
    expect(hrefs).toContain('/dashboard/task-auto');
    expect(hrefs).not.toContain('/dashboard/social/compose');
    expect(hrefs).not.toContain('/dashboard/equipment');
    expect(hrefs).not.toContain('/dashboard/hr-management');
  });

  it('không còn menu rỗng nào lọt lại trên thanh điều hướng', () => {
    for (const menu of menus) {
      if (menu.directHref) continue;
      expect(menu.sections.length).toBeGreaterThan(0);
      for (const section of menu.sections) {
        expect(section.items.length).toBeGreaterThan(0);
      }
    }
  });

  it('gõ thẳng URL vào mục không được cấp vẫn bị chặn', () => {
    for (const url of [
      '/dashboard/hr-management',
      '/dashboard/admin',
      '/dashboard/equipment',
      '/dashboard/social/compose',
      '/dashboard/video-library',
    ]) {
      expect(canAccessRoute(hep, url)).toBe(false);
    }
  });

  it('trang hướng dẫn sử dụng vẫn vào được — không khoá nhầm', () => {
    expect(canAccessRoute(hep, '/dashboard/user-guide/tasks')).toBe(true);
    expect(canAccessRoute(hep, '/dashboard/khong-co-quyen')).toBe(true);
  });
});

describe('Kịch bản 3 — LEADER và MANAGER theo quyền mặc định', () => {
  const leader = makeUser([UserRole.LEADER], getDefaultPermissionsForRole('LEADER'));
  const manager = makeUser([UserRole.MANAGER], getDefaultPermissionsForRole('MANAGER'));

  it('Leader duyệt được checklist và điều phối nhiệm vụ', () => {
    expect(canAccessRoute(leader, '/dashboard/manager/user-activity?tab=daily_outstanding')).toBe(true);
    expect(canAccessRoute(leader, '/dashboard/task-auto/teams')).toBe(true);
    expect(canAccessRoute(leader, '/dashboard/leader')).toBe(true);
  });

  it('Leader KHÔNG vào được trang quản trị hệ thống và nhân sự', () => {
    expect(canAccessRoute(leader, '/dashboard/admin')).toBe(false);
    expect(canAccessRoute(leader, '/dashboard/hr-management')).toBe(false);
  });

  it('Manager vào được nhân sự nhưng KHÔNG vào trang quản trị hệ thống', () => {
    expect(canAccessRoute(manager, '/dashboard/hr-management')).toBe(true);
    expect(canAccessRoute(manager, '/dashboard/admin')).toBe(false);
  });

  it('Leader có quyền cào tay, Member thì không', () => {
    const { hasPermission } = require('@/lib/permissions');
    const member = makeUser([UserRole.MEMBER], getDefaultPermissionsForRole('MEMBER'));
    expect(hasPermission(leader, 'social:external:crawl_all')).toBe(true);
    expect(hasPermission(member, 'social:external:crawl_all')).toBe(false);
  });
});

describe('Kịch bản 4 — an toàn khi deploy: tài khoản cũ và Admin', () => {
  it('tài khoản cũ (permissions rỗng) giữ nguyên menu như trước, không mất mục nào', () => {
    const cu = makeUser([UserRole.MEMBER], []);
    const truoc = buildNavMenus(cu);
    const sau = filterNavMenusByPermissions(cu, truoc);

    expect(visibleHrefs(sau)).toEqual(visibleHrefs(truoc));
  });

  it('tài khoản chưa từng có trường permissions (undefined) cũng không bị khoá', () => {
    const chuaCo = makeUser([UserRole.MEMBER], undefined);
    expect(canAccessRoute(chuaCo, '/dashboard/task-auto')).toBe(true);
    expect(filterNavMenusByPermissions(chuaCo, allMenus)).toEqual(allMenus);
  });

  it('Admin luôn thấy đủ menu kể cả khi bị cấp mảng quyền hẹp', () => {
    const adminBiCatQuyen = makeUser([UserRole.ADMIN], ['tasks:list']);
    expect(filterNavMenusByPermissions(adminBiCatQuyen, allMenus)).toEqual(allMenus);
    expect(canAccessRoute(adminBiCatQuyen, '/dashboard/admin')).toBe(true);
  });
});

describe('Kịch bản 5 — sửa tài khoản không được làm mất quyền', () => {
  it('quyền đọc từ danh sách rồi gửi lại nguyên vẹn thì menu không đổi', () => {
    const daCap = getDefaultPermissionsForRole('LEADER');
    // Mô phỏng vòng: DB -> danh sách -> form -> lưu -> DB
    const tuDanhSach = makeUser([UserRole.LEADER], [...daCap]);
    const sauKhiLuu = makeUser([UserRole.LEADER], [...(tuDanhSach.permissions ?? [])]);

    expect(sauKhiLuu.permissions).toEqual(daCap);
    expect(visibleHrefs(filterNavMenusByPermissions(sauKhiLuu, buildNavMenus(sauKhiLuu))))
      .toEqual(visibleHrefs(filterNavMenusByPermissions(tuDanhSach, buildNavMenus(tuDanhSach))));
  });
});
