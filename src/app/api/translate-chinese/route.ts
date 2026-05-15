import { NextResponse } from 'next/server';

const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
    'http://localhost:8001';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json({ translated: '' });
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
