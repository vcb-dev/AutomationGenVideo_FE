import { NextResponse } from 'next/server';

const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
    'http://localhost:8000';

// Route này CỐ Ý không yêu cầu đăng nhập: extension VCB (chạy trên douyin.com,
// xiaohongshu.com...) gọi vào đây để dịch từ khoá, mà extension không giữ được JWT.
// Bù lại phải tự chặn lạm dụng, nếu không bất kỳ ai thấy được app đều biến nó thành
// dịch vụ dịch miễn phí (đốt quota Claude/Google của hệ thống).

// Đây là từ khoá tìm kiếm — dài hơn ngần này chắc chắn là dùng sai mục đích.
const MAX_TEXT_LENGTH = 200;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

// Bộ đếm in-memory: đủ cho mục đích chặn lạm dụng thô. Lưu ý reset khi restart và
// không chia sẻ giữa nhiều instance — nếu sau này chạy nhiều pod thì chuyển sang Redis.
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || now >= entry.resetAt) {
        hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        // Dọn rác định kỳ để Map không phình vô hạn theo số IP đã từng gọi.
        if (hits.size > 5000) {
            for (const [key, value] of hits) {
                if (now >= value.resetAt) hits.delete(key);
            }
        }
        return false;
    }

    entry.count += 1;
    return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: Request) {
    try {
        if (isRateLimited(getClientIp(request))) {
            return NextResponse.json(
                { success: false, translated: '', error: 'Gọi dịch quá nhiều, thử lại sau một phút.' },
                { status: 429 },
            );
        }

        const body = await request.json();
        const text = typeof body?.text === 'string' ? body.text.trim() : '';

        if (!text) {
            return NextResponse.json({ translated: '' });
        }
        if (text.length > MAX_TEXT_LENGTH) {
            return NextResponse.json(
                { success: false, translated: '', error: `Từ khoá quá dài (tối đa ${MAX_TEXT_LENGTH} ký tự).` },
                { status: 400 },
            );
        }

        const url = `${AI_SERVICE_URL}/api/search/translate/`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (res.ok) {
            const data = await res.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ success: false, translated: text }, { status: 500 });
    } catch {
        return NextResponse.json({ success: false, translated: '' }, { status: 500 });
    }
}
