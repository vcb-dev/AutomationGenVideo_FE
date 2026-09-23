import { User, UserRole } from '@/types/auth';
import {
  filterAllowedPlatforms,
  filterAllowedInternalPlatforms,
  canAccessExternalPlatform,
  canAccessInternalPlatform,
} from '../permissions';

const SAMPLE_EXTERNAL_PLATFORMS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'douyin', label: 'Douyin' },
  { id: 'xiaohongshu', label: 'XiaoHongShu' },
  { id: 'kuaishou', label: 'KuaiShou' },
  { id: 'bilibili', label: 'Bilibili' },
];

const SAMPLE_INTERNAL_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'threads', label: 'Threads' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'douyin', label: 'Douyin' },
  { id: 'xiaohongshu', label: 'XiaoHongShu' },
];

function createUser(roles: UserRole[], permissions?: string[]): User {
  return {
    id: 'u-tab-test',
    email: 'test@vcbi.vn',
    full_name: 'Test Tab User',
    roles,
    permissions,
    is_active: true,
    total_login_count: 1,
    total_action_count: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

describe('Kiểm tra bộ lọc Tabs và Phân quyền Nền tảng (External & Internal Channels)', () => {
  describe('1. Kênh ngoài (External Channels Tabs)', () => {
    it('Admin nhìn thấy toàn bộ 9 nền tảng', () => {
      const admin = createUser([UserRole.ADMIN], []);
      const visible = filterAllowedPlatforms(admin, SAMPLE_EXTERNAL_PLATFORMS);
      expect(visible).toHaveLength(9);
      expect(visible.map(p => p.id)).toEqual(SAMPLE_EXTERNAL_PLATFORMS.map(p => p.id));
    });

    it('Tài khoản cũ (chưa cấu hình permissions) nhìn thấy toàn bộ nền tảng', () => {
      const legacy = createUser([UserRole.MEMBER], []);
      const visible = filterAllowedPlatforms(legacy, SAMPLE_EXTERNAL_PLATFORMS);
      expect(visible).toHaveLength(9);
    });

    it('Nhân sự chỉ được cấp TikTok: tab bar chỉ hiển thị duy nhất TikTok', () => {
      const tiktokUser = createUser([UserRole.MEMBER], ['social:external:tiktok']);
      const visible = filterAllowedPlatforms(tiktokUser, SAMPLE_EXTERNAL_PLATFORMS);
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe('tiktok');
    });

    it('Nhân sự được cấp quyền social:external:all: nhìn thấy tab Tất cả và các nền tảng', () => {
      const allUser = createUser([UserRole.MEMBER], ['social:external:all']);
      expect(canAccessExternalPlatform(allUser, 'all')).toBe(true);
      expect(filterAllowedPlatforms(allUser, SAMPLE_EXTERNAL_PLATFORMS)).toHaveLength(1);
    });

    it('Nhân sự được cấp kết hợp TikTok và Douyin', () => {
      const multi = createUser([UserRole.MEMBER], [
        'social:external:tiktok',
        'social:external:douyin',
      ]);
      const visible = filterAllowedPlatforms(multi, SAMPLE_EXTERNAL_PLATFORMS);
      expect(visible.map(p => p.id)).toEqual(['tiktok', 'douyin']);
    });
  });

  describe('2. Kênh nội bộ (Internal Channels Tabs)', () => {
    it('Admin nhìn thấy toàn bộ 8 tabs', () => {
      const admin = createUser([UserRole.ADMIN], []);
      const visible = filterAllowedInternalPlatforms(admin, SAMPLE_INTERNAL_TABS);
      expect(visible).toHaveLength(8);
    });

    it('Nhân sự chỉ được cấp Threads: tab bar chỉ hiển thị duy nhất Threads', () => {
      const threadsUser = createUser([UserRole.MEMBER], ['social:internal:threads']);
      const visible = filterAllowedInternalPlatforms(threadsUser, SAMPLE_INTERNAL_TABS);
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe('threads');
      expect(canAccessInternalPlatform(threadsUser, 'threads')).toBe(true);
      expect(canAccessInternalPlatform(threadsUser, 'facebook')).toBe(false);
      expect(canAccessInternalPlatform(threadsUser, 'all')).toBe(false);
    });

    it('Nhân sự có social:internal:view mở được tab "all"', () => {
      const viewUser = createUser([UserRole.MEMBER], ['social:internal:view']);
      expect(canAccessInternalPlatform(viewUser, 'all')).toBe(true);
      const visible = filterAllowedInternalPlatforms(viewUser, SAMPLE_INTERNAL_TABS);
      expect(visible.map(p => p.id)).toContain('all');
    });

    it('Người dùng chưa đăng nhập (user = null) trả về danh sách rỗng', () => {
      expect(filterAllowedPlatforms(null, SAMPLE_EXTERNAL_PLATFORMS)).toEqual([]);
      expect(filterAllowedInternalPlatforms(null, SAMPLE_INTERNAL_TABS)).toEqual([]);
    });
  });

  describe('3. Logic điều hướng tự động khi không có quyền ở active tab', () => {
    it('Khi nhân sự chỉ có quyền TikTok nhưng đang đứng ở tab "all" -> nền tảng hợp lệ đầu tiên là "tiktok"', () => {
      const tiktokUser = createUser([UserRole.MEMBER], ['social:external:tiktok']);
      const visible = filterAllowedPlatforms(tiktokUser, SAMPLE_EXTERNAL_PLATFORMS);
      const currentActive = 'all';

      // Kiểm tra tab hiện tại có được phép không
      const canAccessCurrent = canAccessExternalPlatform(tiktokUser, currentActive);
      expect(canAccessCurrent).toBe(false);

      // Nền tảng tự động chuyển về
      const fallbackTarget = visible[0].id;
      expect(fallbackTarget).toBe('tiktok');
    });

    it('Khi nhân sự chỉ có quyền Threads nhưng đang đứng ở tab "facebook" -> tự động chuyển về "threads"', () => {
      const threadsUser = createUser([UserRole.MEMBER], ['social:internal:threads']);
      const visible = filterAllowedInternalPlatforms(threadsUser, SAMPLE_INTERNAL_TABS);
      const currentActive = 'facebook';

      const canAccessCurrent = canAccessInternalPlatform(threadsUser, currentActive);
      expect(canAccessCurrent).toBe(false);

      const fallbackTarget = visible[0].id;
      expect(fallbackTarget).toBe('threads');
    });
  });
});
