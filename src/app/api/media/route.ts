import { NextResponse } from 'next/server';

/**
 * Proxy ảnh qua same-origin để tránh ad blocker chặn request đến AI service.
 * Forward tới AI service /api/media/ (hoặc /api/image-proxy/).
 */
const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
    'http://localhost:8001';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url')?.trim();

    if (!url) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        const proxyUrl = `${AI_SERVICE_URL}/api/media/?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(15000),
            headers: {
                Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
            },
        });

        if (!res.ok) {
            return new NextResponse('Failed to fetch image', { status: res.status });
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (err) {
        console.warn('[media] Proxy failed:', err);
        return new NextResponse('Failed to fetch image', { status: 502 });
    }
}
