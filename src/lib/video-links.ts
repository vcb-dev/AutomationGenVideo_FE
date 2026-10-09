// Xử lý link video dán vào form "Đề xuất video" ở Bộ Sưu Tập — tách khỏi page.tsx để
// dùng cho cả đề xuất 1 link lẫn dán nhiều link cùng lúc, và để test được.

export const PROPOSAL_PLATFORMS = ['tiktok', 'douyin', 'instagram', 'youtube', 'xiaohongshu', 'kuaishou', 'bilibili', 'facebook', 'reddit'] as const;

/** Giới hạn mỗi lượt dán: mỗi link là một lượt gọi TikHub có tính phí ở BE. */
export const MAX_LINKS_PER_BATCH = 20;

export function guessPlatformFromUrl(url: string): string {
    const u = url.toLowerCase();
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('douyin.com')) return 'douyin';
    if (u.includes('instagram.com')) return 'instagram';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
    if (u.includes('kuaishou.com')) return 'kuaishou';
    if (u.includes('bilibili.com') || u.includes('b23.tv')) return 'bilibili';
    if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
    if (u.includes('reddit.com') || u.includes('redd.it')) return 'reddit';
    return 'tiktok';
}

// Rút mã video thật từ link. Hệ thống dùng mã này làm khoá chống trùng và để khớp với
// video đã cào (scraper_*_videos.post_id) — nhét cả đường link vào sẽ sinh bản ghi rác
// không bao giờ khớp được, và cùng một video dán 2 kiểu link thành 2 dòng khác nhau.
const VIDEO_ID_PATTERNS: Array<[RegExp, RegExp[]]> = [
    [/douyin\.com|iesdouyin\.com/, [/\/video\/(\d{6,})/, /\/note\/(\d{6,})/, /[?&]modal_id=(\d{6,})/]],
    [/tiktok\.com/, [/\/video\/(\d{6,})/, /\/photo\/(\d{6,})/, /[?&]item_id=(\d{6,})/]],
    [/youtube\.com|youtu\.be/, [/[?&]v=([\w-]{8,})/, /\/shorts\/([\w-]{8,})/, /\/embed\/([\w-]{8,})/, /youtu\.be\/([\w-]{8,})/]],
    [/bilibili\.com|b23\.tv/, [/\/video\/(BV[\w]{8,})/i, /\/video\/(av\d+)/i]],
    [/xiaohongshu\.com|xhslink\.com|rednote\.com/, [/\/explore\/([\da-f]{16,})/i, /\/discovery\/item\/([\da-f]{16,})/i, /\/search_result\/([\da-f]{16,})/i]],
    [/kuaishou\.com/, [/\/short-video\/([\w-]{6,})/, /\/f\/([\w-]{6,})/, /[?&]photoId=([\w-]{6,})/]],
    [/instagram\.com/, [/\/reels?\/([\w-]{5,})/, /\/p\/([\w-]{5,})/, /\/tv\/([\w-]{5,})/]],
    [/facebook\.com|fb\.watch/, [/\/videos\/(?:[^/]+\/)?(\d{6,})/, /\/reel\/(\d{6,})/, /[?&]v=(\d{6,})/]],
    // Mã bài viết (base36). v.redd.it/<mã> là mã MEDIA → coi là link rút gọn, BE giải về link bài.
    [/reddit\.com|redd\.it/, [/\/comments\/([a-z0-9]{4,10})/i, /\/\/(?:www\.)?redd\.it\/([a-z0-9]{4,10})/i]],
];

/**
 * Link rút gọn do app điện thoại tạo ra khi bấm "Chia sẻ → Sao chép liên kết".
 * Chúng KHÔNG chứa mã video, nên đừng chặn ở đây — BE sẽ follow redirect để lấy link đầy
 * đủ rồi bóc mã (xem resolveVideoRef trong video-library.service.ts).
 */
const SHORT_LINK_HOSTS = /vt\.tiktok\.com|vm\.tiktok\.com|v\.douyin\.com|xhslink\.com|b23\.tv|fb\.watch|v\.kuaishou\.com|v\.redd\.it|reddit\.com\/r\/[^/?#]+\/s\//i;

export function isShortVideoLink(url: string): boolean {
    return SHORT_LINK_HOSTS.test((url || '').trim());
}

/** '' nghĩa là link không trỏ vào một video cụ thể (vd link trang cá nhân). */
export function extractVideoId(url: string): string {
    const u = url.trim();
    for (const [host, patterns] of VIDEO_ID_PATTERNS) {
        if (!host.test(u)) continue;
        for (const re of patterns) {
            const m = u.match(re);
            if (m?.[1]) return m[1];
        }
        return '';
    }
    return '';
}

export interface ParsedVideoLink {
    url: string;
    platform: string;
    /** '' khi là link rút gọn — BE bóc lại sau khi giải link. */
    videoId: string;
    /** Lý do không gửi được; undefined = hợp lệ. */
    error?: string;
}

export interface ParseVideoLinksResult {
    links: ParsedVideoLink[];
    /** Số link bị bỏ vì trùng với link đã có trong cùng lượt dán. */
    duplicates: number;
    /** Số link bị bỏ vì vượt MAX_LINKS_PER_BATCH. */
    overLimit: number;
}

// Link trong đoạn text chia sẻ từ app (vd "7.99 复制打开抖音… https://v.douyin.com/xxx/ …").
// Dừng ở khoảng trắng, dấu ngoặc/nháy và dấu câu full-width của tiếng Trung.
const URL_IN_TEXT = /https?:\/\/[^\s"'<>，。！？、；：（）【】「」]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/;

/**
 * Bóc mọi link video từ đoạn text người dùng dán vào (mỗi dòng một link, cách nhau bằng
 * dấu cách/dấu phẩy, hoặc nguyên đoạn text chia sẻ từ app đều được). Bỏ link trùng —
 * so theo mã video khi có, để cùng một video dán 2 kiểu link chỉ gửi 1 lần.
 */
export function parseVideoLinks(text: string, max: number = MAX_LINKS_PER_BATCH): ParseVideoLinksResult {
    const seen = new Set<string>();
    const links: ParsedVideoLink[] = [];
    let duplicates = 0;
    let overLimit = 0;

    for (const match of (text || '').matchAll(URL_IN_TEXT)) {
        const url = match[0].replace(TRAILING_PUNCTUATION, '');
        const platform = guessPlatformFromUrl(url);
        const videoId = extractVideoId(url);
        const key = videoId ? `${platform}:${videoId}` : url.toLowerCase();
        if (seen.has(key)) {
            duplicates++;
            continue;
        }
        seen.add(key);
        if (links.length >= max) {
            overLimit++;
            continue;
        }
        const error = !videoId && !isShortVideoLink(url)
            ? 'Link không trỏ vào một video cụ thể (có thể là link trang cá nhân).'
            : undefined;
        links.push({ url, platform, videoId, error });
    }

    return { links, duplicates, overLimit };
}

/**
 * Chạy `worker` cho từng phần tử, tối đa `concurrency` việc cùng lúc. Không dừng khi một
 * việc lỗi — worker tự bắt lỗi và báo trạng thái của riêng nó.
 */
export async function runWithConcurrency<T>(
    items: readonly T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
    let next = 0;
    const lanes = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
        while (next < items.length) {
            const index = next++;
            await worker(items[index], index);
        }
    });
    await Promise.all(lanes);
}
