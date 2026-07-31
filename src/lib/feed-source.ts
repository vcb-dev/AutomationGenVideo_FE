import { scraperService } from '@/services/scraperService';

/**
 * Gom video của 8 nền tảng về CÙNG MỘT hình dạng để trang lướt dọc chỉ phải hiểu một kiểu.
 *
 * Mỗi nền tảng đặt tên trường khác nhau (post_id / note_id / video_id, digg_count /
 * like_count / likes, preview_image / thumbnail_url...), và mỗi bên có một hàm lấy danh sách
 * riêng. Nhét hết logic đó vào trang lướt thì trang sẽ đầy `if platform === ...`.
 */

export interface FeedVideo {
    platform: string;
    /** Mã video của nền tảng — dùng để dựng link nhúng hoặc link phát qua trung gian. */
    videoId: string;
    /** Link trang gốc, để mở ra ngoài và để nền tảng nào cần link thì dùng. */
    url: string;
    title: string;
    thumbnail: string;
    authorName: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
}

type AnyRecord = Record<string, any>;

const numberOf = (...values: unknown[]): number => {
    for (const v of values) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
};

const textOf = (...values: unknown[]): string => {
    for (const v of values) {
        if (typeof v === 'string' && v.trim()) return v;
    }
    return '';
};

function normalize(platform: string, raw: AnyRecord): FeedVideo {
    return {
        platform,
        videoId: textOf(raw.post_id, raw.note_id, raw.video_id, raw.id),
        url: textOf(raw.url, raw.video_url),
        title: textOf(raw.title, raw.description, raw.content),
        thumbnail: textOf(raw.thumbnail_drive_url, raw.preview_image, raw.thumbnail_url, raw.cover_image),
        authorName: textOf(
            raw.author?.display_name, raw.author?.username, raw.author?.nickname,
            raw.author_name, raw.author_display_name, raw.profile?.nickname, raw.channel_name,
        ),
        views: numberOf(raw.play_count, raw.view_count, raw.views_count),
        likes: numberOf(raw.digg_count, raw.like_count, raw.liked_count, raw.likes_count),
        comments: numberOf(raw.comment_count, raw.comments_count),
        shares: numberOf(raw.share_count, raw.shared_count, raw.shares_count),
    };
}

export interface FeedPage {
    videos: FeedVideo[];
    page: number;
    totalPages: number;
}

/** Mỗi nền tảng gọi một hàm khác nhau, nhưng ra cùng một FeedPage. */
export async function fetchFeedPage(
    platform: string,
    token: string,
    page: number,
    pageSize = 12,
): Promise<FeedPage> {
    const p = (platform || '').toLowerCase();
    const params: AnyRecord = { page, page_size: pageSize };

    const call = async (): Promise<AnyRecord> => {
        switch (p) {
            case 'douyin': return scraperService.getDouyinVideos(token, params);
            case 'tiktok': return scraperService.getTiktokVideos(token, params);
            case 'kuaishou': return scraperService.getKuaishouVideos(token, params);
            case 'bilibili': return scraperService.getBilibiliVideos(token, params);
            case 'xiaohongshu': return scraperService.getXiaohongshuVideos(token, params);
            case 'youtube': return scraperService.getYoutubeShorts(token, params);
            case 'instagram': return scraperService.getInstagramReels(token, params);
            default:
                // 'all' = xem trộn mọi nền tảng → KHÔNG gửi tham số lọc. Gửi platform='all'
                // lên thì server không khớp nhánh nào và trả về danh sách rỗng.
                return scraperService.getAllExternalVideos(token, {
                    ...params,
                    platform: p && p !== 'all' ? p : undefined,
                });
        }
    };

    const data = await call();
    // Mỗi endpoint gọi danh sách một tên khác nhau.
    const list: AnyRecord[] = data.videos || data.shorts || data.reels || data.results || [];
    return {
        // Ở chế độ 'all' mỗi video là một nền tảng khác nhau → PHẢI lấy nền tảng của chính
        // nó. Gán 'all' cho tất cả thì bộ chọn cách phát coi là nền tảng lạ và không video
        // nào phát được.
        videos: list.map((item) => {
            const itemPlatform = String(item.platform || '').toLowerCase();
            const isMixed = !p || p === 'all';
            return normalize(isMixed ? itemPlatform : p, item);
        }),
        page: Number(data.page) || page,
        totalPages: Number(data.total_pages) || 1,
    };
}
