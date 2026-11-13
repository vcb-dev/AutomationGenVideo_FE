/**
 * Trang admin phải nói rõ vì sao một page Facebook do người khác kết nối không có video và ai phải
 * làm gì — trước đây chỉ có chữ "Cào lỗi", lý do nằm trong tooltip.
 */

import { crawlStatus, describeScrapeError, isTransientError, lastCrawlText } from '../facebook-page-status';

const page = (extra = {}) => ({
    is_active: true,
    is_scraping: false,
    is_backfilled: true,
    full_backfilled_at: '2026-11-12T00:00:00Z',
    scrape_error: null,
    video_count: 10,
    connected_by: [] as string[],
    ...extra,
});

describe('crawlStatus', () => {
    it('đang kéo thắng mọi trạng thái khác', () => {
        expect(crawlStatus(page({ is_scraping: true, scrape_error: 'x' })).tone).toBe('running');
    });

    it('token hết hạn → nêu đúng tên người phải kết nối lại, và bước "Đồng bộ từ Facebook"', () => {
        const s = crawlStatus(page({
            scrape_error: 'Access token Facebook đã hết hạn hoặc bị thu hồi (vào Kênh MXH kết nối lại tài khoản)',
            connected_by: ['Nguyễn Văn A'],
        }));
        expect(s).toMatchObject({ tone: 'error', label: 'Token hết hạn', suggestRetry: true });
        expect(s.detail).toContain('Nhờ Nguyễn Văn A');
        // Kết nối lại không tự cập nhật token của trang này — phải Đồng bộ trước rồi mới Kéo lại.
        expect(s.detail).toContain('Đồng bộ từ Facebook');
    });

    it('chưa cấp quyền page → nhắc tích chọn page', () => {
        const s = crawlStatus(page({
            scrape_error: 'Tài khoản Meta chưa cấp quyền cho Page này (vào Kênh MXH kết nối lại và tích chọn Page trong popup Facebook)',
            connected_by: ['A', 'B'],
        }));
        expect(s.label).toBe('Chưa cấp quyền page');
        expect(s.detail).toContain('Nhờ A hoặc B');
        expect(s.detail).toContain('tích chọn page này');
    });

    it('người xem không có nút Kéo lại thì không bảo họ bấm', () => {
        const s = crawlStatus(page({ scrape_error: 'Access token Facebook đã hết hạn' }), false);
        expect(s.detail).not.toContain('Kéo lại');
    });

    it('không biết ai kết nối thì nói chung, không để trống', () => {
        expect(describeScrapeError('Không giải mã được token').detail).toContain('người quản lý page');
    });

    it('lỗi lạ thì hiện nguyên văn', () => {
        expect(describeScrapeError('Facebook Graph API: Something odd', [], false)).toMatchObject({
            label: 'Kéo video lỗi',
            detail: 'Facebook Graph API: Something odd',
        });
    });

    it('rate limit: không cần làm gì, không mời bấm Kéo lại', () => {
        expect(describeScrapeError('Facebook API bị giới hạn tần suất (Rate limit).').suggestRetry).toBe(false);
    });

    it('lỗi tạm thời cũ ("Lỗi không xác định", ECONNREFUSED…) KHÔNG báo đỏ', () => {
        // DB 18/10: 113/118 page mang "Lỗi không xác định" — đó là AI không trả lời, không phải lỗi page.
        expect(crawlStatus(page({ scrape_error: 'Lỗi không xác định' })).tone).toBe('ok');
        expect(crawlStatus(page({ scrape_error: 'Không kết nối được dịch vụ AI (ECONNREFUSED)' })).tone).toBe('ok');
        expect(crawlStatus(page({ scrape_error: 'Request failed with status code 502' })).tone).toBe('ok');
    });

    it('chưa kéo lần nào và chưa có video → "Chưa kéo video", mời bấm', () => {
        const s = crawlStatus(page({ is_backfilled: false, full_backfilled_at: null, video_count: 0 }));
        expect(s).toMatchObject({ label: 'Chưa kéo video', suggestRetry: true });
    });

    it('có video nhưng is_backfilled chưa bật → không nói "Chưa kéo video"', () => {
        expect(crawlStatus(page({ is_backfilled: false, full_backfilled_at: null, video_count: 20 })).tone).toBe('partial');
    });

    it('mới có video gần đây → "Chờ kéo bù video cũ", không mời bấm (hệ thống tự kéo)', () => {
        expect(crawlStatus(page({ full_backfilled_at: null }))).toMatchObject({
            tone: 'partial',
            label: 'Chờ kéo bù video cũ',
            suggestRetry: false,
        });
    });

    it('page tắt thì không hứa "kéo bù tự động"', () => {
        expect(crawlStatus(page({ full_backfilled_at: null, is_active: false })).detail).toContain('đang tắt');
    });

    it('kéo đủ, không lỗi → ok', () => {
        expect(crawlStatus(page())).toEqual({ tone: 'ok', label: 'Đã kéo đủ', detail: null, suggestRetry: false });
    });
});

describe('isTransientError', () => {
    it('lỗi thật của Facebook không phải tạm thời', () => {
        expect(isTransientError('Access token Facebook đã hết hạn')).toBe(false);
        expect(isTransientError(null)).toBe(false);
    });
});

describe('lastCrawlText (giờ Việt Nam)', () => {
    const now = new Date('2026-11-13T03:00:00Z'); // 10:00 13/11 giờ VN

    it('chưa kéo', () => expect(lastCrawlText(null, now)).toBe('Chưa kéo lần nào'));
    it('hôm nay', () => expect(lastCrawlText('2026-11-13T01:15:00Z', now)).toBe('Hôm nay 08:15'));
    it('17:30 UTC hôm trước đã là hôm nay giờ VN', () => expect(lastCrawlText('2026-11-12T17:30:00Z', now)).toBe('Hôm nay 00:30'));
    it('hôm qua', () => expect(lastCrawlText('2026-11-11T23:30:00Z', now)).toBe('Hôm qua 06:30'));
    it('lâu hơn', () => expect(lastCrawlText('2026-11-09T01:00:00Z', now)).toBe('4 ngày trước'));
});
