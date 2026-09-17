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
        id: 'social:internal',
        label: 'Kênh nội bộ & Phân tích',
        description: 'Quản lý, phân tích và đồng bộ các kênh mạng xã hội thuộc sở hữu',
        children: [
          { id: 'social:internal:overview', label: 'Tổng quan kênh nội bộ' },
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
        id: 'social:tools',
        label: 'Công cụ Video & Kịch bản',
        children: [
          { id: 'social:hub:search', label: 'Tìm kiếm Video Hub' },
          { id: 'social:library:view', label: 'Bộ sưu tập Video (Video Library)' },
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
  {
    id: 'publishing',
    name: 'Bảng bài Mạng xã hội',
    nodes: [
      {
        id: 'publishing:post',
        label: 'Soạn & Lên lịch đăng bài',
        children: [
          { id: 'publishing:compose', label: 'Soạn bài đăng đơn lẻ' },
          { id: 'publishing:bulk', label: 'Soạn bài đăng hàng loạt' },
          { id: 'publishing:schedule', label: 'Lịch đăng & Hàng chờ' },
          { id: 'publishing:calendar', label: 'Lịch nội dung trực quan' },
          { id: 'publishing:history', label: 'Lịch sử đăng bài' },
        ],
      },
      {
        id: 'publishing:manage',
        label: 'Kênh & Thống kê đăng bài',
        children: [
          { id: 'publishing:channels', label: 'Quản lý tài khoản kết nối' },
          { id: 'publishing:channels:connect', label: 'Nút "Liên kết tài khoản mới"' },
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
        label: 'Công việc cá nhân & KPI',
        children: [
          { id: 'tasks:overview', label: 'Tổng quan nhiệm vụ' },
          { id: 'tasks:list', label: 'Danh sách nhiệm vụ' },
          { id: 'tasks:create', label: 'Tạo nhiệm vụ mới' },
          { id: 'tasks:my_catalog', label: 'Đầu việc của tôi' },
          { id: 'tasks:kpi', label: 'Xem bảng KPI' },
          { id: 'tasks:content', label: 'Bảng nội dung thắng (Content Win)' },
        ],
      },
      {
        id: 'tasks:admin',
        label: 'Điều phối quản lý (Trưởng nhóm / Quản lý)',
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
        label: 'Hiệu suất & Bảng điều khiển',
        children: [
          { id: 'portal:admin:panel', label: 'Trang quản trị hệ thống (Admin)' },
          { id: 'portal:leader:panel', label: 'Trang điều hành Trưởng nhóm' },
          { id: 'portal:manager:main', label: 'Bảng điều khiển chính (Manager)' },
          { id: 'portal:performance:view_team', label: 'Xem hiệu suất toàn team / công ty' },
          { id: 'portal:performance:ranking', label: 'Xem bảng xếp hạng' },
          { id: 'portal:performance:view_self', label: 'Xem tiến độ cá nhân' },
        ],
      },
      {
        id: 'portal:checklist',
        label: 'Báo cáo & Checklist',
        children: [
          { id: 'portal:checklist:fill', label: 'Điền & Xem checklist hàng ngày' },
          { id: 'portal:checklist:approve', label: 'Duyệt vấn đề tồn đọng / phát sinh' },
          { id: 'portal:reports:traffic', label: 'Xem & Nộp báo cáo Traffic ngày' },
          { id: 'portal:reports:tasks', label: 'Xem & Nộp báo cáo Đầu việc ngày' },
          { id: 'portal:reports:monthly', label: 'Xem báo cáo tổng hợp tháng' },
        ],
      },
      {
        id: 'portal:channel',
        label: 'Quản lý Kênh đội nhóm',
        children: [
          { id: 'portal:channel:my', label: 'Kênh của tôi' },
          { id: 'portal:channel:team', label: 'Kênh của team' },
          { id: 'portal:team:assign', label: 'Phân công kênh cho nhân sự' },
        ],
      },
      {
        id: 'portal:hr',
        label: 'Quản lý Nhân sự',
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
  {
    id: 'equipment',
    name: 'Thiết bị Media (MEMS)',
    nodes: [
      {
        id: 'equipment:inventory',
        label: 'Kho & Danh mục thiết bị',
        children: [
          { id: 'equipment:overview', label: 'Tổng quan thiết bị Media' },
          { id: 'equipment:stock:view', label: 'Xem danh mục & Tình trạng thiết bị' },
          { id: 'equipment:asset:detail', label: 'Xem chi tiết hồ sơ tài sản' },
          { id: 'equipment:borrow_history', label: 'Nhật ký mượn thiết bị' },
        ],
      },
      {
        id: 'equipment:flow',
        label: 'Quy trình mượn trả thiết bị',
        children: [
          { id: 'equipment:request:create', label: 'Tạo phiếu mượn thiết bị' },
          { id: 'equipment:approval:manage', label: 'Phê duyệt & Quản lý kho (Duyệt/Giao/Trả/Kiểm tra)' },
        ],
      },
    ],
  },
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
        label: 'Tiện ích mở rộng',
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
  {
    id: 'guide',
    name: 'Hướng dẫn sử dụng',
    nodes: [
      {
        id: 'guide:topics',
        label: 'Chuyên đề hướng dẫn',
        children: [
          { id: 'guide:tasks', label: 'Hướng dẫn Nhiệm vụ & KPI' },
          { id: 'guide:social', label: 'Hướng dẫn Đăng bài MXH' },
          { id: 'guide:discovery', label: 'Hướng dẫn Khám phá video' },
          { id: 'guide:equipment', label: 'Hướng dẫn Thiết bị Media' },
          { id: 'guide:tools', label: 'Hướng dẫn Tiện ích & AI' },
          { id: 'guide:portal', label: 'Hướng dẫn VCB Portal' },
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
    'publishing:compose',
    'publishing:schedule',
    'publishing:calendar',
    'publishing:history',
    'tasks:overview',
    'tasks:list',
    'tasks:my_catalog',
    'tasks:kpi',
    'tasks:content',
    'portal:performance:view_self',
    'portal:checklist:fill',
    'portal:reports:traffic',
    'portal:reports:tasks',
    'portal:channel:my',
    'equipment:stock:view',
    'equipment:request:create',
    'tools:ai:overview',
    'tools:ai:transform',
    'tools:video:download',
    'tools:lucky_spin:play',
    'tools:id_photo:create',
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
