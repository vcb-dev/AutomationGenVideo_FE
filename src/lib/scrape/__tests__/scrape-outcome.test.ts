/**
 * Chức năng: đọc kết quả một lượt cào kênh nội bộ — xong thật hay hỏng.
 *
 * Lỗi thật đã đo được ngày 13/08/2026: trang Kênh nội bộ → Facebook chỉ nhìn `is_scraping` để
 * biết lượt cào kết thúc chưa, rồi bắn toast xanh "Cào xong <tên>: <n> video" — KHÔNG hề đọc
 * `scrape_error`. Cào hỏng và cào xong trông giống hệt nhau.
 *
 * Hậu quả trong DB lúc kiểm tra: 93/95 kênh mang `scrape_error = "Request failed with status
 * code 502"` từ 2026-08-06 mà không ai biết, vì chế độ xem mặc định là thẻ (card) và thẻ không
 * hiển thị `scrape_error` — chỉ chế độ bảng mới có.
 */

import { scrapeOutcome } from '../scrape-outcome';

const kenh = (chen: Partial<Parameters<typeof scrapeOutcome>[0]> = {}) => ({
    page_id: '123',
    name: 'HuyK - Xưởng Chế Tác',
    is_scraping: false,
    scrape_error: null,
    video_count: 448,
    ...chen,
});

describe('scrapeOutcome', () => {
    it('đang cào thì chưa kết luận gì', () => {
        expect(scrapeOutcome(kenh({ is_scraping: true })).kind).toBe('running');
    });

    it('cào xong sạch lỗi thì báo thành công kèm số video', () => {
        const ket_qua = scrapeOutcome(kenh());

        expect(ket_qua.kind).toBe('done');
        expect(ket_qua.message).toContain('HuyK - Xưởng Chế Tác');
        expect(ket_qua.message).toContain('448');
    });

    it('có scrape_error thì KHÔNG được báo thành công', () => {
        const ket_qua = scrapeOutcome(kenh({ scrape_error: 'Request failed with status code 502' }));

        // Đây đúng là ca bản cũ bắn toast xanh.
        expect(ket_qua.kind).toBe('failed');
        expect(ket_qua.message).not.toContain('Cào xong');
    });

    it('câu báo lỗi phải nhắc lại lý do để người dùng biết đường xử lý', () => {
        const ket_qua = scrapeOutcome(kenh({ scrape_error: 'Request failed with status code 502' }));

        expect(ket_qua.message).toContain('502');
        expect(ket_qua.message).toContain('HuyK - Xưởng Chế Tác');
    });

    it('dừng cào mà lỗi rỗng thì vẫn tính là xong', () => {
        expect(scrapeOutcome(kenh({ scrape_error: '' })).kind).toBe('done');
    });

    it('chưa có số video thì báo 0 chứ không báo undefined', () => {
        const ket_qua = scrapeOutcome(kenh({ video_count: undefined }));

        expect(ket_qua.kind).toBe('done');
        expect(ket_qua.message).toContain('0');
        expect(ket_qua.message).not.toContain('undefined');
    });

    it('lỗi được ưu tiên hơn is_scraping đã tắt', () => {
        const ket_qua = scrapeOutcome(kenh({ is_scraping: false, scrape_error: 'token hết hạn' }));

        expect(ket_qua.kind).toBe('failed');
    });
});
