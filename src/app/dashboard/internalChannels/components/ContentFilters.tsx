'use client';

/**
 * Hai ô lọc dùng chung cho MỌI trang kênh nội bộ: thị trường (VN / Global) và tuyến nội
 * dung (A1–A5). Cả 5 trang nội bộ đều gọi cùng một endpoint `scraper/owned/videos`, nên
 * đặt ở một chỗ thay vì dán lại năm lần.
 *
 * Lọc được làm Ở SERVER, không phải ở đây. Nếu lọc trên danh sách đã tải về thì trang 1
 * lấy 24 video rồi lọc còn 3 — người dùng tưởng chỉ có 3 video thuộc tuyến đó, trong khi
 * thực tế còn hàng nghìn ở các trang sau.
 */

/** Đúng bộ tuyến mà đội nội dung đang gắn vào caption dưới dạng #A1…#A5. */
export const TUYEN_NOI_DUNG = ['A1', 'A2', 'A3', 'A4', 'A5'] as const;

export default function ContentFilters({
    market,
    onMarketChange,
    contentLine,
    onContentLineChange,
}: {
    market: string;
    onMarketChange: (v: string) => void;
    contentLine: string;
    onContentLineChange: (v: string) => void;
}) {
    const oCham =
        'px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary';

    return (
        <>
            <select
                value={market}
                onChange={(e) => onMarketChange(e.target.value)}
                className={oCham}
                title="Kênh VN nhận theo dấu tiếng Việt trong caption"
            >
                <option value="">VN + Global</option>
                <option value="vn">Kênh VN</option>
                <option value="global">Kênh Global</option>
            </select>

            <select
                value={contentLine}
                onChange={(e) => onContentLineChange(e.target.value)}
                className={oCham}
                title="Bắt theo hashtag #A1…#A5 có trong caption"
            >
                <option value="">Tất cả tuyến</option>
                {TUYEN_NOI_DUNG.map((ma) => (
                    <option key={ma} value={ma}>
                        Tuyến {ma}
                    </option>
                ))}
            </select>
        </>
    );
}
