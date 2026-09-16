export interface PermissionNode {
  id: string;
  label: string;
  description?: string;
  children?: PermissionNode[];
}

export interface PermissionGroup {
  id: string;
  name: string;
  icon?: string;
  nodes: PermissionNode[];
}

export const PERMISSION_TREE: PermissionGroup[] = [
  {
    id: 'social',
    name: 'Khám phá Video & Mạng xã hội',
    nodes: [
      {
        id: 'social:external',
        label: 'Khám phá kênh ngoài (externalChannels)',
        description: 'Xem video, theo dõi kênh và cào dữ liệu từ các mạng xã hội',
        children: [
          {
            id: 'social:external:all',
            label: 'Xem Tất cả nền tảng (Tab "Tất cả")',
            description: 'Cho phép truy cập tab tổng hợp và toàn bộ nền tảng',
          },
          { id: 'social:external:facebook', label: 'Nền tảng Facebook' },
          { id: 'social:external:tiktok', label: 'Nền tảng TikTok' },
          { id: 'social:external:instagram', label: 'Nền tảng Instagram' },
          { id: 'social:external:youtube', label: 'Nền tảng YouTube' },
          { id: 'social:external:douyin', label: 'Nền tảng Douyin' },
          { id: 'social:external:xiaohongshu', label: 'Nền tảng XiaoHongShu (📕)' },
          { id: 'social:external:kuaishou', label: 'Nền tảng KuaiShou (⚡)' },
          { id: 'social:external:bilibili', label: 'Nền tảng Bilibili (📺)' },
          {
            id: 'social:external:crawl_all',
            label: 'Nút "Cào tay tất cả kênh"',
            description: 'Quyền kích hoạt cào dữ liệu hàng loạt cho các kênh',
          },
          {
            id: 'social:external:propose',
            label: 'Nút "Đề xuất" kịch bản video',
            description: 'Cho phép gửi đề xuất video về kho duyệt',
          },
        ],
      },
      {
        id: 'social:internal',
        label: 'Kênh nội bộ & Phân tích',
        children: [
          { id: 'social:internal:overview', label: 'Tổng quan kênh nội bộ' },
          { id: 'social:internal:view', label: 'Danh sách kênh nội bộ' },
        ],
      },
      {
        id: 'social:tools',
        label: 'Công cụ Khám phá & Nội dung',
        children: [
          { id: 'social:hub:search', label: 'Tìm kiếm Video Hub' },
          { id: 'social:library:view', label: 'Bộ sưu tập Video (Video Library)' },
          { id: 'social:content:translate', label: 'Dịch Content & Tạo kịch bản' },
        ],
      },
    ],
  },
  {
    id: 'publishing',
    name: 'Đăng bài Mạng xã hội',
    nodes: [
      {
        id: 'publishing:post',
        label: 'Soạn & Lên lịch đăng bài',
        children: [
          { id: 'publishing:compose', label: 'Soạn bài đăng' },
          { id: 'publishing:schedule', label: 'Lịch đăng & Hàng chờ' },
          { id: 'publishing:calendar', label: 'Lịch nội dung' },
          { id: 'publishing:history', label: 'Lịch sử đăng bài' },
        ],
      },
      {
        id: 'publishing:manage',
        label: 'Kênh & Thống kê',
        children: [
          { id: 'publishing:channels', label: 'Quản lý tài khoản kết nối' },
          { id: 'publishing:stats', label: 'Thống kê hiệu quả đăng bài' },
        ],
      },
    ],
  },
  {
    id: 'tasks',
    name: 'Nhiệm vụ & KPI',
    nodes: [
      {
        id: 'tasks:work',
        label: 'Công việc của tôi',
        children: [
          { id: 'tasks:list', label: 'Danh sách nhiệm vụ' },
          { id: 'tasks:my_catalog', label: 'Đầu việc của tôi' },
          { id: 'tasks:kpi', label: 'Xem KPI' },
        ],
      },
      {
        id: 'tasks:admin',
        label: 'Điều phối (Trưởng nhóm/Quản lý)',
        children: [
          { id: 'tasks:catalog', label: 'Danh mục đầu việc' },
          { id: 'tasks:teams', label: 'Quản lý đội nhóm nhiệm vụ' },
          { id: 'tasks:settings', label: 'Cấu hình nhiệm vụ' },
        ],
      },
    ],
  },
  {
    id: 'portal',
    name: 'VCB Portal (Hoạt động & Nhân sự)',
    nodes: [
      {
        id: 'portal:performance',
        label: 'Hiệu suất & Xếp hạng',
        children: [
          { id: 'portal:performance:view_self', label: 'Xem hiệu suất cá nhân' },
          { id: 'portal:performance:view_team', label: 'Xem hiệu suất toàn team / công ty' },
          { id: 'portal:performance:ranking', label: 'Xem bảng xếp hạng' },
        ],
      },
      {
        id: 'portal:checklist',
        label: 'Báo cáo & Checklist',
        children: [
          { id: 'portal:checklist:fill', label: 'Xem & Điền checklist hàng ngày' },
          { id: 'portal:checklist:approve', label: 'Duyệt vấn đề & checklist (Leader/Manager)' },
          { id: 'portal:reports:view', label: 'Xem báo cáo doanh thu & traffic' },
        ],
      },
      {
        id: 'portal:hr',
        label: 'Quản lý Nhân sự',
        children: [
          { id: 'portal:hr:view', label: 'Xem danh sách thành viên' },
          { id: 'portal:hr:manage', label: 'Cấp tài khoản & Phân quyền thành viên' },
          { id: 'portal:team:assign', label: 'Phân công kênh cho nhân sự' },
          { id: 'portal:editor:manage', label: 'Quản lý Editor' },
        ],
      },
      {
        id: 'portal:system',
        label: 'Bảng điều khiển quản trị',
        children: [
          { id: 'portal:admin:panel', label: 'Trang quản trị hệ thống (Admin)' },
          { id: 'portal:leader:panel', label: 'Trang điều hành Trưởng nhóm' },
        ],
      },
    ],
  },
  {
    id: 'equipment',
    name: 'Thiết bị Media (MEMS)',
    nodes: [
      {
        id: 'equipment:inventory',
        label: 'Kho thiết bị',
        children: [
          { id: 'equipment:stock:view', label: 'Xem danh mục & tình trạng thiết bị' },
          { id: 'equipment:request:create', label: 'Tạo phiếu mượn thiết bị' },
          { id: 'equipment:approval:manage', label: 'Phê duyệt & Quản lý kho (Duyệt/Giao/Trả)' },
        ],
      },
    ],
  },
  {
    id: 'tools',
    name: 'Tiện ích & AI Tools',
    nodes: [
      {
        id: 'tools:features',
        label: 'Công cụ hỗ trợ',
        children: [
          { id: 'tools:ai:overview', label: 'Tổng quan AI' },
          { id: 'tools:ai:voice', label: 'AI Clone Voice' },
          { id: 'tools:ai:transform', label: 'AI Content Transform' },
          { id: 'tools:video:download', label: 'Video Downloader' },
          { id: 'tools:id_photo:create', label: 'Tạo ảnh thẻ ID Photo' },
          { id: 'tools:lucky_spin:play', label: 'Vòng quay may mắn (Lucky Spin)' },
        ],
      },
    ],
  },
];

