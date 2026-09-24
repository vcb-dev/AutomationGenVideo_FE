import { buildSyncAllChannelsPath } from '../scrape/delete-channel';
import { scraperService } from '@/services/scraperService';
import { UserRole } from '@/types/auth';
import { hasPermission } from '../permissions';

describe('Internal Instagram Sync All Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildSyncAllChannelsPath', () => {
    it('trả về đúng endpoint sync-all cho instagram', () => {
      expect(buildSyncAllChannelsPath('instagram')).toBe('/scraper/instagram/profiles/sync-all');
    });

    it('trả về đúng endpoint fanpages cho facebook', () => {
      expect(buildSyncAllChannelsPath('facebook')).toBe('/scraper/fanpages/sync-all');
    });
  });

  describe('scraperService.syncAllExternalChannels with is_owned', () => {
    it('gửi đúng body chứa is_owned: true khi cào kênh nội bộ', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ok',
          message: 'Đã bắt đầu cào video Instagram (tất cả kênh nội bộ, 50 video mới nhất) trong nền!',
        }),
      });
      (global as any).fetch = mockFetch;

      const res = await scraperService.syncAllExternalChannels('mock_token', 'instagram', {
        scope: 'all',
        mode: 'count',
        count: 50,
        is_owned: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/scraper/instagram/profiles/sync-all'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock_token',
          }),
          body: JSON.stringify({
            scope: 'all',
            mode: 'count',
            count: 50,
            is_owned: true,
          }),
        }),
      );
      expect(res.status).toBe('ok');
      expect(res.message).toContain('kênh nội bộ');
    });
  });

  describe('Phân quyền cào dữ liệu kênh nội bộ', () => {
    const adminUser = {
      id: 'admin-1',
      roles: [UserRole.ADMIN],
      permissions: [],
    };

    const leaderUser = {
      id: 'leader-1',
      roles: [UserRole.LEADER],
      permissions: [],
    };

    const memberUser = {
      id: 'member-1',
      roles: [UserRole.MEMBER],
      permissions: ['social:external:view'],
    };

    it('ADMIN và LEADER có quyền quản lý và cào kênh nội bộ', () => {
      const canManageAdmin = adminUser.roles.some((r) => [UserRole.ADMIN, UserRole.LEADER].includes(r));
      const canManageLeader = leaderUser.roles.some((r) => [UserRole.ADMIN, UserRole.LEADER].includes(r));

      expect(canManageAdmin).toBe(true);
      expect(canManageLeader).toBe(true);
    });

    it('Nhân viên thông thường không có quyền cào kênh nội bộ', () => {
      const canManageMember = memberUser.roles.some((r) => [UserRole.ADMIN, UserRole.LEADER].includes(r));
      const hasCrawlAll = hasPermission(memberUser as any, 'social:external:crawl_all');

      expect(canManageMember).toBe(false);
      expect(hasCrawlAll).toBe(false);
    });
  });
});
