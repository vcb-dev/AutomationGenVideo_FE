import { NextResponse } from 'next/server';

/**
 * Real-time Search Suggestion Proxy
 * Calls AI service → YouTube Suggest → Google Suggest
 * Returns suggestions for the EXACT query typed (no artificial suffixes).
 */

const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
    'http://localhost:8001';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const platform = searchParams.get('platform')?.toLowerCase() || 'tiktok';
    const count = Math.min(Number(searchParams.get('count') || 8), 20);

    if (!query) {
        return NextResponse.json({ suggestions: [], source: 'none' });
    }

    // ── Primary: AI Service (YouTube/Gemini via Django) ──────────────────────
    try {
        const url = `${AI_SERVICE_URL}/api/tiktok/suggest/?q=${encodeURIComponent(query)}&platform=${platform}&count=${count}`;
        const res = await fetch(url, {
            signal: AbortSignal.timeout(4000), // Slightly longer for Gemini
            headers: { Accept: 'application/json' },
        });

        if (res.ok) {
            const data = await res.json();
            const suggestions: string[] = data.suggestions || [];
            if (suggestions.length > 0) {
                return NextResponse.json({ suggestions, source: data.source || 'youtube' });
            }
        }
    } catch (err: any) {
        // Fall through
    }

    // ── Fallback: Direct YouTube/Google Suggest ──────────────────────────────
    try {
        // Use Google for Douyin/XHS fallback, YouTube for others
        const isChinese = ['douyin', 'xiaohongshu'].includes(platform);
        const ds = isChinese ? '' : 'yt';

        const ytUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=${ds}&q=${encodeURIComponent(query)}&hl=vi&gl=vn&oe=utf-8`;
        const res = await fetch(ytUrl, {
            signal: AbortSignal.timeout(2000),
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept-Language': 'vi-VN,vi;q=0.9',
            },
        });

        if (res.ok) {
            const data = await res.json();
            const suggestions: string[] = (data[1] || []).slice(0, count);
            if (suggestions.length > 0) {
                return NextResponse.json({ suggestions, source: isChinese ? 'google' : 'youtube' });
            }
        }
    } catch { /* ignore */ }

    return NextResponse.json({ suggestions: [], source: 'none' });
}

/**
 * POST /api/proxy-tiktok-suggest
 * Used by trackSearch to log/track a completed search query.
 * Forwards to AI service if available, otherwise returns 200 silently.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const query = body?.query?.trim() || '';

        if (!query) {
            return NextResponse.json({ ok: true });
        }

        try {
            const url = `${AI_SERVICE_URL}/api/search/track/`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ query }),
                signal: AbortSignal.timeout(3000),
            });
        } catch {
            // AI service unavailable — silently ignore
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true });
    }
}
