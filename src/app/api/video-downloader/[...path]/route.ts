import { NextResponse } from 'next/server';

/**
 * Proxy same-origin cho trang Tải video (dashboard/tools/video-downloader)
 * và Chrome extension VCB. Dùng biến server-side (không phải NEXT_PUBLIC_*) vì trang có
 * thể được truy cập từ máy khác qua Cloudflare Tunnel — nếu gọi thẳng biến NEXT_PUBLIC_*
 * (đóng cứng lúc build, thường là localhost) thì trình duyệt của người dùng ở xa sẽ cố
 * kết nối tới "localhost" của chính máy họ, không phải server, và luôn thất bại.
 *
 * Quy tắc kiến trúc FE → BE → AI: proxy này forward sang BE (NestJS,
 * /api/ai/tools/video-downloader/*) — BE mới là bên gọi AI service (yt-dlp),
 * FE không nối thẳng AI nữa.
 */
const BE_API_URL = (
    process.env.BE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000/api'
).replace(/\/$/, '');

function buildTargetUrl(path: string[]): string {
    const segments = path.map((s) => encodeURIComponent(s)).join('/');
    return `${BE_API_URL}/ai/tools/video-downloader/${segments}`;
}

function forwardHeaders(request: Request): HeadersInit {
    const headers: Record<string, string> = {};
    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;
    return headers;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const targetUrl = buildTargetUrl(path);

    try {
        const res = await fetch(targetUrl, {
            headers: forwardHeaders(request),
            signal: AbortSignal.timeout(120000),
        });

        const contentType = res.headers.get('content-type') || 'application/json';
        const responseHeaders: Record<string, string> = { 'Content-Type': contentType };
        const contentDisposition = res.headers.get('content-disposition');
        if (contentDisposition) responseHeaders['Content-Disposition'] = contentDisposition;
        const contentLength = res.headers.get('content-length');
        if (contentLength) responseHeaders['Content-Length'] = contentLength;

        return new NextResponse(res.body, { status: res.status, headers: responseHeaders });
    } catch (err) {
        console.warn('[video-downloader proxy] GET failed:', err);
        return NextResponse.json({ success: false, error: 'Không kết nối được tới máy chủ.' }, { status: 502 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const targetUrl = buildTargetUrl(path);

    try {
        const body = await request.text();
        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...forwardHeaders(request) },
            body,
            signal: AbortSignal.timeout(30000),
        });

        const data = await res.text();
        return new NextResponse(data, {
            status: res.status,
            headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
        });
    } catch (err) {
        console.warn('[video-downloader proxy] POST failed:', err);
        return NextResponse.json({ success: false, error: 'Không kết nối được tới máy chủ.' }, { status: 502 });
    }
}
