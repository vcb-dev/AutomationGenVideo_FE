import { User, UserRole } from '@/types/auth';
import { getRequiredPermissionForPath } from '@/config/permission-routes';

/** Danh sách các quyền hành động đặc thù / nhạy cảm không được tự động thừa hưởng từ quyền xem ':all' */
const SENSITIVE_ACTION_PERMISSIONS = new Set([
  'social:external:crawl_all',
  'social:external:propose',
]);

/**
 * Kiểm tra xem quyền của user có khớp với quyền yêu cầu hay không.
 * Hỗ trợ exact match, prefix:all (ví dụ social:external:all bao quát các nền tảng con), và wildcard (*).
 * Chú ý: Các quyền hành động nhạy cảm như crawl_all bắt buộc phải được cấp chính xác, không thừa hưởng từ :all.
 */
export function checkPermissionMatch(userPermissions: string[], requiredPerm: string): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;

  // 1. So khớp chính xác
  if (userPermissions.includes(requiredPerm)) return true;

  // 2. Wildcard toàn cục
  if (userPermissions.includes('*')) return true;

  // Nếu là quyền hành động nhạy cảm (như cào tay crawl_all), bắt buộc phải có quyền đích danh hoặc *
  if (SENSITIVE_ACTION_PERMISSIONS.has(requiredPerm)) {
    return false;
  }

  // 3. Phân cấp cha qua "all" hoặc "*"
  const parts = requiredPerm.split(':');
  let prefix = '';
  for (let i = 0; i < parts.length - 1; i++) {
    prefix = prefix ? `${prefix}:${parts[i]}` : parts[i];
    if (userPermissions.includes(`${prefix}:all`) || userPermissions.includes(`${prefix}:*`)) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra xem user có quyền thực hiện một hành động hay không.
 * - ADMIN luôn có toàn quyền (Bypass).
 * - Nếu user có mảng permissions cụ thể -> Tuân thủ chặt chẽ theo permissions được cấp.
 * - Tuyệt đối không cho phép tài khoản MEMBER cào tay dữ liệu nếu không được cấp quyền đích danh.
 */
export function hasPermission(user: User | null | undefined, requiredPerm: string): boolean {
  if (!user) return false;

  const roles = user.roles ?? [];

  // 1. ADMIN luôn toàn quyền
  if (roles.includes(UserRole.ADMIN)) {
    return true;
  }

  const permissions = user.permissions ?? [];

  // 2. Nếu user có mảng permissions cụ thể -> Kiểm tra theo permissions
  if (permissions.length > 0) {
    return checkPermissionMatch(permissions, requiredPerm);
  }

  // 3. Fallback cho tài khoản cũ chưa được gán permissions chi tiết (backward compatibility)
  // Tuyệt đối chặn quyền cào tay đối với role MEMBER nếu chưa được cấp quyền
  if (requiredPerm === 'social:external:crawl_all') {
    // Chỉ LEADER hoặc MANAGER cũ mới có thể tạm thời được cào tay, MEMBER tuyệt đối không!
    return roles.includes(UserRole.LEADER) || roles.includes(UserRole.MANAGER);
  }

  if (roles.includes(UserRole.MANAGER)) {
    return true; // Manager cũ mặc định có hầu hết quyền
  }

  // Member/Leader/Editor cũ mặc định được xem video ngoài (chỉ xem, không cào)
  if (requiredPerm.startsWith('social:external:') && !SENSITIVE_ACTION_PERMISSIONS.has(requiredPerm)) {
    return true;
  }

  return false;
}

/**
 * Kiểm tra xem user có quyền truy cập vào một nền tảng mạng xã hội cụ thể hay không.
 * platformId: 'all' | 'facebook' | 'tiktok' | 'instagram' | 'youtube' | 'douyin' | 'xiaohongshu' | 'kuaishou' | 'bilibili'
 */
export function canAccessExternalPlatform(user: User | null | undefined, platformId: string): boolean {
  if (!user) return false;

  const roles = user.roles ?? [];
  if (roles.includes(UserRole.ADMIN)) return true;

  const permissions = user.permissions ?? [];

  // Nếu chưa cấu hình permissions chi tiết, cho phép truy cập (backward compatibility)
  if (permissions.length === 0) {
    return true;
  }

  // Nếu user có quyền xem tất cả nền tảng
  const hasAll = permissions.includes('social:external:all') || permissions.includes('*');

  if (platformId === 'all') {
    return hasAll;
  }

  if (hasAll) {
    return true;
  }

  // Kiểm tra quyền riêng cho từng nền tảng
  return permissions.includes(`social:external:${platformId}`);
}

/**
 * Tài khoản này đã được Admin cấu hình quyền chi tiết chưa?
 *
 * Toàn bộ việc lọc menu chỉ bật khi câu trả lời là "rồi". Hàng trăm tài khoản có sẵn đều có
 * permissions rỗng — lọc luôn thì cả công ty mất menu ngay lần deploy đầu tiên.
 */
export function hasGranularPermissions(user: User | null | undefined): boolean {
  return !!user?.permissions && user.permissions.length > 0;
}

/**
 * Tài khoản có được vào đường dẫn này không.
 *
 * Dùng chung cho cả việc ẩn mục trên thanh điều hướng lẫn chốt chặn khi người dùng gõ thẳng URL,
 * nên hai nơi không thể lệch nhau.
 */
export function canAccessRoute(user: User | null | undefined, href: string): boolean {
  if (!user) return false;
  if (user.roles?.includes(UserRole.ADMIN)) return true;

  // Chưa cấu hình quyền chi tiết -> giữ nguyên hành vi cũ theo role, không lọc gì thêm.
  if (!hasGranularPermissions(user)) return true;

  const required = getRequiredPermissionForPath(href);
  // Trang không khai báo quyền (vd hướng dẫn sử dụng) mở cho mọi người đã đăng nhập.
  if (!required) return true;

  return checkPermissionMatch(user.permissions ?? [], required);
}

/**
 * Lọc cây menu điều hướng theo quyền: bỏ mục không được phép, bỏ luôn nhóm/menu rỗng sau khi lọc.
 *
 * Viết theo kiểu generic để không phải kéo type NavMenu của tầng giao diện xuống tầng lib.
 */
export function filterNavMenusByPermissions<
  TItem extends { href: string },
  TSection extends { items: TItem[] },
  TMenu extends { sections: TSection[]; directHref?: string },
>(user: User | null | undefined, menus: TMenu[]): TMenu[] {
  if (!user) return [];
  if (user.roles?.includes(UserRole.ADMIN) || !hasGranularPermissions(user)) return menus;

  return menus
    .map((menu) => ({
      ...menu,
      sections: menu.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canAccessRoute(user, item.href)),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((menu) => {
      // Menu bấm thẳng (directHref) không có mục con để đếm — xét chính đường dẫn của nó.
      if (menu.directHref) return canAccessRoute(user, menu.directHref);
      return menu.sections.length > 0;
    });
}

/**
 * Lọc danh sách platforms cho thanh tabs dựa trên quyền của user.
 */
export function filterAllowedPlatforms<T extends { id: string }>(user: User | null | undefined, platforms: T[]): T[] {
  if (!user) return [];

  // Nếu user là ADMIN hoặc chưa có permissions tùy biến -> Cho phép tất cả
  if (user.roles?.includes(UserRole.ADMIN) || !user.permissions || user.permissions.length === 0) {
    return platforms;
  }

  return platforms.filter((p) => canAccessExternalPlatform(user, p.id));
}
