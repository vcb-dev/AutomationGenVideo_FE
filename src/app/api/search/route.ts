import { NextResponse } from 'next/server';

const NESTJS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

async function proxyToNestJS(target: string, init: RequestInit) {
    try {
        const res = await fetch(target, {
            ...init,
            signal: AbortSignal.timeout(90_000),
        });

        const contentType = res.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            return NextResponse.json(
                { error: `Backend trả về lỗi (HTTP ${res.status}). Kiểm tra NestJS đang chạy.` },
                { status: 502 },
            );
        }

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Không kết nối được backend. Kiểm tra BE đã chạy chưa.', detail: message },
            { status: 502 },
        );
    }
}

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const target = `${NESTJS_BASE}/ai/search`;
    const authHeader = request.headers.get('Authorization') || '';

    return proxyToNestJS(target, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(body),
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || '';
    const limit = searchParams.get('limit') || '50';
    const authHeader = request.headers.get('Authorization') || '';

    const target = `${NESTJS_BASE}/ai/search/history?platform=${encodeURIComponent(platform)}&limit=${encodeURIComponent(limit)}`;

    return proxyToNestJS(target, {
        method: 'GET',
        headers: {
            ...(authHeader ? { Authorization: authHeader } : {}),
        },
    });
}
