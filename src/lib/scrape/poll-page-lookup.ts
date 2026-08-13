/**
 * Tra kênh đang cào trong lúc poll trạng thái.
 *
 * Vòng poll cũ xin `page_size: 1000` rồi tìm kênh trong trang 1. BE chặn cứng ở 100
 * (`Math.min(100, ...)` trong facebook-owned-pages-read.service.ts) và cắt im lặng — đo ngày
 * 13/08/2026: xin 1000, nhận đúng 100. Hiện 95 kênh nên còn lọt; quá 100 kênh là kênh cần theo
 * dõi rơi khỏi trang đầu và vòng poll không bao giờ kết luận được.
 *
 * Nên lọc trước theo TÊN cho danh sách ngắn lại rồi mới đối chiếu `page_id` — endpoint
 * manage-pages chỉ cho lọc theo tên, không nhận page_id.
 */

import type { ScrapedPage } from './scrape-outcome';

/** Trần `page_size` mà BE chấp nhận; xin hơn cũng bị cắt về đây mà không báo. */
export const MAX_PAGE_SIZE = 100;

export function pollPageFilters(pageName: string) {
    return { page: 1, page_size: MAX_PAGE_SIZE, search: pageName };
}

/**
 * Đối chiếu theo `page_id`, không theo tên: nhiều kênh trùng tên là chuyện thường ở đây
 * (rất nhiều kênh cùng mở đầu bằng "HuyK - ").
 */
export function findPolledPage<T extends Pick<ScrapedPage, 'page_id'>>(
    pages: T[],
    pageId: string,
): T | null {
    return pages.find((p) => p.page_id === pageId) ?? null;
}
