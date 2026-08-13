/**
 * Đọc kết quả một lượt cào kênh nội bộ từ bản ghi kênh mà API trả về.
 *
 * Để ở một chỗ duy nhất vì trang Kênh nội bộ từng tự trả lời câu hỏi "cào xong chưa" bằng mỗi
 * `is_scraping`, bỏ qua `scrape_error` — nên một lượt cào hỏng và một lượt cào thành công cho
 * ra cùng một toast xanh. Lúc kiểm tra ngày 13/08/2026 có 93/95 kênh đang mang lỗi 502 mà không
 * ai biết: chế độ xem mặc định là thẻ, mà thẻ không hiển thị `scrape_error`.
 *
 * `is_scraping` chỉ nói lượt cào đã DỪNG chưa. Dừng vì xong hay dừng vì hỏng thì phải hỏi
 * `scrape_error`.
 */

export interface ScrapedPage {
    page_id: string;
    name: string;
    is_scraping?: boolean;
    scrape_error?: string | null;
    video_count?: number | null;
}

export type ScrapeOutcome =
    | { kind: 'running'; message: null }
    | { kind: 'done'; message: string }
    | { kind: 'failed'; message: string };

export function scrapeOutcome(page: ScrapedPage): ScrapeOutcome {
    if (page.is_scraping) {
        return { kind: 'running', message: null };
    }

    // Lỗi thắng: lượt cào có thể dừng đúng lúc nhưng dừng vì hỏng.
    if (page.scrape_error) {
        return {
            kind: 'failed',
            message: `Cào ${page.name} thất bại: ${page.scrape_error}`,
        };
    }

    return {
        kind: 'done',
        message: `Cào xong ${page.name}: ${page.video_count ?? 0} video`,
    };
}
