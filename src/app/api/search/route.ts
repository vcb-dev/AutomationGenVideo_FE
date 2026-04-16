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
            const text = await res.text();
            console.error(`[Search Proxy] NestJS returned non-JSON (${res.status}):`, text.slice(0, 200));
            return NextResponse.json(
                { error: `Backend trả về lỗi (HTTP ${res.status}). Kiểm tra NestJS đang chạy tại port 3000.` },
                { status: 502 },
            );
        }

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
        console.error(`[Search Proxy] Error calling ${target}:`, err?.message);
        return NextResponse.json(
            { error: `Không kết nối được NestJS (${target}). Kiểm tra BE đã chạy chưa.`, detail: err?.message },
            { status: 502 },
        );
    }
}

export async function POST(request: Request) {
    const target = `${NESTJS_BASE}/ai/search`;
    const body = await request.json();
    const authHeader = request.headers.get('Authorization') || '';

    console.log(`[Search Proxy] POST → ${target}`);

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
    const platform = searchParams.get('platform');
    const limit = searchParams.get('limit') || '50';
    const authHeader = request.headers.get('Authorization') || '';

    const target = `${NESTJS_BASE}/ai/search/history?platform=${platform || ''}&limit=${limit}`;
    console.log(`[Search Proxy] GET → ${target}`);

    return proxyToNestJS(target, {
        method: 'GET',
        headers: {
            ...(authHeader ? { Authorization: authHeader } : {}),
        },
    });
}
