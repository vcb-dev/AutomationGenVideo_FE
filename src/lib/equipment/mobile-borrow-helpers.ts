/**
 * Helper hỗ trợ tạo đường dẫn và thông tin cho luồng Quét QR tạo phiếu trên điện thoại.
 */

export interface MobileBorrowQRConfig {
  origin: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  lanIp?: string;
}

/**
 * Tạo URL đầy đủ để nhúng vào mã QR mở form tạo phiếu trên điện thoại.
 * Tự động chuyển đổi `localhost` sang IP LAN nếu có để điện thoại cùng Wi-Fi mở được.
 */
export function buildMobileBorrowUrl(config: MobileBorrowQRConfig): string {
  let base = config.origin;

  // Nếu đang chạy local (localhost hoặc 127.0.0.1) và có IP LAN, ưu tiên dùng IP LAN để điện thoại mở được
  if (config.lanIp && (base.includes('localhost') || base.includes('127.0.0.1'))) {
    base = base.replace('localhost', config.lanIp).replace('127.0.0.1', config.lanIp);
  }

  const url = new URL('/dashboard/equipment/new-request', base);
  url.searchParams.set('from_qr', '1');

  if (config.userId) {
    url.searchParams.set('requester_id', config.userId);
  }
  if (config.userName) {
    url.searchParams.set('requester_name', config.userName);
  }

  return url.toString();
}

/**
 * Kiểm tra xem thiết bị hiện tại có phải là trình duyệt di động hay không.
 */
export function isMobileBrowser(userAgent?: string): boolean {
  if (typeof window === 'undefined' && !userAgent) return false;
  const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

/**
 * Định dạng nhãn hiển thị người mượn xác thực trên thiết bị di động.
 */
export function formatRequesterBadge(user?: { full_name?: string; name?: string; email?: string; team?: string; department?: { name?: string } } | null): string {
  if (!user) return 'Chưa đăng nhập';
  const name = user.full_name || user.name;
  if (!name) return 'Chưa đăng nhập';
  const teamOrDept = user.team || user.department?.name;
  return teamOrDept ? `${name} · ${teamOrDept}` : name;
}
