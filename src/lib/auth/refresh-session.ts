/**
 * Giữ phiên sống mượt mà giữa nhiều tab — không đá người dùng ra trang đăng nhập.
 *
 * ## Vấn đề gốc (multi-tab race condition)
 *
 * BE xoay refresh token (rotation) mỗi lần refresh: token cũ bị vô hiệu ngay. Khi nhiều tab
 * cùng hết hạn access token và đồng loạt gọi POST /auth/refresh, chỉ tab đầu tiên thành công —
 * các tab còn lại gửi token đã bị thay → 401 → BE xoá cookie → tất cả các tab bị đá.
 *
 * ## Ba tầng bảo vệ
 *
 * 1. **Proactive refresh (D):** Đọc `exp` trong JWT, hẹn refresh trước khi hết hạn ~2 phút.
 *    Bỏ hẳn "điểm đồng loạt 401" — token luôn được làm mới trước khi chết.
 *
 * 2. **Cross-tab lock (C):** Dùng `navigator.locks.request()` để chỉ cho phép DUY NHẤT 1 tab
 *    gọi API refresh. Phát token mới qua `BroadcastChannel` cho các tab khác.
 *
 * 3. **In-tab dedup:** Nhiều request cùng 401 trong 1 tab chỉ kích hoạt 1 lần gọi mạng
 *    (giữ nguyên logic cũ).
 */

/** Cookie duy nhất KHÔNG HttpOnly bên BE, sinh ra để FE đọc được và gửi lại qua header. */
export const CSRF_COOKIE = 'vcbi_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Những đường dẫn không bao giờ được kích hoạt làm mới phiên.
 *
 * `/auth/refresh` nằm đây để chặn vòng lặp vô hạn: refresh trả 401 mà lại đi refresh tiếp thì
 * trình duyệt quay tròn cho tới khi treo.
 *
 * `/auth/login` nằm đây vì 401 ở đó nghĩa là sai mật khẩu — làm mới phiên không cứu được.
 */
const NO_REFRESH_PATHS = ['/auth/refresh', '/auth/login', '/auth/logout'];

/** Có nên thử làm mới phiên cho request vừa hỏng không. */
export function shouldAttemptRefresh(
  status: number | undefined,
  url: string | undefined,
  alreadyRetried: boolean,
): boolean {
  if (status !== 401) return false;
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
      return raw;
    }
  }
  return null;
}

/** Header CSRF cho request refresh; không có cookie thì trả object rỗng. */
export function csrfHeader(cookieString: string): Record<string, string> {
  const token = readCookie(CSRF_COOKIE, cookieString);
  return token ? { [CSRF_HEADER]: token } : {};
}

// ─── Proactive Refresh (D) ──────────────────────────────────────────────────

/**
 * Decode phần payload của JWT KHÔNG verify chữ ký — chỉ đọc `exp`.
 * Trả timestamp giây, hoặc null nếu token không hợp lệ.
 */
export function getJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Số mili giây còn lại cho đến khi nên refresh (trước hạn `bufferSec` giây).
 * Trả 0 nếu đã quá hạn hoặc token không hợp lệ.
 */
export function msUntilRefresh(token: string, bufferSec = 120): number {
  const exp = getJwtExp(token);
  if (exp === null) return 0;
  const ms = (exp - bufferSec) * 1000 - Date.now();
  return Math.max(0, ms);
}

// ─── Cross-tab Lock (C) + In-tab Dedup ──────────────────────────────────────

const LOCK_NAME = 'vcbi-session-refresh';
const BC_CHANNEL = 'vcbi-session';

export interface SessionRefresher {
  /** Trả access token mới, hoặc null nếu phiên đã chết. */
  refresh(): Promise<string | null>;
  /** Bắt đầu proactive refresh timer cho token hiện tại. */
  scheduleProactiveRefresh(token: string): void;
  /** Dọn dẹp timer khi component/module unmount. */
  dispose(): void;
}

/**
 * Tạo SessionRefresher với 3 tầng bảo vệ:
 * - In-tab dedup (nhiều request cùng 401 → 1 lần gọi mạng)
 * - Cross-tab lock (navigator.locks → chỉ 1 tab refresh tại một thời điểm)
 * - BroadcastChannel (tab refresh xong → phát token mới cho các tab khác)
 */
export function createSessionRefresher(doRefresh: () => Promise<string | null>): SessionRefresher {
  let inFlight: Promise<string | null> | null = null;
  let proactiveTimer: ReturnType<typeof setTimeout> | null = null;
  let bc: BroadcastChannel | null = null;

  // Tạo BroadcastChannel để nhận token từ tab khác
  try {
    bc = new BroadcastChannel(BC_CHANNEL);
  } catch {
    // Safari cũ hoặc môi trường không hỗ trợ
  }

  /**
   * Gọi doRefresh() bọc trong navigator.locks nếu có.
   * Nếu không có navigator.locks (Safari < 16.4, Firefox private), fallback về in-tab dedup thuần.
   */
  async function lockedRefresh(): Promise<string | null> {
    // Thử lấy token từ localStorage trước — có thể tab khác vừa refresh xong
    const cached = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (cached) {
      const remaining = msUntilRefresh(cached);
      // Token còn sống > 30 giây → dùng luôn, không cần gọi API
      if (remaining > 30_000) return cached;
    }

    // Có navigator.locks → dùng cross-tab lock
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      return navigator.locks.request(LOCK_NAME, async () => {
        // Kiểm tra lại sau khi có lock — tab khác có thể đã refresh xong trong lúc chờ
        const freshToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (freshToken) {
          const remaining = msUntilRefresh(freshToken);
          if (remaining > 30_000) return freshToken;
        }

        const token = await doRefresh();
        // Phát token mới cho các tab khác qua BroadcastChannel
        if (token && bc) {
          try { bc.postMessage({ type: 'token-refreshed', token }); } catch { /* silent */ }
        }
        return token;
      });
    }

    // Fallback: không có navigator.locks → gọi thẳng
    const token = await doRefresh();
    if (token && bc) {
      try { bc.postMessage({ type: 'token-refreshed', token }); } catch { /* silent */ }
    }
    return token;
  }

  function scheduleProactiveRefresh(token: string) {
    if (proactiveTimer) clearTimeout(proactiveTimer);

    const delay = msUntilRefresh(token);
    if (delay <= 0) return; // Đã hết hạn hoặc token không hợp lệ

    proactiveTimer = setTimeout(async () => {
      try {
        const newToken = await refresher.refresh();
        // Tự lên lịch tiếp cho token mới
        if (newToken) scheduleProactiveRefresh(newToken);
      } catch {
        // Refresh thất bại — sẽ được xử lý bởi interceptor khi request tiếp theo ăn 401
      }
    }, delay);
  }

  // Lắng nghe token từ tab khác
  if (bc) {
    bc.onmessage = (event) => {
      if (event.data?.type === 'token-refreshed' && event.data.token) {
        const token = event.data.token as string;
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }
        // Cập nhật proactive timer cho token mới nhận được
        scheduleProactiveRefresh(token);
      }
    };
  }

  const refresher: SessionRefresher = {
    refresh() {
      if (!inFlight) {
        inFlight = lockedRefresh().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },

    scheduleProactiveRefresh,

    dispose() {
      if (proactiveTimer) {
        clearTimeout(proactiveTimer);
        proactiveTimer = null;
      }
      if (bc) {
        try { bc.close(); } catch { /* silent */ }
        bc = null;
      }
    },
  };

  return refresher;
}
