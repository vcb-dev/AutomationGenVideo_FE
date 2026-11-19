import { scraperService } from '@/services/scraperService';

describe('Video Card Hide / Restore Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('hideVideo: gửi đúng endpoint POST /scraper/videos/hide kèm platform và post_id', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', message: 'Video đã được ẩn' }),
    });
    global.fetch = mockFetch;

    const res = await scraperService.hideVideo('mock-token', 'tiktok', '7123456789', 'Không phù hợp');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/scraper/videos/hide');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer mock-token',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(options.body)).toEqual({
      platform: 'tiktok',
      post_id: '7123456789',
      reason: 'Không phù hợp',
    });
    expect(res).toEqual({ status: 'ok', message: 'Video đã được ẩn' });
  });

  it('restoreVideo: gửi đúng endpoint POST /scraper/videos/restore kèm platform và post_id', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', message: 'Video đã được khôi phục' }),
    });
    global.fetch = mockFetch;

    const res = await scraperService.restoreVideo('mock-token', 'douyin', 'dy_998877');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/scraper/videos/restore');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer mock-token',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(options.body)).toEqual({
      platform: 'douyin',
      post_id: 'dy_998877',
    });
    expect(res).toEqual({ status: 'ok', message: 'Video đã được khôi phục' });
  });

  it('getAllExternalVideos: truyền hidden=true khi xem tab Thùng rác', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 1, page: 1, total_pages: 1, videos: [] }),
    });
    global.fetch = mockFetch;

    await scraperService.getAllExternalVideos('mock-token', {
      page: 1,
      page_size: 24,
      hidden: 'true',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/scraper/all-videos?');
    expect(url).toContain('hidden=true');
  });

  it('hideVideo: throw lỗi khi server trả về !res.ok', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Lỗi server' }),
    });
    global.fetch = mockFetch;

    await expect(
      scraperService.hideVideo('mock-token', 'facebook', 'fb_123')
    ).rejects.toThrow('Lỗi server');
  });
});
