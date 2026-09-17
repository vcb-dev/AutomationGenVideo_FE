/**
 * Bản đồ ĐƯỜNG DẪN → MÃ QUYỀN.
 *
 * Đây là nguồn sự thật duy nhất để trả lời "tài khoản này có được vào trang kia không". Cả thanh
 * điều hướng (ẩn mục) lẫn chốt chặn ở dashboard/layout.tsx (gõ thẳng URL) đều đọc từ đây, nên
 * không có chuyện ẩn nút mà vẫn vào được bằng cách dán link.
 *
 * Quy tắc khớp: lấy mục có tiền tố DÀI NHẤT khớp với đường dẫn. Đường dẫn không nằm trong bảng
 * này mặc định là CÔNG KHAI với mọi người đã đăng nhập (vd trang hướng dẫn sử dụng) — thêm quyền
 * mới thì khai báo ở đây, đừng đi rải rác trong từng trang.
 */
export interface RoutePermission {
  /** Tiền tố đường dẫn, không tính query string. */
  prefix: string;
  /**
   * Chỉ khớp khi query `tab` đúng giá trị này. Dùng cho /dashboard/manager/user-activity —
   * cùng một trang nhưng mỗi tab là một nghiệp vụ với quyền khác nhau.
   */
  tab?: string;
  /** Mã quyền cần có. */
  permission: string;
  /**
   * Nếu đặt: chỉ cần user có BẤT KỲ quyền nào bắt đầu bằng tiền tố này là vào được, không cần
   * đúng `permission` ở trên.
   *
   * Dùng cho các mục chứa nhiều mục con độc lập: cấp riêng "Nền tảng TikTok" thì phải vào được
   * Khám phá kênh ngoài, chứ không bắt buộc phải có thêm quyền "Xem tất cả nền tảng".
   */
  anyOfPrefix?: string;
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // ─── Khám phá Video & Mạng xã hội ───────────────────────────────────────────
  { prefix: '/dashboard/externalChannels', permission: 'social:external:all', anyOfPrefix: 'social:external:' },
  { prefix: '/dashboard/internalOverview', permission: 'social:internal:overview' },
  { prefix: '/dashboard/internalChannels', permission: 'social:internal:view' },
  { prefix: '/dashboard/search-video', permission: 'social:hub:search' },
  { prefix: '/dashboard/video-library', permission: 'social:library:view' },
  { prefix: '/dashboard/content/generate', permission: 'social:content:translate' },

  // ─── Đăng bài Mạng xã hội ───────────────────────────────────────────────────
  { prefix: '/dashboard/social/compose', permission: 'publishing:compose' },
  { prefix: '/dashboard/social/schedule', permission: 'publishing:schedule' },
  { prefix: '/dashboard/social/calendar', permission: 'publishing:calendar' },
  { prefix: '/dashboard/social/history', permission: 'publishing:history' },
  { prefix: '/dashboard/social/channels', permission: 'publishing:channels' },
  { prefix: '/dashboard/social/stats', permission: 'publishing:stats' },

  // ─── Nhiệm vụ & KPI ─────────────────────────────────────────────────────────
  // Các mục con phải đứng TRƯỚC '/dashboard/task-auto' để khớp tiền tố dài nhất.
  { prefix: '/dashboard/task-auto/my-catalog', permission: 'tasks:my_catalog' },
  { prefix: '/dashboard/task-auto/catalog', permission: 'tasks:catalog' },
  { prefix: '/dashboard/task-auto/teams', permission: 'tasks:teams' },
  { prefix: '/dashboard/task-auto/settings', permission: 'tasks:settings' },
  { prefix: '/dashboard/task-auto/kpi', permission: 'tasks:kpi' },
  { prefix: '/dashboard/task-auto', permission: 'tasks:list' },

  // ─── VCB Portal ─────────────────────────────────────────────────────────────
  { prefix: '/dashboard/admin', permission: 'portal:admin:panel' },
  { prefix: '/dashboard/leader', permission: 'portal:leader:panel' },
  { prefix: '/dashboard/hr-management', permission: 'portal:hr:manage' },
  // Trang hiệu suất/checklist dùng chung một đường dẫn, tách quyền theo tab.
  { prefix: '/dashboard/manager/user-activity', tab: 'performance', permission: 'portal:performance:view_team' },
  { prefix: '/dashboard/manager/user-activity', tab: 'dashboard', permission: 'portal:performance:view_team' },
  { prefix: '/dashboard/manager/user-activity', tab: 'ranking', permission: 'portal:performance:ranking' },
  { prefix: '/dashboard/manager/user-activity', tab: 'personal', permission: 'portal:performance:view_self' },
  { prefix: '/dashboard/manager/user-activity', tab: 'daily_checklist', permission: 'portal:checklist:fill' },
  { prefix: '/dashboard/manager/user-activity', tab: 'daily_outstanding', permission: 'portal:checklist:approve' },
  // CHÚ Ý: tab này là FORM NỘP báo cáo ngày (traffic/doanh thu) của chính nhân sự, không phải màn
  // hình xem tổng hợp — nó render ChecklistContainer. Gắn quyền 'portal:reports:view' ở đây sẽ
  // chặn đúng những người bắt buộc phải nộp. Nội dung bên trong đã tự phân nhánh theo vai trò
  // (isAdminUser/isLeaderUser) cho phần xem tổng hợp.
  { prefix: '/dashboard/manager/user-activity', tab: 'daily_report', permission: 'portal:checklist:fill' },
  { prefix: '/dashboard/manager', permission: 'portal:performance:view_team' },
  { prefix: '/dashboard/channel-team', permission: 'portal:team:assign' },
  { prefix: '/dashboard/editor-management', permission: 'portal:editor:manage' },

