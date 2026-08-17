import {
  CSRF_HEADER,
  createSessionRefresher,
  csrfHeader,
  getJwtExp,
  msUntilRefresh,
  readCookie,
  shouldAttemptRefresh,
} from '../refresh-session';

// ─── shouldAttemptRefresh ───────────────────────────────────────────────────

describe('shouldAttemptRefresh', () => {
  it('401 ở một request thường thì thử làm mới phiên', () => {
    expect(shouldAttemptRefresh(401, '/lucky-spin/seci/state', false)).toBe(true);
  });

  it('lỗi khác 401 thì không đụng tới phiên', () => {
    expect(shouldAttemptRefresh(500, '/lucky-spin/seci/state', false)).toBe(false);
    expect(shouldAttemptRefresh(403, '/lucky-spin/seci/state', false)).toBe(false);
    expect(shouldAttemptRefresh(undefined, '/lucky-spin/seci/state', false)).toBe(false);
  });

  it('thử một lần rồi vẫn 401 thì thôi — phiên chết thật', () => {
    expect(shouldAttemptRefresh(401, '/lucky-spin/seci/state', true)).toBe(false);
  });

  it('KHÔNG làm mới cho chính request refresh — chặn vòng lặp vô hạn', () => {
    expect(shouldAttemptRefresh(401, '/auth/refresh', false)).toBe(false);
  });

  it('KHÔNG làm mới khi đăng nhập sai mật khẩu', () => {
    expect(shouldAttemptRefresh(401, '/auth/login', false)).toBe(false);
    expect(shouldAttemptRefresh(401, '/auth/logout', false)).toBe(false);
  });

  it('nhận ra đường dẫn đầy đủ chứ không chỉ đường dẫn tương đối', () => {
    expect(shouldAttemptRefresh(401, 'http://localhost:3000/api/auth/refresh', false)).toBe(false);
  });
});

// ─── readCookie ─────────────────────────────────────────────────────────────

describe('readCookie', () => {
  const COOKIES = 'vcbi_csrf=abc123; other=xyz; vcbi_at=khong-doc-duoc';

  it('lấy đúng cookie theo tên', () => {
    expect(readCookie('vcbi_csrf', COOKIES)).toBe('abc123');
  });

  it('không có thì trả null, không ném lỗi', () => {
    expect(readCookie('khong_ton_tai', COOKIES)).toBeNull();
    expect(readCookie('vcbi_csrf', '')).toBeNull();
  });

  it('không nhầm cookie có tên là phần đuôi của tên khác', () => {
    expect(readCookie('csrf', COOKIES)).toBeNull();
  });

  it('giải mã giá trị vì Express tự mã hoá lúc ghi cookie', () => {
    expect(readCookie('t', 't=a%20b')).toBe('a b');
  });
});

// ─── csrfHeader ─────────────────────────────────────────────────────────────

describe('csrfHeader', () => {
  it('gửi đúng MỘT giá trị, không nối chuỗi', () => {
    const header = csrfHeader('vcbi_csrf=tok');
    expect(header).toEqual({ [CSRF_HEADER]: 'tok' });
    expect(header[CSRF_HEADER]).not.toContain(',');
  });

  it('chưa có cookie CSRF thì không gửi header rỗng', () => {
    expect(csrfHeader('')).toEqual({});
  });
});

// ─── getJwtExp & msUntilRefresh (Proactive Refresh) ─────────────────────────

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe('getJwtExp', () => {
  it('đọc exp từ JWT payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(getJwtExp(makeJwt({ sub: '123', exp }))).toBe(exp);
  });

  it('trả null khi token không có exp', () => {
    expect(getJwtExp(makeJwt({ sub: '123' }))).toBeNull();
  });

  it('trả null khi token không phải JWT', () => {
    expect(getJwtExp('not-a-jwt')).toBeNull();
    expect(getJwtExp('')).toBeNull();
  });
});