/** Lấy tất cả mã quyền lá (leaf permissions) trong cây */
export function getAllLeafPermissions(): string[] {
  const result: string[] = [];

  function traverse(node: PermissionNode) {
    if (node.children && node.children.length > 0) {
      node.children.forEach(traverse);
    } else {
      result.push(node.id);
    }
  }

  PERMISSION_TREE.forEach((group) => {
    group.nodes.forEach(traverse);
  });

  return result;
}

/** Lấy tất cả mã quyền con của một node (kể cả chính nó) */
export function getNodeAndDescendantIds(node: PermissionNode): string[] {
  const ids: string[] = [node.id];
  if (node.children) {
    node.children.forEach((child) => {
      ids.push(...getNodeAndDescendantIds(child));
    });
  }
  return ids;
}

/**
 * Chỉ lấy mã quyền LÁ của một node (bỏ id của chính node nhóm).
 *
 * Mảng permissions lưu xuống DB phải là quyền thật — id node nhóm (vd "social:external")
 * không nằm trong cây so khớp của checkPermissionMatch nên nếu lọt vào sẽ là rác: nó làm
 * phồng bộ đếm "Đã chọn N quyền" và khiến preset không bao giờ khớp để tô sáng.
 */
export function getLeafIds(node: PermissionNode): string[] {
  if (!node.children || node.children.length === 0) return [node.id];
  return node.children.flatMap(getLeafIds);
}


