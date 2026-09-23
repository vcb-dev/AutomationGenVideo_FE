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
  // 1. VCB Portal (Hoạt động & Nhân sự)
  {
    id: 'portal',
    name: 'VCB Portal (Hoạt động & Nhân sự)',
    nodes: [
      {
        id: 'portal:performance',
        label: 'Tổng quan (Hiệu suất & Bảng điều khiển)',
        children: [
          { id: 'portal:admin:panel', label: 'Dashboard Admin (Trang quản trị hệ thống)' },
          { id: 'portal:leader:panel', label: 'Trang điều hành Trưởng nhóm' },
          { id: 'portal:manager:main', label: 'Bảng điều khiển chính (Manager)' },
          { id: 'portal:performance:view_team', label: 'Hiệu suất (Xem toàn team / công ty)' },
          { id: 'portal:performance:ranking', label: 'Bảng xếp hạng (Xếp hạng thành viên)' },
          { id: 'portal:performance:view_self', label: 'Tiến độ cá nhân (Lịch sử & biểu đồ)' },
        ],
      },
      {
        id: 'portal:checklist',
        label: 'Báo cáo hàng ngày & Checklist',
        children: [
          { id: 'portal:reports:traffic', label: 'Báo cáo Traffic ngày' },
          { id: 'portal:reports:tasks', label: 'Báo cáo Đầu việc ngày' },
          { id: 'portal:reports:monthly', label: 'Báo cáo tổng hợp tháng' },
          { id: 'portal:checklist:fill', label: 'Điền & Xem checklist hàng ngày' },
          { id: 'portal:checklist:approve', label: 'Duyệt vấn đề & win (Tồn đọng / phát sinh)' },
        ],
      },
      {
        id: 'portal:channel',
        label: 'Kênh (Quản lý Kênh đội nhóm)',
        children: [
          { id: 'portal:channel:my', label: 'Kênh của tôi' },
          { id: 'portal:channel:team', label: 'Quản lý kênh nhóm (Kênh của team)' },
          { id: 'portal:team:assign', label: 'Phân công kênh cho nhân sự' },
        ],
      },
      {
        id: 'portal:hr',
        label: 'Quản lý (Quản lý Nhân sự)',
        children: [
          { id: 'portal:hr:view', label: 'Xem danh sách nhân sự' },
          { id: 'portal:hr:manage', label: 'Thêm nhân sự & Cấp tài khoản mới' },
          { id: 'portal:hr:edit', label: 'Sửa thông tin & Tinh chỉnh phân quyền' },
          { id: 'portal:hr:status', label: 'Bật / Tắt kích hoạt tài khoản' },
          { id: 'portal:hr:delete', label: 'Xóa nhân sự (Soft delete)' },
          { id: 'portal:hr:unassigned', label: 'Xem nhân sự chưa phân team' },
          { id: 'portal:editor:manage', label: 'Quản lý Editor' },
        ],
      },
    ],
  },

  // 2. Đăng bài MXH
  {
    id: 'publishing',
    name: 'Đăng bài MXH (Bảng bài Mạng xã hội)',
    nodes: [
      {
        id: 'publishing:manage',
        label: 'Tài khoản (Kết nối tài khoản)',
        children: [
          { id: 'publishing:channels', label: 'Kết nối tài khoản (Quản lý tài khoản kết nối)' },
          { id: 'publishing:channels:connect', label: 'Nút "Liên kết tài khoản mới"' },
        ],
      },
      {
        id: 'publishing:post',
        label: 'Đăng bài (Soạn & Lên lịch đăng bài)',
        children: [
          { id: 'publishing:compose', label: 'Soạn & đăng bài (Đơn lẻ)' },
          { id: 'publishing:bulk', label: 'Soạn bài đăng hàng loạt' },
          { id: 'publishing:schedule', label: 'Lịch đăng & Hàng chờ' },
          { id: 'publishing:calendar', label: 'Lịch tháng (Lịch nội dung trực quan)' },
        ],
      },
      {
        id: 'publishing:stats_group',
        label: 'Thống kê (Lịch sử & Thống kê đăng bài)',
        children: [
          { id: 'publishing:history', label: 'Lịch sử đăng bài' },
          { id: 'publishing:stats', label: 'Thống kê hiệu quả đăng bài' },
        ],
      },
    ],
  },

  // 3. Khám phá Video
  {
    id: 'social',
    name: 'Khám phá Video & Mạng xã hội',
    nodes: [
      {
        id: 'social:internal',
        label: 'Kênh nội bộ & Phân tích (Tổng quan & Kênh nội bộ)',
        description: 'Quản lý, phân tích và đồng bộ các kênh mạng xã hội thuộc sở hữu',
        children: [
          { id: 'social:internal:overview', label: 'Tổng quan nội bộ' },
          {
            id: 'social:internal:view',
            label: 'Tab "Tất cả" kênh nội bộ',
            description: 'CHỈ mở tab tổng hợp kênh nội bộ. Muốn thấy từng nền tảng thì tick riêng bên dưới',
          },
          { id: 'social:internal:facebook', label: 'Kênh nội bộ Facebook' },
          { id: 'social:internal:tiktok', label: 'Kênh nội bộ TikTok' },
          { id: 'social:internal:instagram', label: 'Kênh nội bộ Instagram' },
          { id: 'social:internal:youtube', label: 'Kênh nội bộ YouTube' },
          { id: 'social:internal:threads', label: 'Kênh nội bộ Threads' },
          { id: 'social:internal:douyin', label: 'Kênh nội bộ Douyin' },
          { id: 'social:internal:xiaohongshu', label: 'Kênh nội bộ XiaoHongShu' },
          { id: 'social:internal:sync', label: 'Nút "Đồng bộ / Cào dữ liệu kênh nội bộ"' },
          { id: 'social:internal:add_channel', label: 'Nút "Thêm kênh nội bộ mới"' },
          { id: 'social:internal:delete_channel', label: 'Nút "Xóa kênh nội bộ"' },
        ],
      },
      {
        id: 'social:external',
        label: 'Khám phá kênh ngoài (externalChannels)',
        description: 'Xem video, theo dõi kênh và cào dữ liệu từ các mạng xã hội',
        children: [
          {
            id: 'social:external:all',
            label: 'Tab "Tất cả" (xem tổng hợp)',
            description: 'CHỈ mở tab tổng hợp. Muốn thấy từng nền tảng thì tick riêng bên dưới',
          },
          { id: 'social:external:facebook', label: 'Nền tảng Facebook' },
          { id: 'social:external:tiktok', label: 'Nền tảng TikTok' },
          { id: 'social:external:instagram', label: 'Nền tảng Instagram' },
          { id: 'social:external:youtube', label: 'Nền tảng YouTube' },
          { id: 'social:external:douyin', label: 'Nền tảng Douyin' },
          { id: 'social:external:xiaohongshu', label: 'Nền tảng XiaoHongShu (📕)' },
          { id: 'social:external:kuaishou', label: 'Nền tảng KuaiShou (⚡)' },
          { id: 'social:external:bilibili', label: 'Nền tảng Bilibili (📺)' },
          { id: 'social:external:watch', label: 'Trang Watch Feed' },
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
          { id: 'social:external:add_channel', label: 'Nút "Thêm kênh theo dõi mới"' },
          { id: 'social:external:delete_channel', label: 'Nút "Xóa kênh theo dõi"' },
        ],
      },
      {
        id: 'social:tools',
        label: 'Bộ sưu tập & Công cụ Video (Khám phá & Bộ sưu tập)',
        children: [
          { id: 'social:hub:search', label: 'Tìm kiếm Video (Hub)' },
          { id: 'social:library:view', label: 'Bộ sưu tập (Video Library)' },
          { id: 'social:collections:view', label: 'Bộ sưu tập đã lưu (Collections)' },
          { id: 'social:content:translate', label: 'Dịch Content & Tạo kịch bản' },
          { id: 'social:content:product', label: 'Chọn sản phẩm cho nội dung' },
          { id: 'social:videos:manage', label: 'Kho video & Tải video lên' },
          { id: 'social:videos:filter', label: 'Lọc video & Video của tôi' },
          { id: 'social:videos:review', label: 'Duyệt video' },
          { id: 'social:analysis:channel', label: 'Phân tích kênh' },
          { id: 'social:analysis:stats', label: 'Thống kê tổng hợp video' },
        ],
      },
    ],
  },

  // 4. Nhiệm vụ
  {
    id: 'tasks',
    name: 'Nhiệm vụ',
    nodes: [
      {
        id: 'tasks:work',
        label: 'Nhiệm vụ (Tổng quan & Danh sách)',
        children: [
          { id: 'tasks:overview', label: 'Tổng quan nhiệm vụ' },
          { id: 'tasks:list', label: 'Danh sách nhiệm vụ' },
          { id: 'tasks:create', label: 'Tạo nhiệm vụ mới' },
        ],
      },
      {
        id: 'tasks:admin',
        label: 'Đội nhóm & Danh mục',
        children: [
          { id: 'tasks:teams', label: 'Đội nhóm (Quản lý đội nhóm nhiệm vụ)' },
          { id: 'tasks:catalog', label: 'Danh mục tổng (Danh mục đầu việc)' },
        ],
      },
      {
        id: 'tasks:personal',
        label: 'Cá nhân (Kho cá nhân, KPI & Cài đặt)',
        children: [
          { id: 'tasks:my_catalog', label: 'Kho cá nhân (Đầu việc của tôi)' },
          { id: 'tasks:kpi', label: 'KPI (Xem bảng KPI)' },
          { id: 'tasks:content', label: 'Bảng nội dung thắng (Content Win)' },
          { id: 'tasks:settings', label: 'Cài đặt (Cấu hình nhiệm vụ)' },
        ],
      },
    ],
  },

  // 5. Quản lý thiết bị (MEMS)
  {
    id: 'equipment',
    name: 'Quản lý thiết bị (MEMS)',
    nodes: [
      {
        id: 'equipment:inventory',
        label: 'Kho thiết bị (Bảng điều khiển & Danh sách kho)',
        children: [
          { id: 'equipment:overview', label: 'Bảng điều khiển (Tổng quan thiết bị)' },
          { id: 'equipment:stock:view', label: 'Danh sách kho & Tình trạng thiết bị' },
          { id: 'equipment:asset:detail', label: 'Xem chi tiết hồ sơ tài sản' },
          { id: 'equipment:borrow_history', label: 'Nhật ký mượn thiết bị' },
        ],
      },
      {
        id: 'equipment:flow',
        label: 'Mượn thiết bị, Duyệt và bàn giao',
        children: [
          { id: 'equipment:request:create', label: 'Tạo phiếu mượn thiết bị' },
          { id: 'equipment:approval:manage', label: 'Phê duyệt & Quản lý kho (Duyệt/Giao/Trả/Kiểm tra)' },
        ],
      },
    ],
  },

  // 6. Tiện ích & AI Tools
  {
    id: 'tools',
    name: 'Tiện ích & AI Tools',
    nodes: [
      {
        id: 'tools:ai',
        label: 'Công cụ AI',
        children: [
          { id: 'tools:ai:overview', label: 'Tổng quan AI' },
          { id: 'tools:ai:voice', label: 'AI Clone Voice' },
          { id: 'tools:ai:transform', label: 'AI Content Transform' },
          { id: 'tools:ai:photo_to_video', label: 'AI Ảnh thành video' },
          { id: 'tools:ai:search', label: 'AI Tìm kiếm & Phân tích' },
        ],
      },
      {
        id: 'tools:utilities',
        label: 'Tiện ích mở rộng & Sự kiện',
        children: [
          { id: 'tools:video:download', label: 'Tải video không logo (Downloader)' },
          { id: 'tools:lucky_spin:play', label: 'Vòng quay may mắn (Lucky Spin)' },
          { id: 'tools:id_photo:create', label: 'Tạo ảnh thẻ nhân viên (ID Photo)' },
          { id: 'tools:id_photo:history', label: 'Lịch sử tạo ảnh thẻ' },
          { id: 'tools:id_photo:stats', label: 'Thống kê tạo ảnh thẻ' },
        ],
      },
    ],
  },

  // 7. Hướng dẫn sử dụng
  {
    id: 'guide',
    name: 'Hướng dẫn sử dụng',
    nodes: [
      {
        id: 'guide:topics',
        label: 'Chuyên đề hướng dẫn',
        children: [
          { id: 'guide:portal', label: 'Hướng dẫn VCB Portal' },
          { id: 'guide:social', label: 'Hướng dẫn Đăng bài MXH' },
          { id: 'guide:discovery', label: 'Hướng dẫn Khám phá video' },
          { id: 'guide:tasks', label: 'Hướng dẫn Nhiệm vụ & KPI' },
          { id: 'guide:equipment', label: 'Hướng dẫn Thiết bị Media' },
          { id: 'guide:tools', label: 'Hướng dẫn Tiện ích & AI' },
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
 * không nằm trong cây so khớp của checkPermissionMatch nên nếu lọt vào sẽ là rác.
 */
export function getLeafIds(node: PermissionNode): string[] {
  if (!node.children || node.children.length === 0) return [node.id];
  return node.children.flatMap(getLeafIds);
}

/**
 * Bộ quyền mặc định của từng vai trò hệ thống.
 * Cây quyền tự tick theo bộ mặc định của vai trò đó, Admin vẫn sửa lẻ từng ô được.
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
    'social:external:watch',
    'social:external:crawl_all',
    'social:external:propose',
    'social:external:add_channel',
    'social:internal:overview',
    'social:internal:view',
    'social:internal:facebook',
    'social:internal:tiktok',
    'social:internal:instagram',
    'social:internal:youtube',
    'social:internal:threads',
    'social:internal:douyin',
    'social:internal:xiaohongshu',
    'social:internal:sync',
    'social:internal:add_channel',
    'social:hub:search',
    'social:library:view',
    'social:collections:view',
    'social:content:translate',
    'social:content:product',
    'social:videos:manage',
    'social:videos:filter',
    'social:videos:review',
    'social:analysis:channel',
    'social:analysis:stats',
    'publishing:compose',
    'publishing:bulk',
    'publishing:schedule',
    'publishing:calendar',
    'publishing:history',
    'publishing:channels',
    'publishing:stats',
    'tasks:overview',
    'tasks:list',
    'tasks:create',
    'tasks:my_catalog',
    'tasks:kpi',
    'tasks:content',
    'tasks:catalog',
    'tasks:teams',
    'portal:leader:panel',
    'portal:performance:view_self',
    'portal:performance:view_team',
    'portal:performance:ranking',
    'portal:checklist:fill',
    'portal:checklist:approve',
    'portal:reports:traffic',
    'portal:reports:tasks',
    'portal:reports:monthly',
    'portal:channel:my',
    'portal:channel:team',
    'portal:team:assign',
    'equipment:overview',
    'equipment:stock:view',
    'equipment:asset:detail',
    'equipment:borrow_history',
    'equipment:request:create',
    'equipment:approval:manage',
    'tools:ai:overview',
    'tools:ai:voice',
    'tools:ai:transform',
    'tools:ai:photo_to_video',
    'tools:ai:search',
    'tools:video:download',
    'tools:lucky_spin:play',
    'tools:id_photo:create',
    'tools:id_photo:history',
    'tools:id_photo:stats',
    'guide:tasks',
    'guide:social',
    'guide:discovery',
    'guide:equipment',
    'guide:tools',
    'guide:portal',
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
    'social:external:watch',
    'social:external:propose',
    'social:internal:overview',
    'social:internal:view',
    'social:internal:facebook',
    'social:internal:tiktok',
    'social:internal:instagram',
    'social:internal:youtube',
    'social:internal:threads',
    'social:hub:search',
    'social:library:view',
    'social:collections:view',
    'social:content:translate',
    'social:videos:manage',
    'social:videos:filter',
    'publishing:channels',
    'publishing:compose',
    'publishing:schedule',
    'publishing:calendar',
    'publishing:history',
    'publishing:stats',
    'tasks:overview',
    'tasks:list',
    'tasks:teams',
    'tasks:catalog',
    'tasks:my_catalog',
    'tasks:kpi',
    'tasks:content',
    'portal:performance:view_self',
    'portal:performance:view_team',
    'portal:performance:ranking',
    'portal:checklist:fill',
    'portal:checklist:approve',
    'portal:reports:traffic',
    'portal:reports:tasks',
    'portal:reports:monthly',
    'portal:channel:my',
    'equipment:overview',
    'equipment:stock:view',
    'equipment:request:create',
    'equipment:borrow_history',
    'tools:ai:overview',
    'tools:ai:voice',
    'tools:ai:transform',
    'tools:video:download',
    'tools:lucky_spin:play',
    'guide:tasks',
    'guide:social',
    'guide:discovery',
    'guide:equipment',
    'guide:tools',
    'guide:portal',
  ],
};

/** Quyền mặc định của một vai trò; vai trò lạ thì trả về bộ của MEMBER cho an toàn. */
export function getDefaultPermissionsForRole(role: string): string[] {
  return DEFAULT_PERMISSIONS_BY_ROLE[role] ?? DEFAULT_PERMISSIONS_BY_ROLE.MEMBER;
}
