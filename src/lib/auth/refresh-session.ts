/**
 * Giữ phiên sống qua mốc 15 phút mà không đá người dùng ra trang đăng nhập.
 *
 * BE cấp access token sống 15 phút và refresh token sống 7 ngày (cookie HttpOnly `vcbi_rt`,
 * xem AutomationGenVideo_BE/src/modules/auth/cookie-auth.service.ts). Ý đồ là access token hết
 * hạn thì FE âm thầm gọi POST /auth/refresh lấy cái mới. FE chưa từng làm việc đó, nên đúng
 * phút thứ 15 là request kế tiếp ăn 401 rồi văng thẳng về /login giữa lúc đang làm việc.
 *
 * Phần logic thuần nằm ở đây, tách khỏi interceptor axios để test được mà không phải dựng cả
 * tầng mạng — đúng quy ước FE của repo.
 */

/** Cookie duy nhất KHÔNG HttpOnly bên BE, sinh ra để FE đọc được và gửi lại qua header. */
export const CSRF_COOKIE = 'vcbi_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Những đường dẫn không bao giờ được kích hoạt làm mới phiên.
 *
 * `/auth/refresh` nằm đây để chặn vòng lặp vô hạn: refresh trả 401 mà lại đi refresh tiếp thì
 * trình duyệt quay tròn cho tới khi treo. Chú thích trong khối catch của AuthController bên BE
 * cũng cảnh báo đúng cái bẫy này.
 *
 * `/auth/login` nằm đây vì 401 ở đó nghĩa là sai mật khẩu — làm mới phiên không cứu được, mà
 * còn nuốt mất thông báo lỗi đáng ra phải hiện cho người dùng.
 */
const NO_REFRESH_PATHS = ['/auth/refresh', '/auth/login', '/auth/logout'];

/** Có nên thử làm mới phiên cho request vừa hỏng không. */
export function shouldAttemptRefresh(
  status: number | undefined,
  url: string | undefined,
  alreadyRetried: boolean,
): boolean {
  if (status !== 401) return false;
  // Đã thử một lần rồi vẫn 401 nghĩa là phiên chết thật, không phải token vừa hết hạn.
  if (alreadyRetried) return false;
  return !NO_REFRESH_PATHS.some((path) => (url ?? '').includes(path));
}

/**
 * Đọc một cookie theo tên từ chuỗi `document.cookie`.
 *
 * Nhận chuỗi vào thay vì tự đọc `document` để test chạy được và để hàm không phụ thuộc trình
 * duyệt. Giá trị được `decodeURIComponent` vì BE ghi cookie qua `res.cookie()` của Express —
 * hàm đó tự mã hoá giá trị.
 */
export function readCookie(name: string, cookieString: string): string | null {
  for (const part of cookieString.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const raw = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      // Giá trị không phải chuỗi mã hoá hợp lệ thì dùng nguyên bản còn hơn ném lỗi giữa lúc
      // đang cứu phiên đăng nhập.
      return raw;
    }
  }
  return null;
}

/** Header CSRF cho request refresh; không có cookie thì trả object rỗng. */
export function csrfHeader(cookieString: string): Record<string, string> {
  const token = readCookie(CSRF_COOKIE, cookieString);
  // Đúng MỘT giá trị, không nối chuỗi. CsrfGuard bên BE so sánh thẳng với cookie, mà Node nối
  // hai header trùng tên thành "tok, tok" — gửi lặp là ăn 403 vĩnh viễn trong khi devtools vẫn
  // hiện giá trị trông rất đúng.
  return token ? { [CSRF_HEADER]: token } : {};
}

export interface SessionRefresher {
  /** Trả access token mới, hoặc null nếu phiên đã chết. */
  refresh(): Promise<string | null>;
}

/**
 * Gom mọi lời gọi làm mới đồng thời về đúng MỘT lần gọi mạng.
 *
 * Vì sao bắt buộc: một trang thường bắn nhiều request song song, tới phút thứ 15 là cả loạt
 * cùng ăn 401. Để mỗi cái tự gọi refresh thì refresh token bị xoay vòng nhiều lần liên tiếp,
 * và BE thu hồi token cũ sau mỗi lần xoay — những request chậm chân cầm token đã chết, kết cục
 * vẫn là văng ra login. Đúng cái lỗi mà thay đổi này sinh ra để dẹp.
 */
export function createSessionRefresher(doRefresh: () => Promise<string | null>): SessionRefresher {
  let inFlight: Promise<string | null> | null = null;

  return {
    refresh() {
      if (!inFlight) {
        // Dọn ở cả nhánh thành công lẫn thất bại, nếu không thì một lần refresh hỏng sẽ khoá
        // luôn mọi lần thử sau — người dùng kẹt ở trạng thái không bao giờ hồi phục được.
        inFlight = doRefresh().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}
