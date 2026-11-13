/**
 * Trang admin phải nói rõ vì sao một page Facebook do người khác kết nối không có video và ai phải
 * làm gì — trước đây chỉ có chữ "Cào lỗi", lý do nằm trong tooltip.
 */

import { crawlStatus, describeScrapeError, lastCrawlText } from '../facebook-page-status';

const page = (extra = {}) => ({
    is_scraping: false,
    is_backfilled: true,
    full_backfilled_at: '2026-11-12T00:00:00Z',
    scrape_error: null,
    connected_by: [] as string[],
    ...extra,
});

describe('crawlStatus', () => {
    it('đang kéo thắng mọi trạng thái khác', () => {
        expect(crawlStatus(page({ is_scraping: true, scrape_error: 'x' })).tone).toBe('running');
    });

    it('token hết hạn → nêu đúng tên người phải kết nối lại', () => {
        const s = crawlStatus(page({
            scrape_error: 'Access token Facebook đã hết hạn hoặc bị thu hồi (vào Kênh MXH kết nối lại tài khoản)',
            connected_by: ['Nguyễn Văn A'],
        }));
        expect(s).toMatchObject({ tone: 'error', label: 'Token hết hạn' });
        expect(s.detail).toContain('Nhờ Nguyễn Văn A');
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

    it('không biết ai kết nối thì nói chung, không để trống', () => {
        expect(describeScrapeError('Không giải mã được token').detail).toContain('người quản lý page');
    });

    it('lỗi lạ thì hiện nguyên văn', () => {
        expect(describeScrapeError('Facebook Graph API: Something odd')).toEqual({
            label: 'Kéo video lỗi',
            detail: 'Facebook Graph API: Something odd',
        });
    });

    it('chưa backfill lần nào → "Chưa kéo video"', () => {
        expect(crawlStatus(page({ is_backfilled: false, full_backfilled_at: null })).label).toBe('Chưa kéo video');
    });

    it('mới có video gần đây, chưa kéo đủ lịch sử → "Đang kéo bù video cũ"', () => {
        expect(crawlStatus(page({ full_backfilled_at: null })).tone).toBe('partial');
    });

    it('kéo đủ, không lỗi → ok', () => {
        expect(crawlStatus(page())).toEqual({ tone: 'ok', label: 'Đã kéo đủ', detail: null });
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
