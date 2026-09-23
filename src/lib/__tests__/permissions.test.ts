import { User, UserRole } from '@/types/auth';
import {
  checkPermissionMatch,
  hasPermission,
  canAccessExternalPlatform,
  canAccessInternalPlatform,
  filterAllowedPlatforms,
  filterAllowedInternalPlatforms,
  canAccessRoute,
} from '../permissions';

describe('Frontend RBAC Permissions Helper', () => {
  const mockAdminUser: User = {
    id: 'user-admin',
    email: 'admin@vcbi.vn',
    full_name: 'Super Admin',
    roles: [UserRole.ADMIN],
    permissions: [],
    is_active: true,
    total_login_count: 1,
    total_action_count: 10,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const mockTikTokUser: User = {
    id: 'user-tiktok',
    email: 'tiktok@vcbi.vn',
    full_name: 'TikTok Specialist',
    roles: [UserRole.MEMBER],
    permissions: ['social:external:tiktok', 'social:external:facebook'],
    is_active: true,
    total_login_count: 1,
    total_action_count: 5,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const mockInternalFbUser: User = {
    id: 'user-internal-fb',
    email: 'internalfb@vcbi.vn',
    full_name: 'Internal FB Manager',
    roles: [UserRole.MEMBER],
    permissions: ['social:internal:facebook'],
    is_active: true,
    total_login_count: 1,
    total_action_count: 5,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const mockAllPlatformsUser: User = {
    id: 'user-all',
    email: 'content@vcbi.vn',
    full_name: 'Content Lead',
    roles: [UserRole.MEMBER],
    permissions: ['social:external:all'],
    is_active: true,
    total_login_count: 1,
    total_action_count: 5,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const samplePlatforms = [
    { id: 'all', label: 'Tất cả' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'douyin', label: 'Douyin' },
    { id: 'xiaohongshu', label: 'XiaoHongShu' },
  ];

  const sampleInternalPlatforms = [
    { id: 'all', label: 'Tất cả' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'threads', label: 'Threads' },
    { id: 'youtube', label: 'YouTube' },
  ];

  describe('checkPermissionMatch()', () => {
    it('khớp chính xác mã quyền', () => {
      expect(checkPermissionMatch(['social:external:tiktok'], 'social:external:tiktok')).toBe(true);
      expect(checkPermissionMatch(['social:external:tiktok'], 'social:external:douyin')).toBe(false);
    });

    it('khớp qua quyền all cấp cha (social:external:all)', () => {
      expect(checkPermissionMatch(['social:external:all'], 'social:external:tiktok')).toBe(true);
      expect(checkPermissionMatch(['social:external:all'], 'social:external:douyin')).toBe(true);
      expect(checkPermissionMatch(['social:external:all'], 'social:external:facebook')).toBe(true);
      expect(checkPermissionMatch(['social:external:all'], 'portal:hr:manage')).toBe(false);
    });
  });

  describe('hasPermission()', () => {
    it('Admin luôn có toàn quyền (Bypass)', () => {
      expect(hasPermission(mockAdminUser, 'social:external:douyin')).toBe(true);
      expect(hasPermission(mockAdminUser, 'random:permission:whatever')).toBe(true);
    });

    it('User thường chỉ có quyền được cấp', () => {
      expect(hasPermission(mockTikTokUser, 'social:external:tiktok')).toBe(true);
      expect(hasPermission(mockTikTokUser, 'social:external:facebook')).toBe(true);
      expect(hasPermission(mockTikTokUser, 'social:external:douyin')).toBe(false);
    });

    it('Trả về false khi user là null hoặc undefined', () => {
      expect(hasPermission(null, 'social:external:tiktok')).toBe(false);
      expect(hasPermission(undefined, 'social:external:tiktok')).toBe(false);
    });

    it('Role MEMBER không được cào tay video nếu không được cấp quyền đích danh', () => {
      expect(hasPermission(mockAllPlatformsUser, 'social:external:crawl_all')).toBe(false);
      expect(hasPermission(mockTikTokUser, 'social:external:crawl_all')).toBe(false);

      const blankMember: User = { ...mockTikTokUser, permissions: [] };
      expect(hasPermission(blankMember, 'social:external:crawl_all')).toBe(false);

      const memberWithCrawl: User = { ...mockTikTokUser, permissions: ['social:external:crawl_all'] };
      expect(hasPermission(memberWithCrawl, 'social:external:crawl_all')).toBe(true);

      expect(hasPermission(mockAdminUser, 'social:external:crawl_all')).toBe(true);
    });
  });

  describe('canAccessExternalPlatform()', () => {
    it('Admin truy cập được tất cả nền tảng', () => {
      expect(canAccessExternalPlatform(mockAdminUser, 'all')).toBe(true);
      expect(canAccessExternalPlatform(mockAdminUser, 'douyin')).toBe(true);
      expect(canAccessExternalPlatform(mockAdminUser, 'tiktok')).toBe(true);
    });

    it('social:external:all CHỈ mở tab tổng hợp, không mở từng nền tảng', () => {
      expect(canAccessExternalPlatform(mockAllPlatformsUser, 'all')).toBe(true);
      expect(canAccessExternalPlatform(mockAllPlatformsUser, 'douyin')).toBe(false);
      expect(canAccessExternalPlatform(mockAllPlatformsUser, 'tiktok')).toBe(false);
      expect(canAccessExternalPlatform(mockAllPlatformsUser, 'facebook')).toBe(false);
    });

    it('wildcard toàn cục * vẫn mở mọi nền tảng', () => {
      const sieuQuyen: User = { ...mockAllPlatformsUser, permissions: ['*'] };
      expect(canAccessExternalPlatform(sieuQuyen, 'all')).toBe(true);
      expect(canAccessExternalPlatform(sieuQuyen, 'douyin')).toBe(true);
    });

    it('cấp đủ cả tab tổng hợp lẫn từng nền tảng thì thấy hết', () => {
      const dayDu: User = {
        ...mockAllPlatformsUser,
        permissions: ['social:external:all', 'social:external:tiktok', 'social:external:facebook'],
      };
      expect(canAccessExternalPlatform(dayDu, 'all')).toBe(true);
      expect(canAccessExternalPlatform(dayDu, 'tiktok')).toBe(true);
      expect(canAccessExternalPlatform(dayDu, 'facebook')).toBe(true);
      expect(canAccessExternalPlatform(dayDu, 'douyin')).toBe(false);
    });

    it('User chỉ được cấp TikTok và Facebook thì không vào được Douyin hoặc tab All', () => {
      expect(canAccessExternalPlatform(mockTikTokUser, 'tiktok')).toBe(true);
      expect(canAccessExternalPlatform(mockTikTokUser, 'facebook')).toBe(true);
      expect(canAccessExternalPlatform(mockTikTokUser, 'douyin')).toBe(false);
      expect(canAccessExternalPlatform(mockTikTokUser, 'all')).toBe(false);
    });
  });

  describe('canAccessInternalPlatform() & filterAllowedInternalPlatforms()', () => {
    it('Admin truy cập được tất cả các tab Kênh nội bộ', () => {
      expect(canAccessInternalPlatform(mockAdminUser, 'all')).toBe(true);
      expect(canAccessInternalPlatform(mockAdminUser, 'facebook')).toBe(true);
      expect(canAccessInternalPlatform(mockAdminUser, 'tiktok')).toBe(true);
      expect(canAccessInternalPlatform(mockAdminUser, 'threads')).toBe(true);
      expect(filterAllowedInternalPlatforms(mockAdminUser, sampleInternalPlatforms)).toHaveLength(sampleInternalPlatforms.length);
    });

    it('User chỉ có quyền social:internal:facebook thì CHỈ thấy tab Facebook', () => {
      expect(canAccessInternalPlatform(mockInternalFbUser, 'facebook')).toBe(true);
      expect(canAccessInternalPlatform(mockInternalFbUser, 'tiktok')).toBe(false);
      expect(canAccessInternalPlatform(mockInternalFbUser, 'all')).toBe(false);
      expect(canAccessInternalPlatform(mockInternalFbUser, 'threads')).toBe(false);

      const visible = filterAllowedInternalPlatforms(mockInternalFbUser, sampleInternalPlatforms);
      expect(visible.map(t => t.id)).toEqual(['facebook']);
    });

    it('User có quyền xem tab Tất cả kênh nội bộ social:internal:view', () => {
      const allInternalUser: User = {
        ...mockInternalFbUser,
        permissions: ['social:internal:view', 'social:internal:tiktok'],
      };
      expect(canAccessInternalPlatform(allInternalUser, 'all')).toBe(true);
      expect(canAccessInternalPlatform(allInternalUser, 'tiktok')).toBe(true);
      expect(canAccessInternalPlatform(allInternalUser, 'facebook')).toBe(false);

      const visible = filterAllowedInternalPlatforms(allInternalUser, sampleInternalPlatforms);
      expect(visible.map(t => t.id)).toEqual(['all', 'tiktok']);
    });
  });

  describe('filterAllowedPlatforms()', () => {
    it('Admin thấy đầy đủ 100% các tab', () => {
      const allowed = filterAllowedPlatforms(mockAdminUser, samplePlatforms);
      expect(allowed.map((p) => p.id)).toEqual(['all', 'facebook', 'tiktok', 'douyin', 'xiaohongshu']);
    });

    it('chỉ có quyền tab tổng hợp thì CHỈ thấy đúng tab "Tất cả"', () => {
      const allowed = filterAllowedPlatforms(mockAllPlatformsUser, samplePlatforms);
      expect(allowed.map((p) => p.id)).toEqual(['all']);
    });

    it('cấp tab tổng hợp + 2 nền tảng thì thấy đúng 3 tab', () => {
      const dayDu: User = {
        ...mockAllPlatformsUser,
        permissions: ['social:external:all', 'social:external:tiktok', 'social:external:douyin'],
      };
      expect(filterAllowedPlatforms(dayDu, samplePlatforms).map((p) => p.id))
        .toEqual(['all', 'tiktok', 'douyin']);
    });

    it('chỉ cấp TikTok thì không thấy tab "Tất cả"', () => {
      const chiTikTok: User = { ...mockAllPlatformsUser, permissions: ['social:external:tiktok'] };
      expect(filterAllowedPlatforms(chiTikTok, samplePlatforms).map((p) => p.id)).toEqual(['tiktok']);
    });

    it('User chỉ có TikTok và Facebook chỉ thấy đúng 2 tab đó', () => {
      const allowed = filterAllowedPlatforms(mockTikTokUser, samplePlatforms);
      expect(allowed.map((p) => p.id)).toEqual(['facebook', 'tiktok']);
    });
  });

  describe('canAccessRoute()', () => {
    it('chặn user không có bất kỳ quyền nội bộ nào vào Kênh nội bộ', () => {
      const userChiKenhNgoai: User = {
        ...mockTikTokUser,
        permissions: ['social:external:tiktok'],
      };
      expect(canAccessRoute(userChiKenhNgoai, '/dashboard/internalChannels')).toBe(false);
      expect(canAccessRoute(mockInternalFbUser, '/dashboard/internalChannels')).toBe(true);
    });

    it('cho phép vào route khi khớp quyền chi tiết (tasks:kpi)', () => {
      const kpiUser: User = {
        ...mockTikTokUser,
        permissions: ['tasks:kpi'],
      };
      expect(canAccessRoute(kpiUser, '/dashboard/task-auto/kpi')).toBe(true);
      expect(canAccessRoute(kpiUser, '/dashboard/task-auto/catalog')).toBe(false);
    });
  });

  describe('Permission Tree Configuration & Presets', () => {
    const {
      PERMISSION_TREE,
      DEFAULT_PERMISSIONS_BY_ROLE,
      getDefaultPermissionsForRole,
      getNodeAndDescendantIds,
      getAllLeafPermissions,
    } = require('@/config/permission-tree');

    it('getAllLeafPermissions() trả về danh sách các quyền lá', () => {
      const leafPerms = getAllLeafPermissions();
      expect(leafPerms.length).toBeGreaterThan(30);
      expect(leafPerms).toContain('social:external:facebook');
      expect(leafPerms).toContain('social:internal:facebook');
      expect(leafPerms).toContain('equipment:approval:manage');
      expect(leafPerms).toContain('publishing:bulk');
      expect(leafPerms).toContain('portal:hr:manage');
    });

    it('getNodeAndDescendantIds() lấy đúng id node và tất cả id con', () => {
      const socialGroup = PERMISSION_TREE.find((g: any) => g.id === 'social')!;
      const externalNode = socialGroup.nodes.find((n: any) => n.id === 'social:external')!;
      const allIds = getNodeAndDescendantIds(externalNode);
      expect(allIds).toContain('social:external');
      expect(allIds).toContain('social:external:all');
      expect(allIds).toContain('social:external:tiktok');
      expect(allIds).toContain('social:external:crawl_all');
    });

    it('mỗi vai trò trong ô "Vai trò" đều có bộ quyền mặc định', () => {
      for (const role of ['ADMIN', 'MANAGER', 'LEADER', 'MEMBER']) {
        expect(DEFAULT_PERMISSIONS_BY_ROLE[role].length).toBeGreaterThan(0);
      }
    });

    it('vai trò càng cao quyền mặc định càng nhiều, Member không có quyền cào tay', () => {
      const member: string[] = getDefaultPermissionsForRole('MEMBER');
      const leader: string[] = getDefaultPermissionsForRole('LEADER');

      expect(member).not.toContain('social:external:crawl_all');
      expect(leader).toContain('social:external:crawl_all');
      expect(member).not.toContain('portal:hr:manage');
      expect(leader.length).toBeGreaterThan(member.length);
    });

    it('vai trò lạ rơi về bộ quyền của Member cho an toàn', () => {
      expect(getDefaultPermissionsForRole('KHONG_TON_TAI')).toEqual(
        getDefaultPermissionsForRole('MEMBER'),
      );
    });

    it('mọi quyền mặc định của vai trò đều phải tồn tại thật trong cây', () => {
      const leafPerms: string[] = getAllLeafPermissions();
      for (const [role, perms] of Object.entries(DEFAULT_PERMISSIONS_BY_ROLE)) {
        const unknown = (perms as string[]).filter((p) => !leafPerms.includes(p));
        expect({ role, unknown }).toEqual({ role, unknown: [] });
      }
    });
  });
});
