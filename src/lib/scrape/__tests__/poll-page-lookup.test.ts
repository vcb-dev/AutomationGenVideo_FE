/**
 * Chức năng: tra đúng kênh đang cào trong lúc poll, không phụ thuộc vào việc nó có nằm ở
 * trang đầu danh sách hay không.
 *
 * Lỗi thật: vòng poll xin `page_size: 1000` rồi tìm kênh trong trang 1. Nhưng BE chặn cứng
 * `pageSize = Math.min(100, ...)` (facebook-owned-pages-read.service.ts) — xin 1000 vẫn chỉ
 * nhận 100. Đo ngày 13/08/2026: xin 1000, `page_size` trả về đúng 100.
 *
 * Hiện có 95 kênh nên còn lọt. Vượt 100 kênh là kênh cần theo dõi rơi khỏi trang 1, `find`
 * trả undefined, vòng poll không bao giờ kết luận — quay vòng 5 phút rồi im lặng tắt, người
 * dùng nhìn thẻ quay mãi mà không có tin gì.
 *
 * Cách tra: lọc theo tên kênh rồi đối chiếu `page_id` — tên là thứ DUY NHẤT mà endpoint
 * manage-pages cho lọc (nó không nhận page_id).
 */

import { findPolledPage, pollPageFilters } from '../poll-page-lookup';

describe('pollPageFilters', () => {
    it('không xin quá mức BE cho phép', () => {
        // Xin nhiều hơn 100 là tự lừa mình: BE cắt về 100 mà không báo gì.
        expect(pollPageFilters('HuyK - Xưởng Chế Tác').page_size).toBeLessThanOrEqual(100);
    });

    it('lọc theo tên để kênh cần tìm không bị đẩy khỏi trang đầu', () => {
        expect(pollPageFilters('HuyK - Xưởng Chế Tác').search).toBe('HuyK - Xưởng Chế Tác');
    });
});

describe('findPolledPage', () => {
    const kenh = (page_id: string, name: string) => ({ page_id, name, is_scraping: false });

    it('tìm theo page_id chứ không theo tên, vì tên có thể trùng', () => {
        const danh_sach = [
            kenh('111', 'HuyK - Kim Hoàn'),
            kenh('222', 'HuyK - Kim Hoàn'),
        ];

        expect(findPolledPage(danh_sach, '222')?.page_id).toBe('222');
    });

    it('không thấy thì trả null để bên gọi biết mà dừng, không quay vô định', () => {
        expect(findPolledPage([kenh('111', 'A')], '999')).toBeNull();
    });

    it('danh sách rỗng cũng trả null chứ không nổ', () => {
        expect(findPolledPage([], '111')).toBeNull();
    });
});
