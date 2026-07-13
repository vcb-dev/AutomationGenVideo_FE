import { NextResponse } from 'next/server';

/** Hostnames allowed for server-side image fetch (screenshot embed). Blocks obvious SSRF targets. */
const HOST_PATTERN_OK = (host: string): boolean => {
    const h = host.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return false;
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
    if (m) {
        const [a, b] = [Number(m[1]), Number(m[2])];
        if (a === 10) return false;
        if (a === 127) return false;
        if (a === 0) return false;
        if (a === 192 && b === 168) return false;
        if (a === 172 && b >= 16 && b <= 31) return false;
        if (a === 169 && b === 254) return false;
    }
    return [
        /^(.+\.)?googleusercontent\.com$/i,
        /^drive\.google\.com$/i,
        /^(.+\.)?ggpht\.com$/i,
        /^(.+\.)?gstatic\.com$/i,
        /^ui-avatars\.com$/i,
        /^i\.pravatar\.cc$/i,
        /^images\.weserv\.nl$/i,
        /^wsrv\.nl$/i,
        /^(.+\.)?fbcdn\.net$/i,
        /^(.+\.)?tiktokcdn\.com$/i,
        /^(.+\.)?tiktokcdn-us\.com$/i,
        /^(.+\.)?cdninstagram\.com$/i,
        /^(.+\.)?larksuite\.com$/i,
        /^(.+\.)?feishucdn\.com$/i,
        /^(.+\.)?feishu\.cn$/i,
        /^(.+\.)?lf\.feishu\.cn$/i,
    ].some((re) => re.test(h));
};

const MAX_BYTES = 6 * 1024 * 1024;

export async function GET(request: Request) {
    const urlParam = new URL(request.url).searchParams.get('url')?.trim();
    if (!urlParam) {
        return new NextResponse('Missing url', { status: 400 });
    }

    let target: URL;
    try {
        target = new URL(urlParam);
    } catch {
        return new NextResponse('Invalid url', { status: 400 });
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        return new NextResponse('Invalid scheme', { status: 400 });
    }

    if (!HOST_PATTERN_OK(target.hostname)) {
        return new NextResponse('Host not allowed', { status: 403 });
    }

    try {
        const res = await fetch(target.href, {
            redirect: 'follow',
            signal: AbortSignal.timeout(12_000),
            headers: {
                Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                // Some CDNs behave better with a browser-like UA
                'User-Agent':
                    'Mozilla/5.0 (compatible; VCB-Capture/1.0; +https://example.local) AppleWebKit/537.36',
            },
        });

        if (!res.ok) {
            return new NextResponse('Upstream error', { status: res.status === 404 ? 404 : 502 });
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.toLowerCase().startsWith('image/') && !contentType.includes('octet-stream')) {
            return new NextResponse('Not an image', { status: 415 });
        }

        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > MAX_BYTES) {
            return new NextResponse('Image too large', { status: 413 });
        }

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType.split(';')[0].trim() || 'image/jpeg',
                'Cache-Control': 'private, max-age=300',
            },
        });
    } catch (e) {
        console.warn('[capture-image]', e);
        return new NextResponse('Fetch failed', { status: 502 });
    }
}
