/**
 * Menu "Khám phá Video": "Kênh nội bộ" và "Khám phá kênh" từng dùng chung icon BookOpen, nhìn
 * menu không phân biệt được hai mục. Mỗi mục trong cùng một nhóm phải có icon riêng.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@/contexts/SocialLanguageContext', () => ({
  useSocialLang: () => ({
    t: new Proxy({}, { get: (_t, section: string) => new Proxy({}, { get: (_o, key: string) => `${section}.${key}` }) }),
  }),
}));

import { useNavMenus } from '../use-nav-menus';
import type { NavMenu } from '../types';

function buildAdminMenus(): NavMenu[] {
  let captured: NavMenu[] = [];
  function Probe() {
    captured = useNavMenus(true, true, { isAdmin: true, isLeader: true, isManager: true, isMediaLeaderOrAdmin: true });
    return null;
  }
  const root: Root = createRoot(document.createElement('div'));
  act(() => root.render(<Probe />));
  act(() => root.unmount());
  return captured;
}

function findItem(menus: NavMenu[], href: string) {
  for (const menu of menus) {
    for (const section of menu.sections) {
      const item = section.items.find((i) => i.href === href);
      if (item) return { item, section };
    }
  }
  throw new Error(`Không thấy mục menu ${href}`);
}

describe('Icon menu kênh trong "Khám phá Video"', () => {
  const menus = buildAdminMenus();

  it('"Khám phá kênh" không dùng chung icon với "Kênh nội bộ"', () => {
    const internal = findItem(menus, '/dashboard/internalChannels').item;
    const external = findItem(menus, '/dashboard/externalChannels').item;
    expect(external.icon).not.toBe(internal.icon);
  });

  it('các mục trong nhóm Phân tích có icon khác nhau', () => {
    const { section } = findItem(menus, '/dashboard/externalChannels');
    const icons = section.items.map((i) => i.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