  // ─── Thiết bị Media (MEMS) ──────────────────────────────────────────────────
  { prefix: '/dashboard/equipment/approvals', permission: 'equipment:approval:manage' },
  { prefix: '/dashboard/equipment/handover', permission: 'equipment:approval:manage' },
  { prefix: '/dashboard/equipment/returns', permission: 'equipment:approval:manage' },
  { prefix: '/dashboard/equipment/prepare', permission: 'equipment:approval:manage' },
  { prefix: '/dashboard/equipment/inspection', permission: 'equipment:approval:manage' },
  { prefix: '/dashboard/equipment/new-request', permission: 'equipment:request:create' },
  { prefix: '/dashboard/equipment', permission: 'equipment:stock:view' },

  // ─── Tiện ích & AI ──────────────────────────────────────────────────────────
  { prefix: '/dashboard/ai/clone-voice', permission: 'tools:ai:voice' },
  { prefix: '/dashboard/ai/content-transform', permission: 'tools:ai:transform' },
  { prefix: '/dashboard/ai/overview', permission: 'tools:ai:overview' },
  { prefix: '/dashboard/tools/video-downloader', permission: 'tools:video:download' },
  { prefix: '/dashboard/tools/lucky-spin', permission: 'tools:lucky_spin:play' },
  { prefix: '/dashboard/tien-ich/id-photo', permission: 'tools:id_photo:create' },

  // ─── Hướng dẫn sử dụng ──────────────────────────────────────────────────────
  // Mỗi bài hướng dẫn đi theo phân hệ nó mô tả: không có quyền dùng phân hệ thì đọc hướng dẫn
  // của nó cũng vô nghĩa, mà lại làm menu đầy mục người dùng không bao giờ mở được.
  { prefix: '/dashboard/user-guide/video-discovery', permission: 'social:external:all', anyOfPrefix: 'social:' },
  { prefix: '/dashboard/user-guide/social-publishing', permission: 'publishing:compose', anyOfPrefix: 'publishing:' },
  { prefix: '/dashboard/user-guide/tasks', permission: 'tasks:list', anyOfPrefix: 'tasks:' },
  { prefix: '/dashboard/user-guide/equipment', permission: 'equipment:stock:view', anyOfPrefix: 'equipment:' },
  { prefix: '/dashboard/user-guide/utilities', permission: 'tools:video:download', anyOfPrefix: 'tools:' },
  { prefix: '/dashboard/user-guide/vcb-portal', permission: 'portal:checklist:fill', anyOfPrefix: 'portal:' },
];

/**
 * Quyền cần có để vào một đường dẫn, hoặc null nếu trang đó công khai.
 *
 * Khớp theo tiền tố dài nhất để '/dashboard/task-auto/kpi' không bị '/dashboard/task-auto' nuốt.
 */
export function getRouteRuleForPath(href: string): RoutePermission | null {
  const [path, queryString = ''] = (href || '').split('?');
  const tab = new URLSearchParams(queryString).get('tab');

  let best: RoutePermission | null = null;
  for (const entry of ROUTE_PERMISSIONS) {
    const pathMatches = path === entry.prefix || path.startsWith(`${entry.prefix}/`);
    if (!pathMatches) continue;
    // Mục khai báo tab chỉ áp dụng cho đúng tab đó.
    if (entry.tab && entry.tab !== tab) continue;

    if (!best) {
      best = entry;
      continue;
    }
    // Ưu tiên mục cụ thể hơn: có tab thắng không tab, sau đó tới tiền tố dài hơn.
    const moreSpecific =
      (!!entry.tab && !best.tab) ||
      (!!entry.tab === !!best.tab && entry.prefix.length > best.prefix.length);
    if (moreSpecific) best = entry;
  }

  return best;
}

/** Mã quyền chính của đường dẫn, hoặc null nếu trang công khai. */
export function getRequiredPermissionForPath(href: string): string | null {
  const rule = getRouteRuleForPath(href);
  return rule ? rule.permission : null;
}
