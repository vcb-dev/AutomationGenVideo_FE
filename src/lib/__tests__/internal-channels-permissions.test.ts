import { User, UserRole } from '@/types/auth';
import { canAccessInternalPlatform, filterAllowedInternalPlatforms } from '../permissions';

describe('Internal Channels RBAC Platform Filtering', () => {
  const mockAdmin: User = {
    id: 'u-admin',
    email: 'admin@vcbi.vn',
    full_name: 'Admin User',
    roles: [UserRole.ADMIN],
    permissions: [],
    is_active: true,
    total_login_count: 1,
    total_action_count: 10,
    created_at: '',
    updated_at: '',
  };

  const mockUserFacebookOnly: User = {
    id: 'u-fb',
    email: 'fb@vcbi.vn',
    full_name: 'FB User',
    roles: [UserRole.MEMBER],
    permissions: ['social:internal:facebook'],
    is_active: true,
    total_login_count: 1,
    total_action_count: 10,
    created_at: '',
    updated_at: '',
  };

  const mockUserTikTokOnly: User = {
    id: 'u-tt',
    email: 'tt@vcbi.vn',
    full_name: 'TikTok User',
    roles: [UserRole.MEMBER],
    permissions: ['social:internal:tiktok'],
    is_active: true,
    total_login_count: 1,
    total_action_count: 10,
    created_at: '',
    updated_at: '',
  };

  const mockUserAllTabsOnly: User = {
    id: 'u-all',
    email: 'all@vcbi.vn',
    full_name: 'All Tabs User',
    roles: [UserRole.MEMBER],
    permissions: ['social:internal:view'],
    is_active: true,
    total_login_count: 1,
    total_action_count: 10,
    created_at: '',
    updated_at: '',
  };

  const mockUserMultiPlatforms: User = {
    id: 'u-multi',
    email: 'multi@vcbi.vn',
    full_name: 'Multi Platform User',
    roles: [UserRole.MEMBER],
    permissions: ['social:internal:facebook', 'social:internal:instagram', 'social:internal:youtube'],
    is_active: true,
    total_login_count: 1,
    total_action_count: 10,
    created_at: '',
    updated_at: '',
  };

  const sampleInternalTabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'threads', label: 'Threads' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'douyin', label: 'Douyin' },
    { id: 'xiaohongshu', label: 'XiaoHongShu' },
  ];

  describe('canAccessInternalPlatform()', () => {
    it('Admin luôn có quyền truy cập tất cả nền tảng nội bộ', () => {
      expect(canAccessInternalPlatform(mockAdmin, 'all')).toBe(true);
      expect(canAccessInternalPlatform(mockAdmin, 'facebook')).toBe(true);
      expect(canAccessInternalPlatform(mockAdmin, 'tiktok')).toBe(true);
      expect(canAccessInternalPlatform(mockAdmin, 'threads')).toBe(true);
      expect(canAccessInternalPlatform(mockAdmin, 'douyin')).toBe(true);
      expect(canAccessInternalPlatform(mockAdmin, 'xiaohongshu')).toBe(true);
    });

    it('User chỉ có quyền social:internal:facebook thì CHỈ vào được Facebook', () => {
      expect(canAccessInternalPlatform(mockUserFacebookOnly, 'facebook')).toBe(true);
      expect(canAccessInternalPlatform(mockUserFacebookOnly, 'all')).toBe(false);
      expect(canAccessInternalPlatform(mockUserFacebookOnly, 'tiktok')).toBe(false);
      expect(canAccessInternalPlatform(mockUserFacebookOnly, 'instagram')).toBe(false);
      expect(canAccessInternalPlatform(mockUserFacebookOnly, 'threads')).toBe(false);
      expect(canAccessInternalPlatform(mockUserFacebookOnly, 'youtube')).toBe(false);
    });

    it('User có quyền social:internal:view thì CHỈ mở tab Tất cả, không mở lẻ các tab con', () => {
      expect(canAccessInternalPlatform(mockUserAllTabsOnly, 'all')).toBe(true);
      expect(canAccessInternalPlatform(mockUserAllTabsOnly, 'facebook')).toBe(false);
      expect(canAccessInternalPlatform(mockUserAllTabsOnly, 'tiktok')).toBe(false);
    });

    it('User có nhiều nền tảng thì vào đúng các nền tảng được cấp', () => {
      expect(canAccessInternalPlatform(mockUserMultiPlatforms, 'facebook')).toBe(true);
      expect(canAccessInternalPlatform(mockUserMultiPlatforms, 'instagram')).toBe(true);
      expect(canAccessInternalPlatform(mockUserMultiPlatforms, 'youtube')).toBe(true);
      expect(canAccessInternalPlatform(mockUserMultiPlatforms, 'tiktok')).toBe(false);
      expect(canAccessInternalPlatform(mockUserMultiPlatforms, 'threads')).toBe(false);
      expect(canAccessInternalPlatform(mockUserMultiPlatforms, 'all')).toBe(false);
    });

    it('Wildcard toàn cục * mở tất cả các tab', () => {
      const wildcardUser: User = { ...mockUserFacebookOnly, permissions: ['*'] };
      expect(canAccessInternalPlatform(wildcardUser, 'all')).toBe(true);
      expect(canAccessInternalPlatform(wildcardUser, 'facebook')).toBe(true);
      expect(canAccessInternalPlatform(wildcardUser, 'tiktok')).toBe(true);
      expect(canAccessInternalPlatform(wildcardUser, 'threads')).toBe(true);
    });

    it('Tài khoản cũ chưa gán permissions chi tiết (rỗng) fallback mở tất cả cho tương thích', () => {
      const legacyUser: User = { ...mockUserFacebookOnly, permissions: [] };
      expect(canAccessInternalPlatform(legacyUser, 'all')).toBe(true);
      expect(canAccessInternalPlatform(legacyUser, 'facebook')).toBe(true);
      expect(canAccessInternalPlatform(legacyUser, 'tiktok')).toBe(true);
    });

    it('Trả về false khi user là null hoặc undefined', () => {
      expect(canAccessInternalPlatform(null, 'facebook')).toBe(false);
      expect(canAccessInternalPlatform(undefined, 'facebook')).toBe(false);
    });
  });

  describe('filterAllowedInternalPlatforms()', () => {
    it('Admin thấy đầy đủ toàn bộ 8 tabs', () => {
      const visible = filterAllowedInternalPlatforms(mockAdmin, sampleInternalTabs);
      expect(visible.map(t => t.id)).toEqual([
        'all', 'facebook', 'tiktok', 'instagram', 'threads', 'youtube', 'douyin', 'xiaohongshu'
      ]);
    });

    it('User chỉ có quyền Facebook thì CHỈ thấy tab Facebook', () => {
      const visible = filterAllowedInternalPlatforms(mockUserFacebookOnly, sampleInternalTabs);
      expect(visible.map(t => t.id)).toEqual(['facebook']);
    });

    it('User chỉ có quyền TikTok thì CHỈ thấy tab TikTok', () => {
      const visible = filterAllowedInternalPlatforms(mockUserTikTokOnly, sampleInternalTabs);
      expect(visible.map(t => t.id)).toEqual(['tiktok']);
    });

    it('User có quyền xem tab Tất cả thì CHỈ thấy tab Tất cả', () => {
      const visible = filterAllowedInternalPlatforms(mockUserAllTabsOnly, sampleInternalTabs);
      expect(visible.map(t => t.id)).toEqual(['all']);
    });

    it('User có quyền Facebook, Instagram, YouTube thấy đúng 3 tabs', () => {
      const visible = filterAllowedInternalPlatforms(mockUserMultiPlatforms, sampleInternalTabs);
      expect(visible.map(t => t.id)).toEqual(['facebook', 'instagram', 'youtube']);
    });

    it('User không có quyền nào thì danh sách rỗng', () => {
      const noPermUser: User = { ...mockUserFacebookOnly, permissions: ['tasks:list'] };
      const visible = filterAllowedInternalPlatforms(noPermUser, sampleInternalTabs);
      expect(visible).toHaveLength(0);
    });
  });
});
