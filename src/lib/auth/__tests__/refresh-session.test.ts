import {
  CSRF_HEADER,
  createSessionRefresher,
  csrfHeader,
  readCookie,
  shouldAttemptRefresh,
} from '../refresh-session';

/**
 * Giữ phiên sống qua mốc 15 phút.
 *
 * Access token của BE sống 15 phút, refresh token sống 7 ngày. Trước đây FE gặp 401 là xoá
 * localStorage rồi chuyển thẳng sang /login, nên cứ đúng 15 phút người dùng bị đá ra giữa lúc
 * đang làm việc — dù phiên của họ còn hiệu lực tới 7 ngày.
 *
 * Ba ca dưới đây là ba cái bẫy khiến "sửa xong vẫn lỗi": refresh chồng chéo làm token bị xoay
 * vòng nhiều lần, refresh gọi lại chính nó thành vòng lặp vô hạn, và header CSRF gửi sai.
 */

describe('shouldAttemptRefresh', () => {
  it('401 ở một request thường thì thử làm mới phiên', () => {
    expect(shouldAttemptRefresh(401, '/lucky-spin/seci/state', false)).toBe(true);
  });

  it('lỗi khác 401 thì không đụng tới phiên', () => {
    expect(shouldAttemptRefresh(500, '/lucky-spin/seci/state', false)).toBe(false);
    expect(shouldAttemptRefresh(403, '/lucky-spin/seci/state', false)).toBe(false);
    expect(shouldAttemptRefresh(undefined, '/lucky-spin/seci/state', false)).toBe(false);
  });

  it('thử một lần rồi vẫn 401 thì thôi — phiên chết thật, không phải token hết hạn', () => {
    expect(shouldAttemptRefresh(401, '/lucky-spin/seci/state', true)).toBe(false);
  });

  it('KHÔNG làm mới cho chính request refresh — đây là chỗ sinh vòng lặp vô hạn', () => {
    expect(shouldAttemptRefresh(401, '/auth/refresh', false)).toBe(false);
  });

  it('KHÔNG làm mới khi đăng nhập sai mật khẩu — phải để lỗi hiện cho người dùng thấy', () => {
    expect(shouldAttemptRefresh(401, '/auth/login', false)).toBe(false);
    expect(shouldAttemptRefresh(401, '/auth/logout', false)).toBe(false);
  });

  it('nhận ra đường dẫn đầy đủ chứ không chỉ đường dẫn tương đối', () => {
    expect(shouldAttemptRefresh(401, 'http://localhost:3000/api/auth/refresh', false)).toBe(false);
  });
});

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

describe('csrfHeader', () => {
  it('gửi đúng MỘT giá trị, không nối chuỗi', () => {
    // CsrfGuard bên BE so thẳng header với cookie; Node nối hai header trùng tên thành
    // "tok, tok" nên gửi lặp là ăn 403 vĩnh viễn mà devtools vẫn hiện giá trị trông đúng.
    const header = csrfHeader('vcbi_csrf=tok');

    expect(header).toEqual({ [CSRF_HEADER]: 'tok' });
    expect(header[CSRF_HEADER]).not.toContain(',');
  });

  it('chưa có cookie CSRF thì không gửi header rỗng', () => {
    expect(csrfHeader('')).toEqual({});
  });
});

describe('createSessionRefresher', () => {
  it('nhiều request cùng 401 chỉ gọi mạng MỘT lần', async () => {
    // Phút thứ 15 cả loạt request song song cùng hỏng. Mỗi cái tự gọi refresh thì refresh
    // token bị xoay vòng liên tiếp, BE thu hồi token cũ sau mỗi lần xoay, và những request
    // chậm chân cầm token đã chết — vẫn văng ra login.
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
  });

  it('một lần làm mới hỏng không được khoá vĩnh viễn các lần sau', async () => {
    // Bỏ dọn ở nhánh lỗi thì người dùng kẹt luôn: mọi lần thử sau đều bám vào promise hỏng cũ.
    let calls = 0;
    const refresher = createSessionRefresher(async () => {
      calls++;
      if (calls === 1) throw new Error('mạng rớt');
      return 'token-cuu-duoc';
    });

    await expect(refresher.refresh()).rejects.toThrow('mạng rớt');
    expect(await refresher.refresh()).toBe('token-cuu-duoc');
  });
});
