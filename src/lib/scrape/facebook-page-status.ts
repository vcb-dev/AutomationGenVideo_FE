/**
 * Trạng thái kéo video của một page Facebook nội bộ, viết cho người đọc ở trang admin.
 *
 * Trước đây thẻ page chỉ có chữ "Cào lỗi" (lý do nằm trong tooltip), còn page chưa có video thì
 * im lặng — admin thấy page do người khác kết nối mà không biết vì sao không có video, cũng không
 * biết phải nhờ ai sửa. Ở đây gom một chỗ: page đang ở tình trạng nào, vì sao, và ai phải làm gì.
 */

export interface CrawlablePage {
    is_scraping?: boolean;
    is_backfilled?: boolean;
    full_backfilled_at?: string | null;
    last_scraped_at?: string | null;
    scrape_error?: string | null;
    video_count?: number | null;
    connected_by?: string[];
}

export type CrawlTone = 'running' | 'error' | 'idle' | 'partial' | 'ok';

export interface CrawlStatus {
    tone: CrawlTone;
    /** Nhãn ngắn trên thẻ */
    label: string;
    /** Câu giải thích + việc cần làm; null khi không có gì phải làm */
    detail: string | null;
}

/** Ai phải kết nối lại: tên người đã kết nối page ở Đăng bài MXH, không có thì nói chung. */
function whoReconnects(connectedBy?: string[]): string {
    const names = (connectedBy ?? []).filter(Boolean);
    if (!names.length) return 'người quản lý page';
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} hoặc ${names[names.length - 1]}`;
}

/** Biến lỗi lưu ở `scrape_error` (AI đã dịch sẵn lỗi Graph API) thành nhãn + việc cần làm. */
export function describeScrapeError(error: string, connectedBy?: string[]): { label: string; detail: string } {
    const lower = error.toLowerCase();
    const who = whoReconnects(connectedBy);
    const reconnect = `Nhờ ${who} vào Đăng bài MXH → Kênh, kết nối lại Facebook`;

    if (lower.includes('chưa cấp quyền cho page')) {
        return { label: 'Chưa cấp quyền page', detail: `${reconnect} và tích chọn page này trong cửa sổ Facebook.` };
    }
    if (lower.includes('hết hạn') || lower.includes('thu hồi') || lower.includes('không giải mã được token')) {
        return { label: 'Token hết hạn', detail: `${reconnect}. Sau đó bấm "Kéo lại".` };
    }
    if (lower.includes('thiếu quyền')) {
        return { label: 'Thiếu quyền', detail: `${reconnect} và cấp đủ quyền khi Facebook hỏi. Chi tiết: ${error}` };
    }
    if (lower.includes('giới hạn tần suất') || lower.includes('rate limit')) {
        return { label: 'Facebook tạm chặn', detail: 'Facebook đang giới hạn số lần gọi. Hệ thống tự kéo lại ở lượt sau, không cần làm gì.' };
    }
    if (lower.includes('không xác định')) {
        return { label: 'Lỗi không rõ', detail: 'Bấm "Kéo lại". Nếu vẫn lỗi, báo bộ phận kỹ thuật kèm tên page.' };
    }
    return { label: 'Kéo video lỗi', detail: error };
}

export function crawlStatus(page: CrawlablePage): CrawlStatus {
    if (page.is_scraping) {
        return { tone: 'running', label: 'Đang kéo video', detail: null };
    }
    if (page.scrape_error) {
        return { tone: 'error', ...describeScrapeError(page.scrape_error, page.connected_by) };
    }
    if (!page.is_backfilled) {
        return {
            tone: 'idle',
            label: 'Chưa kéo video',
            detail: 'Hệ thống sẽ tự kéo trong lượt chạy tới. Muốn có ngay thì bấm "Kéo lại".',
        };
    }
    if (!page.full_backfilled_at) {
        return {
            tone: 'partial',
            label: 'Đang kéo bù video cũ',
            detail: 'Đã có video gần đây. Video cũ hơn đang được kéo bù tự động.',
        };
    }
    return { tone: 'ok', label: 'Đã kéo đủ', detail: null };
}

/** "Hôm nay 08:15", "Hôm qua 06:30", "3 ngày trước", hoặc "Chưa kéo lần nào". */
export function lastCrawlText(iso?: string | null, now: Date = new Date()): string {
    if (!iso) return 'Chưa kéo lần nào';
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return 'Chưa kéo lần nào';
    const hhmm = at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
    const dayOf = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const days = Math.round((Date.parse(dayOf(now)) - Date.parse(dayOf(at))) / 86_400_000);
    if (days <= 0) return `Hôm nay ${hhmm}`;
    if (days === 1) return `Hôm qua ${hhmm}`;
    return `${days} ngày trước`;
}
