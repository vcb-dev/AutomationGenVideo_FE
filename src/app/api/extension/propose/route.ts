import { NextResponse } from 'next/server';

/**
 * Nhận đề xuất video do Chrome extension gửi từ trang ngoài (Douyin, TikTok...).
 *
 * Vì sao cần route này: extension không giữ JWT, nên nó nhờ content script chạy trên
 * chính tab trang web hệ thống gọi hộ. Content script chỉ biết `location.origin` chứ
 * không đọc được biến môi trường trỏ tới BE — nên gọi same-origin vào đây, rồi route
 * này forward sang BE (đúng quy tắc FE → BE). Dùng biến server-side thay vì
 * NEXT_PUBLIC_* vì hệ thống hay được truy cập qua Cloudflare Tunnel từ máy khác.
 */
const BE_API_URL = (
    process.env.BE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000/api'
).replace(/\/$/, '');

/** Nền tảng hệ thống chấp nhận — trùng PROPOSAL_PLATFORMS bên trang Bộ Sưu Tập. */
const PLATFORMS = new Set([
    'tiktok', 'douyin', 'instagram', 'youtube',
    'xiaohongshu', 'kuaishou', 'bilibili', 'facebook',
]);

function clampInt(raw: unknown, max = 9_000_000_000_000): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(max, Math.floor(n));
}

function clampText(raw: unknown, max: number): string {
    return typeof raw === 'string' ? raw.slice(0, max) : '';
}

export async function POST(request: Request) {
    const auth = request.headers.get('authorization');
    if (!auth) {
        return NextResponse.json({ message: 'Thiếu phiên đăng nhập.' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
    }

    const videoUrl = clampText(body.video_url, 2000).trim();
    if (!/^https?:\/\//i.test(videoUrl)) {
        return NextResponse.json({ message: 'Link video không hợp lệ.' }, { status: 400 });
    }

    const platform = clampText(body.platform, 20).toLowerCase();
    if (!PLATFORMS.has(platform)) {
        return NextResponse.json(
            { message: 'Nền tảng này chưa được hỗ trợ đề xuất.' },
            { status: 400 },
        );
    }

    // video_id phải là id thật của nền tảng (khoá dùng để khớp với video đã cào và để
    // chống trùng). Extension không rút được thì từ chối, KHÔNG nhét cả đường link vào —
    // làm vậy sẽ sinh ra bản ghi rác không bao giờ khớp với dữ liệu cào.
    const videoId = clampText(body.video_id, 255).trim();
    if (!videoId) {
        return NextResponse.json(
            { message: 'Không đọc được mã video từ link. Mở đúng trang của video rồi thử lại.' },
            { status: 400 },
        );
    }

    const payload = {
        video_id: videoId,
        platform,
        video_url: videoUrl,
        title: clampText(body.title, 500),
        description: clampText(body.description, 2000),
        author_name: clampText(body.author_name, 255),
        author_username: clampText(body.author_username, 255),
        thumbnail_url: clampText(body.thumbnail_url, 1900) || undefined,
        views_count: clampInt(body.views_count),
        likes_count: clampInt(body.likes_count),
        comments_count: clampInt(body.comments_count),
        shares_count: clampInt(body.shares_count),
        notes: clampText(body.notes, 1000) || undefined,
        source: 'MANUAL' as const,
    };

    const callBe = (path: string) =>
        fetch(`${BE_API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: auth },
            body: JSON.stringify(payload),
            // Phải DÀI HƠN toàn bộ chuỗi phía sau (lấy chi tiết video 30s + AI sinh script
            // tối đa 120s). Trước đây để 30s nên khi leader thêm video, FE bỏ cuộc giữa chừng
            // và báo "Không kết nối được tới máy chủ" trong khi BE vẫn thêm xong bình thường —
            // người dùng thấy lỗi nhưng video vẫn vào bộ sưu tập.
            signal: AbortSignal.timeout(155000),
        });

    try {
        // Giữ đúng hành vi của form trong app: leader/admin thêm thẳng vào bộ sưu tập,
        // member thì vào hàng chờ duyệt. Không tự đọc role từ token — để BE phán quyết,
        // 403 ở đây nghĩa là "không phải leader/admin" nên chuyển sang hàng chờ.
        let res = await callBe('/video-library/direct');
        let direct = true;
        if (res.status === 403) {
            res = await callBe('/video-proposals');
            direct = false;
        }

        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
            return NextResponse.json({ message: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
        }
        if (!res.ok) {
            return NextResponse.json(
                { message: data?.message || 'Hệ thống từ chối đề xuất này.' },
                { status: res.status },
            );
        }
        return NextResponse.json({
            direct,
            message: direct
                ? 'Đã thêm thẳng vào Bộ Sưu Tập ✓'
                : 'Đã gửi đề xuất, chờ leader/admin duyệt ✓',
        });
    } catch (err) {
        console.warn('[extension propose] forward failed:', err);
        return NextResponse.json({ message: 'Không kết nối được tới máy chủ.' }, { status: 502 });
    }
}
