/** Chuẩn hoá tên kênh để so khớp 1:1 — không dùng so khớp chuỗi con, tránh nhầm page cùng tiền tố. */
export function normalizeChannelName(name?: string | null): string {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Lấy ID số từ ID hoặc URL (vd https://facebook.com/148888379055195 → 148888379055195). */
export function extractNumericChannelId(input?: string | null): string {
    if (!input) return '';
    const trimmed = String(input).trim();
    if (/^\d{5,}$/.test(trimmed)) return trimmed;
    const idInUrlMatch = trimmed.match(/(?:id=|profile\.php\?id=|\/|page_id_)(\d{5,})/i);
    if (idInUrlMatch && idInUrlMatch[1]) return idInUrlMatch[1];
    return trimmed;
}

const PLATFORM_ALIASES: Record<string, string[]> = {
    fb: ['fb', 'facebook', 'fanpage'],
    ig: ['ig', 'instagram', 'ins'],
    tiktok: ['tiktok', 'tt', 'tiktokshop'],
    yt: ['yt', 'youtube'],
    thread: ['thread', 'threads'],
};

/** Kênh (platform ghi theo nhiều kiểu: 'facebook', 'FACEBOOK', 'Fanpage'…) có thuộc nền tảng form `platformId` không. */
export function isChannelOnPlatform(platformId: string, channelPlatform: string | null | undefined): boolean {
    if (!channelPlatform) return false;
    const p = channelPlatform.toLowerCase().trim();
    const targets = PLATFORM_ALIASES[platformId] || [platformId.toLowerCase()];
    return targets.some((target) => {
        if (p === target) return true;
        if (target.length > 3 && p.includes(target)) return true;
        return new RegExp(`\\b${target}\\b`, 'i').test(p);
    });
}

interface SapoRowLike {
    channel?: string | null;
    channelId?: string | null;
}

interface OwnChannelLike {
    name?: string | null;
    platform?: string | null;
    channel_id?: string | null;
    link_channel?: string | null;
    id?: string | null;
}

/**
 * Chỉ giữ các dòng doanh thu Sapo thuộc kênh của chính người dùng TRÊN CÙNG NỀN TẢNG (khớp ID hoặc
 * đúng tên).
 *
 * Sapo trả doanh thu của CẢ CÔNG TY. Trước đây nền tảng nào người dùng không có kênh thì form
 * nhận luôn toàn bộ kênh công ty ở nền tảng đó — bấm gửi là nhận doanh thu của người khác về mình.
 * Phải so trong cùng nền tảng: kênh cùng thương hiệu thường trùng tên trên mọi nền tảng, có kênh IG
 * "HuyK X" không có nghĩa là sở hữu page FB "HuyK X". Không có kênh nào khớp thì trả mảng rỗng.
 */
export function pickOwnSapoRows<T extends SapoRowLike>(
    platformId: string,
    sapoRows: T[],
    ownChannels: OwnChannelLike[],
): T[] {
    const samePlatform = ownChannels.filter((c) => isChannelOnPlatform(platformId, c.platform));
    return sapoRows.filter((row) => {
        if (!row.channel && !row.channelId) return false;
        const rowName = normalizeChannelName(row.channel);
        const rowId = extractNumericChannelId(row.channelId);
        return samePlatform.some((c) => {
            const ownName = normalizeChannelName(c.name);
            const ownId = extractNumericChannelId(c.channel_id || c.link_channel || c.id);
            return (rowId !== '' && ownId !== '' && rowId === ownId) || (rowName !== '' && ownName !== '' && rowName === ownName);
        });
    });
}
