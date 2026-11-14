/**
 * Trạng thái kéo video của một page Facebook nội bộ, viết cho người đọc ở trang admin.
 *
 * Trước đây thẻ page chỉ có chữ "Cào lỗi" (lý do nằm trong tooltip), còn page chưa có video thì
 * im lặng — admin thấy page do người khác kết nối mà không biết vì sao không có video, cũng không
 * biết phải nhờ ai sửa. Ở đây gom một chỗ: page đang ở tình trạng nào, vì sao, và ai phải làm gì.
 * Chế độ thẻ và chế độ bảng cùng đọc từ đây để không bao giờ nói hai điều khác nhau.
 */

export interface CrawlablePage {
    is_active?: boolean;
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
    /** Nên đẩy nút "Kéo lại" lên làm nút chính không */
    suggestRetry: boolean;
}

/**
 * Lỗi hạ tầng tạm thời (AI khởi động lại, mạng chập chờn) — hệ thống tự thử lại ở lượt sau, không
 * báo đỏ. BE đã không lưu các lỗi này nữa, nhưng bản ghi cũ còn: trên DB 18/10, 113/118 page mang
 * "Lỗi không xác định" — đó là AI không trả lời, không phải lỗi của page.
 */
export function isTransientError(msg?: string | null): boolean {
    if (!msg) return false;
    const lower = msg.toLowerCase().trim();
    return (
        lower === 'lỗi không xác định' ||
        lower.includes('không kết nối được dịch vụ ai') ||
        lower.includes('status code 502') ||
        lower.includes('status code 503') ||
        lower.includes('status code 504') ||
        lower.includes('status code 429') ||
        lower.includes('too many requests') ||
        lower.includes('econnrefused') ||
        lower.includes('etimedout') ||
        lower.includes('timedout') ||
        lower.includes('timeout') ||
        lower.includes('econnreset') ||
        lower.includes('enotfound') ||
        lower.includes('network error') ||
        lower.includes('nameresolutionerror') ||
        lower.includes('connectionpool') ||
        lower.includes('max retries exceeded') ||
        lower.includes('temporary failure in name resolution') ||
        lower.includes('getaddrinfo') ||
        lower.includes('socket hang up') ||
        lower.includes('aborted')
    );
}

/** Ai phải kết nối lại: tên người đã kết nối page ở Đăng bài MXH, không có thì nói chung. */
function whoReconnects(connectedBy?: string[]): string {
    const names = (connectedBy ?? []).filter(Boolean);
    if (!names.length) return 'người quản lý page';
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} hoặc ${names[names.length - 1]}`;
}

/**
 * Biến lỗi lưu ở `scrape_error` (AI đã dịch sẵn lỗi Graph API) thành nhãn + việc cần làm.
 * `canRetry` = người đang xem có nút "Kéo lại"; không có thì không bảo họ bấm.
 */
export function describeScrapeError(
    error: string,
    connectedBy?: string[],
    canRetry = true,
): { label: string; detail: string; suggestRetry: boolean } {
    const lower = error.toLowerCase();
    const who = whoReconnects(connectedBy);
    const reconnect = `Nhờ ${who} vào Đăng bài MXH → Kênh, kết nối lại Facebook`;
    // Kết nối lại chỉ cập nhật token ở Đăng bài MXH; token của trang này được lấy lại khi bấm
    // "Đồng bộ từ Facebook" (hoặc lượt tự động 6h sáng). Bấm Kéo lại ngay thì vẫn dùng token cũ.
    const after = canRetry
        ? 'Sau đó bấm "Đồng bộ từ Facebook" ở đầu trang rồi "Kéo lại".'
        : 'Hệ thống sẽ tự lấy token mới lúc 6h sáng hôm sau.';

    if (lower.includes('chưa cấp quyền cho page')) {
        return { label: 'Chưa cấp quyền page', detail: `${reconnect} và tích chọn page này trong cửa sổ Facebook. ${after}`, suggestRetry: true };
    }
    if (lower.includes('hết hạn') || lower.includes('thu hồi') || lower.includes('không giải mã được token')) {
        return { label: 'Token hết hạn', detail: `${reconnect}. ${after}`, suggestRetry: true };
    }
    if (lower.includes('thiếu quyền')) {
        return { label: 'Thiếu quyền', detail: `${reconnect} và cấp đủ quyền khi Facebook hỏi. ${after} Chi tiết: ${error}`, suggestRetry: true };
    }
    if (lower.includes('giới hạn tần suất') || lower.includes('rate limit')) {
        return { label: 'Facebook tạm chặn', detail: 'Facebook đang giới hạn số lần gọi. Hệ thống tự kéo lại ở lượt sau, không cần làm gì.', suggestRetry: false };
    }
    return {
        label: 'Kéo video lỗi',
        detail: canRetry ? `${error} — Bấm "Kéo lại"; nếu vẫn lỗi, báo bộ phận kỹ thuật kèm tên page.` : error,
        suggestRetry: true,
    };
}

export function crawlStatus(page: CrawlablePage, canRetry = true): CrawlStatus {
    if (page.is_scraping) {
        return { tone: 'running', label: 'Đang kéo video', detail: null, suggestRetry: false };
    }
    if (page.scrape_error && !isTransientError(page.scrape_error)) {
        return { tone: 'error', ...describeScrapeError(page.scrape_error, page.connected_by, canRetry) };
    }
    const inactive = page.is_active === false;
    if (!page.is_backfilled && !(page.video_count ?? 0)) {
        return {
            tone: 'idle',
            label: 'Chưa kéo video',
            detail: inactive
                ? 'Page đang tắt nên hệ thống không tự kéo.'
                : canRetry
                    ? 'Hệ thống sẽ tự kéo trong lượt chạy tới. Muốn có ngay thì bấm "Kéo lại".'
                    : 'Hệ thống sẽ tự kéo trong lượt chạy tới.',
            suggestRetry: true,
        };
    }
    if (!page.full_backfilled_at) {
        return {
            tone: 'partial',
            label: 'Chờ kéo bù video cũ',
            detail: inactive
                ? 'Đã có video gần đây. Page đang tắt nên video cũ hơn không được kéo bù.'
                : 'Đã có video gần đây. Video cũ hơn sẽ được kéo bù tự động (mỗi page một lượt, có thể mất vài giờ cho cả hệ thống).',
            suggestRetry: false,
        };
    }
    return { tone: 'ok', label: 'Đã kéo đủ', detail: null, suggestRetry: false };
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
