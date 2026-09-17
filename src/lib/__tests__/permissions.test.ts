import { User, UserRole } from '@/types/auth';
import {
  checkPermissionMatch,
  hasPermission,
  canAccessExternalPlatform,
  filterAllowedPlatforms,
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
      // 1. Member có quyền xem tất cả nền tảng (social:external:all) -> KHÔNG ĐƯỢC CÀO TAY
      expect(hasPermission(mockAllPlatformsUser, 'social:external:crawl_all')).toBe(false);

      // 2. Member chỉ có TikTok/Facebook -> KHÔNG ĐƯỢC CÀO TAY
      expect(hasPermission(mockTikTokUser, 'social:external:crawl_all')).toBe(false);

      // 3. Member tài khoản mới hoặc cũ chưa có permissions (rỗng) -> KHÔNG ĐƯỢC CÀO TAY
      const blankMember: User = { ...mockTikTokUser, permissions: [] };
      expect(hasPermission(blankMember, 'social:external:crawl_all')).toBe(false);

      // 4. Member được Admin cấp ĐÍCH DANH quyền cào tay -> ĐƯỢC CÀO TAY
      const memberWithCrawl: User = { ...mockTikTokUser, permissions: ['social:external:crawl_all'] };
      expect(hasPermission(memberWithCrawl, 'social:external:crawl_all')).toBe(true);

      // 5. Admin luôn được cào tay
      expect(hasPermission(mockAdminUser, 'social:external:crawl_all')).toBe(true);
    });
  });

  describe('canAccessExternalPlatform()', () => {
    it('Admin truy cập được tất cả nền tảng', () => {
      expect(canAccessExternalPlatform(mockAdminUser, 'all')).toBe(true);
      expect(canAccessExternalPlatform(mockAdminUser, 'douyin')).toBe(true);
      expect(canAccessExternalPlatform(mockAdminUser, 'tiktok')).toBe(true);
    });

    it('User có social:external:all truy cập được tab all và mọi nền tảng con', () => {
      expect(canAccessExternalPlatform(mockAllPlatformsUser, 'all')).toBe(true);
      expect(canAccessExternalPlatform(mockAllPlatformsUser, 'douyin')).toBe(true);
      expect(canAccessExternalPlatform(mockAllPlatformsUser, 'tiktok')).toBe(true);
      expect(canAccessExternalPlatform(mockAllPlatformsUser, 'facebook')).toBe(true);
    });

    it('User chỉ được cấp TikTok và Facebook thì không vào được Douyin hoặc tab All', () => {
      expect(canAccessExternalPlatform(mockTikTokUser, 'tiktok')).toBe(true);
      expect(canAccessExternalPlatform(mockTikTokUser, 'facebook')).toBe(true);
      expect(canAccessExternalPlatform(mockTikTokUser, 'douyin')).toBe(false);
      expect(canAccessExternalPlatform(mockTikTokUser, 'all')).toBe(false);
    });
  });

  describe('filterAllowedPlatforms()', () => {
    it('Admin thấy đầy đủ 100% các tab', () => {
      const allowed = filterAllowedPlatforms(mockAdminUser, samplePlatforms);
      expect(allowed.map((p) => p.id)).toEqual(['all', 'facebook', 'tiktok', 'douyin', 'xiaohongshu']);
    });

    it('User có quyền all thấy đầy đủ các tab', () => {
      const allowed = filterAllowedPlatforms(mockAllPlatformsUser, samplePlatforms);
      expect(allowed.map((p) => p.id)).toEqual(['all', 'facebook', 'tiktok', 'douyin', 'xiaohongshu']);
    });

    it('User chỉ có TikTok và Facebook chỉ thấy đúng 2 tab đó', () => {
      const allowed = filterAllowedPlatforms(mockTikTokUser, samplePlatforms);
      expect(allowed.map((p) => p.id)).toEqual(['facebook', 'tiktok']);
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
      expect(leafPerms.length).toBeGreaterThan(10);
      expect(leafPerms).toContain('social:external:facebook');
      expect(leafPerms).toContain('social:external:tiktok');
      expect(leafPerms).toContain('social:external:crawl_all');
      expect(leafPerms).toContain('portal:hr:manage');
    });

    it('getNodeAndDescendantIds() lấy đúng id node và tất cả id con', () => {
      const externalNode = PERMISSION_TREE[0].nodes.find((n: any) => n.id === 'social:external');
      const allIds = getNodeAndDescendantIds(externalNode);
      expect(allIds).toContain('social:external');
      expect(allIds).toContain('social:external:all');
      expect(allIds).toContain('social:external:tiktok');
      expect(allIds).toContain('social:external:crawl_all');
    });

    it('mỗi vai trò trong ô "Vai trò" đều có bộ quyền mặc định', () => {
      // Đúng 4 lựa chọn của dropdown Vai trò — không còn danh sách preset riêng nữa.
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

    it('getLeafIds() chỉ trả về quyền lá, không kèm id node nhóm', () => {
      const { getLeafIds } = require('@/config/permission-tree');
      const externalNode = PERMISSION_TREE[0].nodes.find((n: any) => n.id === 'social:external');
      const leafIds = getLeafIds(externalNode);

      expect(leafIds).not.toContain('social:external');
      expect(leafIds).toContain('social:external:tiktok');
      expect(leafIds).toContain('social:external:crawl_all');
    });

    it('mọi quyền mặc định của vai trò đều phải tồn tại thật trong cây', () => {
      const leafPerms: string[] = getAllLeafPermissions();
      for (const [role, perms] of Object.entries(DEFAULT_PERMISSIONS_BY_ROLE)) {
        const unknown = (perms as string[]).filter((p) => !leafPerms.includes(p));
        expect({ role, unknown }).toEqual({ role, unknown: [] });
      }
    });
  });

  describe('Các tình huống biên khi vận hành thật', () => {
    const blankMember: User = { ...mockTikTokUser, permissions: [] };
    const oldManager: User = { ...mockTikTokUser, roles: [UserRole.MANAGER], permissions: [] };
    const oldLeader: User = { ...mockTikTokUser, roles: [UserRole.LEADER], permissions: [] };

    it('Leader cũ (chưa cấu hình quyền) vẫn cào tay được, Member cũ thì không', () => {
      expect(hasPermission(oldLeader, 'social:external:crawl_all')).toBe(true);
      expect(hasPermission(oldManager, 'social:external:crawl_all')).toBe(true);
      expect(hasPermission(blankMember, 'social:external:crawl_all')).toBe(false);
    });

    it('Leader được gán gói quyền không có cào tay thì MẤT quyền cào tay', () => {
      // Quyền chi tiết một khi đã cấu hình sẽ lấn át mặc định theo role — Admin cần biết điều này
      // khi bấm preset "Chuyên viên Content" cho một Leader.
      const restrictedLeader: User = {
        ...oldLeader,
        permissions: ['social:external:all', 'social:library:view'],
      };
      expect(hasPermission(restrictedLeader, 'social:external:crawl_all')).toBe(false);
    });

    it('quyền "Đề xuất" cũng không được thừa hưởng ngầm từ social:external:all', () => {
      expect(hasPermission(mockAllPlatformsUser, 'social:external:propose')).toBe(false);
      const withPropose: User = { ...mockTikTokUser, permissions: ['social:external:propose'] };
      expect(hasPermission(withPropose, 'social:external:propose')).toBe(true);
    });

    it('wildcard toàn cục * mở được quyền nhạy cảm, nhưng social:* thì không', () => {
      expect(checkPermissionMatch(['*'], 'social:external:crawl_all')).toBe(true);
      expect(checkPermissionMatch(['social:*'], 'social:external:crawl_all')).toBe(false);
      // social:* vẫn mở được các quyền thường
      expect(checkPermissionMatch(['social:*'], 'social:external:tiktok')).toBe(true);
    });

    it('mảng quyền rỗng hoặc không hợp lệ luôn trả về false, không ném lỗi', () => {
      expect(checkPermissionMatch([], 'social:external:tiktok')).toBe(false);
      expect(checkPermissionMatch(undefined as any, 'social:external:tiktok')).toBe(false);
      expect(checkPermissionMatch(['social:external:tiktok'], 'quyen:khong:ton:tai')).toBe(false);
    });

    it('chưa đăng nhập / store chưa rehydrate thì không lộ tab nào', () => {
      expect(filterAllowedPlatforms(null, samplePlatforms)).toEqual([]);
      expect(filterAllowedPlatforms(undefined, samplePlatforms)).toEqual([]);
    });

    it('user chỉ được cấp quyền hành động, không cấp nền tảng nào thì không còn tab nào', () => {
      const actionOnlyUser: User = {
        ...mockTikTokUser,
        permissions: ['social:external:crawl_all'],
      };
      expect(filterAllowedPlatforms(actionOnlyUser, samplePlatforms)).toEqual([]);
    });
  });
});

