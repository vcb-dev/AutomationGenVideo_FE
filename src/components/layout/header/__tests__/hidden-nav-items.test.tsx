/**
 * Chức năng: ẩn Tìm kiếm Video (Hub), Dịch Content (menu Khám phá Video) và Chuyển đổi content
 * (menu Tiện ích) khỏi thanh điều hướng với MỌI vai trò. Trang vẫn còn, chỉ bỏ lối vào trên menu.
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
import { UserRole } from '@/types/auth';
import { canManageCatalog } from '@/lib/equipment/catalog-permissions';

/** Dựng menu thật bằng cách chạy hook với đúng các cờ vai trò HeaderInner truyền vào. */
function buildNavMenus(role: UserRole): NavMenu[] {
  let captured: NavMenu[] = [];

  function Probe() {
    captured = useNavMenus(
      [UserRole.ADMIN, UserRole.MANAGER].includes(role),
      [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(role),
      {
        isAdmin: role === UserRole.ADMIN,
        isLeader: role === UserRole.LEADER,
        isManager: role === UserRole.MANAGER,
        isMediaLeaderOrAdmin: canManageCatalog([role]),
      },
    );
    return null;
  }

  const root: Root = createRoot(document.createElement('div'));
  act(() => root.render(<Probe />));
  act(() => root.unmount());
  return captured;
}

/** Đường dẫn (bỏ query) của mọi mục trong một menu. */
function menuPaths(menus: NavMenu[], menuId: string): string[] {
  const menu = menus.find((m) => m.id === menuId);
  return (menu?.sections ?? []).flatMap((s) => s.items.map((i) => i.href.split('?')[0]));
}

const ROLES = Object.values(UserRole);

describe.each(ROLES)('Vai trò %s', (role) => {
  const menus = buildNavMenus(role);

  it('Khám phá Video không còn Tìm kiếm Video (Hub) và Dịch Content', () => {
    const paths = menuPaths(menus, 'social-discovery');
    expect(paths).not.toContain('/dashboard/search-video');
    expect(paths).not.toContain('/dashboard/content/generate');
  });

  it('Tiện ích không còn Chuyển đổi content', () => {
    expect(menuPaths(menus, 'tien-ich')).not.toContain('/dashboard/ai/content-transform');
  });

  it('các mục cùng nhóm vẫn còn: Bộ sưu tập, Clone Voice', () => {
    expect(menuPaths(menus, 'social-discovery')).toContain('/dashboard/video-library');
    expect(menuPaths(menus, 'tien-ich')).toContain('/dashboard/ai/clone-voice');
  });

  it('không để lại tiêu đề section rỗng sau khi ẩn', () => {
    for (const menu of menus) {
      for (const section of menu.sections) expect(section.items.length).toBeGreaterThan(0);
    }
  });
});
