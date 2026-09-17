import { User, UserRole } from '@/types/auth';
import { canAccessRoute, filterNavMenusByPermissions, hasGranularPermissions } from '../permissions';
import { getRequiredPermissionForPath } from '@/config/permission-routes';
import { getDefaultPermissionsForRole } from '@/config/permission-tree';

/**
 * Đây là bộ test cho đúng lỗi người dùng báo: "cấp quyền xong đăng nhập vào vẫn thấy tất cả mục".
 *
 * Trước đây menu dựng từ cờ vai trò, không ai đọc mảng permissions, nên tick hay không tick đều
 * ra một kết quả. Bộ test dưới khoá lại cả hai chiều: mục không được cấp phải biến mất khỏi menu,
 * VÀ gõ thẳng URL của mục đó cũng phải bị chặn.
 */

function makeUser(roles: UserRole[], permissions?: string[]): User {
  return {
    id: 'u1',
    email: 'nhanvien@vcbi.vn',
    full_name: 'Nhân viên',
    roles,
    permissions,
    is_active: true,
    total_login_count: 1,
    total_action_count: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

const admin = makeUser([UserRole.ADMIN], []);
/** Tài khoản có sẵn từ trước, Admin chưa từng mở cây quyền ra tick. */
const legacyMember = makeUser([UserRole.MEMBER], []);
/** Đúng kịch bản người dùng mô tả: tạo tài khoản và CHỈ tick vài mục. */
const tiktokOnlyMember = makeUser([UserRole.MEMBER], [
  'social:external:tiktok',
  'tasks:list',
]);

describe('Bản đồ đường dẫn → quyền', () => {
  it('khớp tiền tố dài nhất, mục con không bị mục cha nuốt', () => {
    expect(getRequiredPermissionForPath('/dashboard/task-auto')).toBe('tasks:list');
    expect(getRequiredPermissionForPath('/dashboard/task-auto/kpi')).toBe('tasks:kpi');
    expect(getRequiredPermissionForPath('/dashboard/task-auto/my-catalog')).toBe('tasks:my_catalog');
    expect(getRequiredPermissionForPath('/dashboard/equipment')).toBe('equipment:stock:view');
    expect(getRequiredPermissionForPath('/dashboard/equipment/approvals')).toBe('equipment:approval:manage');
  });

  it('tách quyền theo tab trên trang hiệu suất dùng chung đường dẫn', () => {
    const base = '/dashboard/manager/user-activity';
    expect(getRequiredPermissionForPath(`${base}?tab=ranking`)).toBe('portal:performance:ranking');
    expect(getRequiredPermissionForPath(`${base}?tab=personal`)).toBe('portal:performance:view_self');
    expect(getRequiredPermissionForPath(`${base}?tab=daily_outstanding`)).toBe('portal:checklist:approve');
    // tab=daily_report là FORM NỘP báo cáo ngày của chính nhân sự (render ChecklistContainer),
    // nên phải dùng quyền tự nộp — không phải quyền xem báo cáo tổng hợp.
    expect(getRequiredPermissionForPath(`${base}?tab=daily_report&report=daily&type=traffic`))
      .toBe('portal:checklist:fill');
  });

  it('trang không khai báo quyền thì công khai với người đã đăng nhập', () => {
    expect(getRequiredPermissionForPath('/dashboard/khong-co-quyen')).toBeNull();
    expect(getRequiredPermissionForPath('/dashboard/ai')).toBeNull();
  });

  it('mỗi bài hướng dẫn đi theo phân hệ nó mô tả', () => {
    // Không có quyền dùng phân hệ thì bài hướng dẫn của nó cũng không hiện, tránh menu đầy
    // mục người dùng bấm vào chỉ để nhận trang "không có quyền".
    const chiKhamPha = makeUser([UserRole.MEMBER], ['social:external:tiktok']);

    expect(canAccessRoute(chiKhamPha, '/dashboard/user-guide/video-discovery')).toBe(true);
    expect(canAccessRoute(chiKhamPha, '/dashboard/user-guide/equipment')).toBe(false);
    expect(canAccessRoute(chiKhamPha, '/dashboard/user-guide/tasks')).toBe(false);
  });
});

describe('canAccessRoute — chặn gõ thẳng URL', () => {
  it('Admin vào được mọi nơi', () => {
    expect(canAccessRoute(admin, '/dashboard/admin')).toBe(true);
    expect(canAccessRoute(admin, '/dashboard/hr-management')).toBe(true);
  });

  it('tài khoản CŨ chưa cấu hình quyền giữ nguyên hành vi trước đây, không bị khoá', () => {
    // Đây là lớp bảo vệ quan trọng nhất khi deploy: hàng trăm tài khoản đang có permissions rỗng.
    expect(hasGranularPermissions(legacyMember)).toBe(false);
    expect(canAccessRoute(legacyMember, '/dashboard/task-auto')).toBe(true);
    expect(canAccessRoute(legacyMember, '/dashboard/equipment')).toBe(true);
  });

  it('tài khoản ĐÃ cấu hình quyền chỉ vào được đúng mục được cấp', () => {
    expect(canAccessRoute(tiktokOnlyMember, '/dashboard/task-auto')).toBe(true);
    expect(canAccessRoute(tiktokOnlyMember, '/dashboard/hr-management')).toBe(false);
    expect(canAccessRoute(tiktokOnlyMember, '/dashboard/equipment')).toBe(false);
    expect(canAccessRoute(tiktokOnlyMember, '/dashboard/social/compose')).toBe(false);
    expect(canAccessRoute(tiktokOnlyMember, '/dashboard/admin')).toBe(false);
  });

  it('chưa đăng nhập thì không vào được gì', () => {
    expect(canAccessRoute(null, '/dashboard/task-auto')).toBe(false);
  });

  it('cấp RIÊNG một nền tảng vẫn vào được Khám phá kênh ngoài', () => {
    // Trước đây đường dẫn này đòi đúng 'social:external:all', nên cấp mỗi TikTok là người dùng
    // không vào nổi khu vực — tick quyền xong vẫn như chưa cấp.
    const chiTikTok = makeUser([UserRole.MEMBER], ['social:external:tiktok']);
    expect(canAccessRoute(chiTikTok, '/dashboard/externalChannels')).toBe(true);
    expect(canAccessRoute(chiTikTok, '/dashboard/externalChannels/tiktok')).toBe(true);
  });

  it('không có quyền social:external nào thì vẫn bị chặn khỏi khu vực đó', () => {
    const khongCo = makeUser([UserRole.MEMBER], ['tasks:list']);
    expect(canAccessRoute(khongCo, '/dashboard/externalChannels')).toBe(false);
  });

  it('quyền có tiền tố gần giống không được tính nhầm', () => {
    // 'social:externalX:...' không thuộc nhóm 'social:external:'
    const ganGiong = makeUser([UserRole.MEMBER], ['social:externalX:tiktok']);
    expect(canAccessRoute(ganGiong, '/dashboard/externalChannels')).toBe(false);
  });

  it('Member mặc định không vào được trang quản trị và nhân sự', () => {
    const member = makeUser([UserRole.MEMBER], getDefaultPermissionsForRole('MEMBER'));
    expect(canAccessRoute(member, '/dashboard/admin')).toBe(false);
    expect(canAccessRoute(member, '/dashboard/hr-management')).toBe(false);
    expect(canAccessRoute(member, '/dashboard/equipment/approvals')).toBe(false);
    // nhưng vẫn làm được việc của mình
    expect(canAccessRoute(member, '/dashboard/task-auto')).toBe(true);
    expect(canAccessRoute(member, '/dashboard/social/compose')).toBe(true);
  });
});

describe('filterNavMenusByPermissions — ẩn mục khỏi thanh điều hướng', () => {
  const menus = [
    {
      id: 'vcb-portal',
      sections: [
        { section: 'Quản trị', items: [{ href: '/dashboard/admin' }, { href: '/dashboard/hr-management' }] },
        { section: 'Cá nhân', items: [{ href: '/dashboard/manager/user-activity?tab=personal' }] },
      ],
    },
    {
      id: 'tasks',
      sections: [{ section: 'Nhiệm vụ', items: [{ href: '/dashboard/task-auto' }] }],
    },
    {
      id: 'equipment',
      sections: [{ section: 'Thiết bị', items: [{ href: '/dashboard/equipment' }] }],
    },
  ];

  it('Admin thấy nguyên vẹn mọi menu', () => {
    expect(filterNavMenusByPermissions(admin, menus)).toHaveLength(3);
  });

  it('tài khoản cũ (chưa cấu hình quyền) thấy nguyên vẹn mọi menu', () => {
    expect(filterNavMenusByPermissions(legacyMember, menus)).toHaveLength(3);
  });

  it('tài khoản chỉ được cấp Nhiệm vụ thì CHỈ còn menu Nhiệm vụ', () => {
    const visible = filterNavMenusByPermissions(tiktokOnlyMember, menus);

    expect(visible.map((m) => m.id)).toEqual(['tasks']);
  });

  it('nhóm rỗng sau khi lọc bị bỏ, không để lại tiêu đề trống', () => {
    const hrOnly = makeUser([UserRole.MEMBER], ['portal:hr:manage']);
    const visible = filterNavMenusByPermissions(hrOnly, menus);

    expect(visible).toHaveLength(1);
    expect(visible[0].sections).toHaveLength(1);
    expect(visible[0].sections[0].items.map((i) => i.href)).toEqual(['/dashboard/hr-management']);
  });

  it('menu bấm thẳng (directHref) cũng bị xét quyền', () => {
    const directMenus = [
      { id: 'kho', directHref: '/dashboard/equipment', sections: [] },
      { id: 'viec', directHref: '/dashboard/task-auto', sections: [] },
    ];

    const visible = filterNavMenusByPermissions(tiktokOnlyMember, directMenus);
    expect(visible.map((m) => m.id)).toEqual(['viec']);
  });

  it('chưa đăng nhập thì không hiện menu nào', () => {
    expect(filterNavMenusByPermissions(null, menus)).toEqual([]);
  });

  describe('Mục mở bảng con (href rỗng) — chỗ từng làm lọt cả menu', () => {
    // Mục "Báo cáo" trong VCB Portal có href="" và chứa link thật trong subPanel. Coi href rỗng
    // là "trang công khai" khiến mục đó luôn sống, giữ nguyên nút menu gốc với dropdown RỖNG.
    const menusCoBangCon = [
      {
        id: 'vcb-portal',
        sections: [
          {
            section: 'Báo cáo',
            items: [
              {
                href: '',
                subPanel: [
                  { href: '/dashboard/manager/user-activity?tab=daily_report&report=daily&type=traffic' },
                  { href: '/dashboard/manager/user-activity?tab=daily_report&report=monthly' },
                ],
              },
            ],
          },
        ],
      },
    ];

    it('không có quyền nào trong bảng con thì ẩn luôn menu gốc', () => {
      const chiKhamPha = makeUser([UserRole.MEMBER], ['social:external:all']);

      expect(filterNavMenusByPermissions(chiKhamPha, menusCoBangCon)).toEqual([]);
    });

    it('có quyền thì giữ menu và chỉ giữ đúng thẻ con được phép', () => {
      const coBaoCao = makeUser([UserRole.MEMBER], ['portal:checklist:fill']);
      const visible = filterNavMenusByPermissions(coBaoCao, menusCoBangCon);

      expect(visible).toHaveLength(1);
      expect(visible[0].sections[0].items[0].subPanel).toHaveLength(2);
    });

    it('mục vừa không có href vừa không có bảng con thì bị bỏ', () => {
      const menusRong = [
        { id: 'x', sections: [{ section: 'S', items: [{ href: '' }] }] },
      ];
      const u = makeUser([UserRole.MEMBER], ['tasks:list']);

      expect(filterNavMenusByPermissions(u, menusRong)).toEqual([]);
    });
  });
});
