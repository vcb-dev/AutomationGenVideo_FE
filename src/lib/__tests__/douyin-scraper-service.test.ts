import { scraperService } from '../../services/scraperService';

describe('scraperService.douyinProfileScrape', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('gửi đúng payload sec_user_id và num_of_posts khi gọi thành công', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'ok',
        message: 'Đang cập nhật video mới...',
        profile_id: 123,
      }),
    } as any);

    const res = await scraperService.douyinProfileScrape('fake-token', 'MS4wLjAB_valid', 5, false);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/scraper/douyin/profile/scrape/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          sec_user_id: 'MS4wLjAB_valid',
          num_of_posts: 5,
          is_owned: false,
        }),
      }),
    );
    expect(res.status).toBe('ok');
    expect(res.profile_id).toBe(123);
  });

  it('bắt đúng body.message khi backend trả lỗi (ví dụ link hết hạn)', async () => {
    const errorMsg = 'Link Douyin này không tồn tại, đã hết hạn hoặc chỉ trỏ về trang chủ.';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        statusCode: 400,
        message: errorMsg,
      }),
    } as any);

    await expect(
      scraperService.douyinProfileScrape('fake-token', 'https://v.douyin.com/BZdN8kxKBJM/'),
    ).rejects.toThrow(errorMsg);
  });

  it('bắt đúng body.error nếu backend trả dạng { error: "..." }', async () => {
    const errorMsg = 'Không tìm thấy video cho sec_user_id này';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: errorMsg,
      }),
    } as any);

    await expect(
      scraperService.douyinProfileScrape('fake-token', 'MS4wLjAB_invalid'),
    ).rejects.toThrow(errorMsg);
  });
});
