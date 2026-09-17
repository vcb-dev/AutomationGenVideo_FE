import { User, UserRole } from '@/types/auth';
import { canAccessRoute } from '../permissions';
import { ROUTE_PERMISSIONS, getRouteRuleForPath } from '@/config/permission-routes';
import { getAllLeafPermissions, PERMISSION_TREE, getLeafIds } from '@/config/permission-tree';

/**
 * Quét TOÀN BỘ bản đồ quyền, không chọn mẫu.
 *
 * Các bộ test trước chỉ chạm vài quyền tiêu biểu (social:external:*, tasks:list, crawl_all...).
 * Một mục bị map nhầm quyền — như tab `daily_report` từng bị gắn 'portal:reports:view' và suýt
 * chặn Member khỏi chỗ họ bắt buộc phải nộp báo cáo — sẽ không bị phát hiện nếu chỉ kiểm mẫu.
 * File này bắt buộc TỪNG dòng trong ROUTE_PERMISSIONS phải tự chứng minh.
 */

function userWith(permissions: string[]): User {
  return {
    id: 'u', email: 'u@vcbi.vn', full_name: 'U',
    roles: [UserRole.MEMBER], permissions,
    is_active: true, total_login_count: 0, total_action_count: 0,
    created_at: '', updated_at: '',
  };
}

/** Dựng lại href đại diện cho một dòng luật (kèm ?tab= nếu có). */
const hrefOf = (r: { prefix: string; tab?: string }) => (r.tab ? `${r.prefix}?tab=${r.tab}` : r.prefix);

describe('Quét toàn bộ bản đồ đường dẫn → quyền', () => {
  it('có đủ số dòng luật để quét (chặn trường hợp file rỗng làm test xanh giả)', () => {
    expect(ROUTE_PERMISSIONS.length).toBeGreaterThanOrEqual(40);
  });

  it.each(ROUTE_PERMISSIONS.map((r) => [hrefOf(r), r.permission] as const))(
    'CÓ quyền %s → vào được',
    (href, permission) => {
      expect(canAccessRoute(userWith([permission]), href)).toBe(true);
    },
  );

  it.each(ROUTE_PERMISSIONS.map((r) => [hrefOf(r), r.permission] as const))(
    'KHÔNG có quyền %s → bị chặn',
    (href, permission) => {
      // Cấp một quyền không liên quan để user vẫn "đã cấu hình quyền" (mới bật cơ chế lọc).
      const khongLienQuan = permission === 'tools:lucky_spin:play' ? 'tools:ai:voice' : 'tools:lucky_spin:play';
      const rule = getRouteRuleForPath(href);

      // Mục có anyOfPrefix: chỉ chặn được khi quyền cầm tay KHÔNG thuộc nhóm đó.
      if (rule?.anyOfPrefix && khongLienQuan.startsWith(rule.anyOfPrefix)) return;

      expect(canAccessRoute(userWith([khongLienQuan]), href)).toBe(false);
    },
  );

  it('mọi quyền trong bản đồ đều tồn tại thật trong cây quyền', () => {
    const leaves = getAllLeafPermissions();
    const la = ROUTE_PERMISSIONS.map((r) => r.permission).filter((p) => !leaves.includes(p));
    expect(Array.from(new Set(la))).toEqual([]);
  });

  it('không có hai dòng luật nào trùng hệt (prefix + tab) — trùng là một dòng chết', () => {
    const keys = ROUTE_PERMISSIONS.map((r) => `${r.prefix}::${r.tab ?? ''}`);
    expect(keys.length).toBe(new Set(keys).size);
  });
});

describe('Quét toàn bộ cây quyền', () => {
  const leaves = getAllLeafPermissions();

  it('không có mã quyền trùng nhau trong cây', () => {
    expect(leaves.length).toBe(new Set(leaves).size);
  });

  it('mọi mã quyền đều theo dạng nhóm:mục:hành_động, không có khoảng trắng', () => {
    for (const p of leaves) {
      expect(p).toMatch(/^[a-z_]+(:[a-z_]+)+$/);
    }
  });

  it('mỗi nhóm trong cây đều có ít nhất một quyền lá', () => {
    for (const group of PERMISSION_TREE) {
      const count = group.nodes.flatMap((n) => getLeafIds(n)).length;
      expect({ group: group.id, count: count > 0 }).toEqual({ group: group.id, count: true });
    }
  });

  it('cấp MỘT quyền bất kỳ không được mở thêm quyền nào khác ngoài nhóm của nó', () => {
    // Bắt các lỗi kiểu ':all' nuốt anh em — đúng lỗi vừa gặp ở social:external:all.
    const moRong: Array<{ cap: string; moThem: string[] }> = [];

    for (const p of leaves) {
      const u = userWith([p]);
      const moThem = ROUTE_PERMISSIONS
        .filter((r) => r.permission !== p)
        .filter((r) => {
          const rule = getRouteRuleForPath(hrefOf(r));
          // anyOfPrefix là mở rộng CÓ CHỦ ĐÍCH (vào khu vực khi có bất kỳ quyền con nào).
          if (rule?.anyOfPrefix && p.startsWith(rule.anyOfPrefix)) return false;
          return canAccessRoute(u, hrefOf(r));
        })
        .map((r) => `${hrefOf(r)}(${r.permission})`);

      if (moThem.length > 0) moRong.push({ cap: p, moThem });
    }

    expect(moRong).toEqual([]);
  });
});