/**
 * Bộ quyền mặc định của từng vai trò hệ thống.
 *
 * Đây là thứ thay cho hàng nút "preset" cũ: modal nhân sự chỉ còn MỘT chỗ chọn vai trò, và cây
 * quyền tự tick theo bộ mặc định của vai trò đó. Admin vẫn sửa lẻ từng ô được sau khi chọn.
 */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  /** ADMIN không bao giờ bị lọc (hasPermission bypass), liệt kê đủ để cây hiện tick hết. */
  ADMIN: getAllLeafPermissions(),

  MANAGER: getAllLeafPermissions().filter((p) => p !== 'portal:admin:panel'),

  LEADER: [
    'social:external:all',
    'social:external:facebook',
    'social:external:tiktok',
    'social:external:instagram',
    'social:external:youtube',
    'social:external:douyin',
    'social:external:xiaohongshu',
    'social:external:kuaishou',
    'social:external:bilibili',
    'social:external:crawl_all',
    'social:external:propose',
    'social:internal:overview',
    'social:internal:view',
    'social:hub:search',
    'social:library:view',
    'social:content:translate',
    'publishing:compose',
    'publishing:schedule',
    'publishing:calendar',
    'publishing:history',
    'publishing:channels',
    'publishing:stats',
    'tasks:list',
    'tasks:my_catalog',
    'tasks:kpi',
    'tasks:catalog',
    'tasks:teams',
    'portal:performance:view_self',
    'portal:performance:view_team',
    'portal:performance:ranking',
    'portal:checklist:fill',
    'portal:checklist:approve',
    'portal:reports:view',
    'portal:team:assign',
    'portal:leader:panel',
    'equipment:stock:view',
    'equipment:request:create',
    'tools:ai:overview',
    'tools:ai:voice',
    'tools:ai:transform',
    'tools:video:download',
    'tools:id_photo:create',
    'tools:lucky_spin:play',
  ],

  MEMBER: [
    'social:external:all',
    'social:external:facebook',
    'social:external:tiktok',
    'social:external:instagram',
    'social:external:youtube',
    'social:external:douyin',
    'social:external:xiaohongshu',
    'social:external:kuaishou',
    'social:external:bilibili',
    'social:external:propose',
    'social:hub:search',
    'social:library:view',
    'social:content:translate',
    'publishing:compose',
    'publishing:schedule',
    'publishing:calendar',
    'publishing:history',
    'tasks:list',
    'tasks:my_catalog',
    'tasks:kpi',
    'portal:performance:view_self',
    'portal:checklist:fill',
    'equipment:stock:view',
    'equipment:request:create',
    'tools:ai:overview',
    'tools:ai:transform',
    'tools:video:download',
    'tools:id_photo:create',
    'tools:lucky_spin:play',
  ],
};

/** Quyền mặc định của một vai trò; vai trò lạ thì trả về bộ của MEMBER cho an toàn. */
export function getDefaultPermissionsForRole(role: string): string[] {
  return DEFAULT_PERMISSIONS_BY_ROLE[role] ?? DEFAULT_PERMISSIONS_BY_ROLE.MEMBER;
}
