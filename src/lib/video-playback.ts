/**
 * Quyết định cách phát một video ngay trên web hệ thống, thay vì nhảy sang nền tảng gốc.
 *
 * Hai đường, chọn theo nền tảng:
 *
 *  1. NHÚNG CHÍNH CHỦ (iframe) — YouTube, Bilibili, Facebook, Instagram.
 *     Miễn phí, không tốn băng thông của mình, link không hết hạn, không lo bản quyền.
 *
 *  2. QUA TRUNG GIAN CỦA MÌNH (thẻ <video>) — Douyin, Xiaohongshu, Kuaishou, TikTok.
 *     Đã thử thật và xác nhận BẮT BUỘC phải đi vòng qua server:
 *       - TikTok tuy có mã nhúng nhưng `tiktok.com/embed/v2/<id>` trả 503 liên tục (3/3 lần);
 *       - Douyin chặn theo referer: gọi từ tên miền mình → 403, gọi từ server → 206;
 *       - Xiaohongshu trả link `http://`, trang HTTPS nhúng vào là bị chặn mixed content;
 *       - link phát hết hạn ~3 giờ nên không lưu được vào DB, phải xin lại theo lượt xem.
 */

export type PlaybackMode = 'embed' | 'proxy' | 'unsupported';

export interface PlaybackPlan {
    mode: PlaybackMode;
    /** Địa chỉ đưa vào iframe (embed) hoặc vào thẻ <video> (proxy). */
    src: string;
    /** Vì sao không phát được — chỉ có khi mode = 'unsupported'. */
    reason?: string;
}

/** Nền tảng có mã nhúng công khai dùng được. */
const EMBED_PLATFORMS = ['youtube', 'bilibili', 'facebook', 'instagram'] as const;
/**
 * Nền tảng phải phát qua trung gian của mình.
 *
 * TikTok nằm ở đây dù CÓ mã nhúng: đã đo thực tế `tiktok.com/embed/v2/<id>` trả 503 liên
 * tục (3/3 lần, họ chặn). Trong khi link phát lấy qua TikHub thì tải được bình thường.
 */
const PROXY_PLATFORMS = ['douyin', 'xiaohongshu', 'kuaishou', 'tiktok'] as const;

export function playbackModeOf(platform: string): PlaybackMode {
    const p = (platform || '').toLowerCase().trim();
    if ((EMBED_PLATFORMS as readonly string[]).includes(p)) return 'embed';
    if ((PROXY_PLATFORMS as readonly string[]).includes(p)) return 'proxy';
    return 'unsupported';
}

/** Rút mã Instagram (shortcode) từ link nếu video_id không phải shortcode. */
function instagramShortcode(videoId: string, videoUrl: string): string {
    const fromUrl = (videoUrl || '').match(/\/(?:reels?|p|tv)\/([\w-]+)/);
    return fromUrl?.[1] || videoId;
}

function buildEmbedSrc(platform: string, videoId: string, videoUrl: string): string {
    const id = encodeURIComponent(videoId);
    switch (platform) {
        case 'youtube':
            // playsinline để iOS không tự bung toàn màn hình khi tự phát.
            return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0`;
        case 'tiktok':
            return `https://www.tiktok.com/embed/v2/${id}`;
        case 'bilibili':
            // Bilibili nhận cả bvid (BV...) lẫn aid (av...).
            return /^av\d+$/i.test(videoId)
                ? `https://player.bilibili.com/player.html?aid=${id.slice(2)}&autoplay=0&high_quality=1`
                : `https://player.bilibili.com/player.html?bvid=${id}&autoplay=0&high_quality=1`;
        case 'facebook':
            return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&autoplay=false`;
        case 'instagram':
            return `https://www.instagram.com/p/${encodeURIComponent(instagramShortcode(videoId, videoUrl))}/embed`;
        default:
            return '';
    }
}

/**
 * @param apiBase gốc API của BE (scraperService đang dùng NEXT_PUBLIC_API_URL)
 * @param token   JWT của người dùng — BẮT BUỘC cho nền tảng phát qua trung gian.
 *
 * Vì sao token phải đi trong URL: thẻ `<video src="...">` do chính trình duyệt đi tải và
 * KHÔNG cho gắn header tuỳ ý, nên không thể gửi `Authorization: Bearer`. Đây là lỗi đã mắc
 * một lần: gọi bằng curl kèm header thì chạy, còn trên trang thì mọi video đều lỗi 401.
 */
export function planPlayback(
    platform: string,
    videoId: string,
    videoUrl: string,
    apiBase: string,
    token?: string,
): PlaybackPlan {
    const p = (platform || '').toLowerCase().trim();
    const mode = playbackModeOf(p);

    if (mode === 'unsupported') {
        return { mode, src: '', reason: `Nền tảng "${platform || 'không rõ'}" chưa xem được tại đây.` };
    }
    if (!videoId && mode === 'embed') {
        return { mode: 'unsupported', src: '', reason: 'Thiếu mã video nên không nhúng được.' };
    }

    if (mode === 'embed') {
        const src = buildEmbedSrc(p, videoId, videoUrl);
        if (!src) return { mode: 'unsupported', src: '', reason: 'Không dựng được link nhúng.' };
        return { mode, src };
    }

    // Kuaishou: endpoint bên TikHub chỉ nhận link chia sẻ chứ không nhận mã, nên phải gửi kèm
    // link gốc để server dùng.
    const base = (apiBase || '').replace(/\/$/, '');
    const params = new URLSearchParams();
    if (videoUrl) params.set('url', videoUrl);
    if (token) params.set('t', token);
    const query = params.toString() ? `?${params.toString()}` : '';
    return { mode: 'proxy', src: `${base}/scraper/stream/${p}/${encodeURIComponent(videoId)}${query}` };
}