describe('msUntilRefresh', () => {
  it('trả khoảng thời gian đúng (trừ buffer)', () => {
    const exp = Math.floor(Date.now() / 1000) + 600; // 10 phút nữa hết hạn
    const ms = msUntilRefresh(makeJwt({ exp }), 120); // buffer 2 phút
    // Kỳ vọng: ~8 phút = ~480_000ms (cho phép sai số 5 giây)
    expect(ms).toBeGreaterThan(475_000);
    expect(ms).toBeLessThanOrEqual(480_000);
  });

  it('trả 0 khi token đã quá hạn', () => {
    const exp = Math.floor(Date.now() / 1000) - 100; // hết hạn 100 giây trước
    expect(msUntilRefresh(makeJwt({ exp }))).toBe(0);
  });

  it('trả 0 khi token không hợp lệ', () => {
    expect(msUntilRefresh('garbage')).toBe(0);
  });

  it('trả 0 khi thời gian còn lại nhỏ hơn buffer', () => {
    const exp = Math.floor(Date.now() / 1000) + 60; // 1 phút nữa hết hạn
    expect(msUntilRefresh(makeJwt({ exp }), 120)).toBe(0); // buffer 2 phút > 1 phút
  });
});

// ─── createSessionRefresher ─────────────────────────────────────────────────

describe('createSessionRefresher', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('nhiều request cùng 401 chỉ gọi mạng MỘT lần (in-tab dedup)', async () => {
    let calls = 0;
    let resolveIt: (v: string) => void = () => {};
    const refresher = createSessionRefresher(() => {
      calls++;
      return new Promise<string>((resolve) => {
        resolveIt = resolve;
      });
    });

    const waiting = [refresher.refresh(), refresher.refresh(), refresher.refresh()];
    resolveIt('token-moi');

    expect(await Promise.all(waiting)).toEqual(['token-moi', 'token-moi', 'token-moi']);
    expect(calls).toBe(1);
    refresher.dispose();
  });

  it('xong lần này thì lần sau vẫn gọi lại được', async () => {
    let calls = 0;
    const refresher = createSessionRefresher(async () => {
      calls++;
      return `token-${calls}`;
    });

    expect(await refresher.refresh()).toBe('token-1');
    expect(await refresher.refresh()).toBe('token-2');
    expect(calls).toBe(2);
    refresher.dispose();
  });

  it('một lần làm mới hỏng không được khoá vĩnh viễn các lần sau', async () => {
    let calls = 0;
    const refresher = createSessionRefresher(async () => {
      calls++;
      if (calls === 1) throw new Error('mạng rớt');
      return 'token-cuu-duoc';
    });

    await expect(refresher.refresh()).rejects.toThrow('mạng rớt');
    expect(await refresher.refresh()).toBe('token-cuu-duoc');
    refresher.dispose();
  });

  it('scheduleProactiveRefresh tự động gọi refresh khi timer chạy', async () => {
    jest.useFakeTimers();
    let calls = 0;
    const refresher = createSessionRefresher(async () => {
      calls++;
      return 'new-token';
    });

    // Token hết hạn trong 5 phút, buffer 2 phút → timer ~3 phút
    const exp = Math.floor(Date.now() / 1000) + 300;
    refresher.scheduleProactiveRefresh(makeJwt({ exp }));

    expect(calls).toBe(0);

    // Nhảy qua 3 phút
    jest.advanceTimersByTime(180_100);
    // Timer chạy async, cần flush microtasks
    await Promise.resolve();

    expect(calls).toBe(1);
    refresher.dispose();
  });

  it('dispose dọn sạch timer', () => {
    jest.useFakeTimers();
    let calls = 0;
    const refresher = createSessionRefresher(async () => {
      calls++;
      return 'tok';
    });

    const exp = Math.floor(Date.now() / 1000) + 300;
    refresher.scheduleProactiveRefresh(makeJwt({ exp }));
    refresher.dispose();

    jest.advanceTimersByTime(400_000);
    expect(calls).toBe(0); // Timer đã bị dọn
  });
});
