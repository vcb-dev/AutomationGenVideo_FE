/**
 * Bỏ video trùng khi nối các trang của danh sách cuộn vô tận.
 *
 * Vì sao cần: các danh sách này phân trang kiểu LIMIT/OFFSET. Trong lúc job cào đang chạy,
 * mỗi video mới chèn vào mà xếp TRƯỚC vị trí đang xem sẽ đẩy toàn bộ danh sách xuống — trang
 * sau vì thế lặp lại đúng bấy nhiêu video ở cuối trang trước. Đã tái hiện được: chèn 5 video
 * lúc đang lật trang → trang 2 lặp lại đúng 5 video của trang 1.
 *
 * Đây là lưới an toàn ở phía hiển thị. Nó KHÔNG sửa được việc một số video bị đẩy qua khỏi
 * cửa sổ và không bao giờ hiện ra — muốn hết hẳn thì phải chốt mốc thời gian cho cả phiên
 * cuộn (hoặc chuyển sang phân trang theo con trỏ), là thay đổi lớn hơn ở cả FE lẫn BE.
 */

/** Các tên khoá định danh mà những danh sách khác nhau đang dùng. */
const ID_KEYS = ['post_id', 'video_id', 'note_id', 'shortcode', 'id', 'url'] as const;

function identityOf(item: unknown): string | null {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    for (const key of ID_KEYS) {
        const value = record[key];
        if (typeof value === 'string' && value) return `${key}:${value}`;
        if (typeof value === 'number') return `${key}:${value}`;
    }
    return null;
}

/**
 * Giữ nguyên thứ tự, bỏ những phần tử đã gặp. Phần tử không có khoá định danh nào thì giữ
 * lại (thà hiện thừa còn hơn nuốt mất dữ liệu).
 */
export function dedupeById<T>(items: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
        const id = identityOf(item);
        if (id === null) {
            out.push(item);
            continue;
        }
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(item);
    }
    return out;
}
