/**
 * Kiểm thử helper bóc tách thông điệp lỗi API khi cào kênh đối thủ (Douyin, XHS...)
 * Đảm bảo ưu tiên body.error hoặc body.message do Backend NestJS trả về, fallback thông báo mặc định.
 */

export function extractScraperErrorMessage(body: any, defaultMsg: string): string {
  return body?.error || body?.message || defaultMsg;
}

describe('extractScraperErrorMessage', () => {
  it('ưu tiên trả về body.error nếu có', () => {
    const body = { error: 'Không lấy được tài khoản Douyin' };
    expect(extractScraperErrorMessage(body, 'Lỗi mặc định')).toBe('Không lấy được tài khoản Douyin');
  });

  it('fallback về body.message nếu không có body.error (chuẩn NestJS Exception)', () => {
    const body = { statusCode: 400, message: 'Username Threads không hợp lệ.' };
    expect(extractScraperErrorMessage(body, 'Lỗi mặc định')).toBe('Username Threads không hợp lệ.');
  });

  it('fallback về defaultMsg nếu body rỗng hoặc null', () => {
    expect(extractScraperErrorMessage(null, 'Không thể cào profile Douyin')).toBe('Không thể cào profile Douyin');
    expect(extractScraperErrorMessage({}, 'Không thể cào profile Douyin')).toBe('Không thể cào profile Douyin');
  });
});
