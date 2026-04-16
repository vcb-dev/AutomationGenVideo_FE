import { NextResponse } from 'next/server';

const NESTJS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function GET(
    request: Request,
    { params }: { params: { taskId: string } },
) {
    const { taskId } = params;
    const target = `${NESTJS_BASE}/ai/search/status/${taskId}`;
    const authHeader = request.headers.get('Authorization') || '';

    try {
        const res = await fetch(target, {
            headers: {
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            signal: AbortSignal.timeout(30_000),
        });

        const contentType = res.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            const text = await res.text();
            console.error(`[Search Status Proxy] Non-JSON (${res.status}):`, text.slice(0, 200));
            return NextResponse.json(
                { error: `Backend error (HTTP ${res.status})` },
                { status: 502 },
            );
        }

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
        console.error(`[Search Status Proxy] Error:`, err?.message);
        return NextResponse.json(
            { error: 'Không kết nối được NestJS', detail: err?.message },
            { status: 502 },
        );
    }
}
