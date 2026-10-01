/**
 * Nền tảng mà backend KHÔNG kéo đơn từ Sapo (đơn Zalo không gắn với page cụ thể nào). Nút kéo Sapo
 * ở form doanh thu phải để nguyên số người dùng tự nhập ở các nền tảng này — không ghi đè thành 0,
 * không xoá trống.
 */
export const SAPO_UNTRACKED_PLATFORM_IDS: readonly string[] = ['zalo'];

export function isSapoTrackedPlatform(platformId: string): boolean {
    return !SAPO_UNTRACKED_PLATFORM_IDS.includes(platformId);
}

interface ChannelEntryLike {
    channel?: string | null;
}

/**
 * Người dùng đã chọn ít nhất một kênh ở nền tảng mà Sapo có số liệu hay chưa. Kênh Zalo đã chọn
 * không tính: nếu tính, chọn mỗi kênh Zalo cũng làm form bỏ qua bước tự nạp kênh từ Sapo.
 */
export function hasSelectedSapoTrackedChannel(
    entries: Record<string, ChannelEntryLike[] | undefined>,
): boolean {
    return Object.entries(entries).some(
        ([platformId, list]) =>
            isSapoTrackedPlatform(platformId) &&
            (list || []).some((e) => Boolean(e.channel && e.channel.trim())),
    );
}

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

interface SapoRowLike {
    channel?: string | null;
    channelId?: string | null;
}

interface OwnChannelLike {
    name?: string | null;
    channel_id?: string | null;
    link_channel?: string | null;
    id?: string | null;
}

/**
 * Chỉ giữ các dòng doanh thu Sapo thuộc kênh của chính người dùng (khớp ID hoặc đúng tên).
 *
 * Sapo trả doanh thu của CẢ CÔNG TY. Trước đây nền tảng nào người dùng không có kênh thì form
 * nhận luôn toàn bộ kênh công ty ở nền tảng đó — bấm gửi là nhận doanh thu của người khác về mình.
 * Không có kênh nào khớp thì trả mảng rỗng.
 */
export function pickOwnSapoRows<T extends SapoRowLike>(sapoRows: T[], ownChannels: OwnChannelLike[]): T[] {
    return sapoRows.filter((row) => {
        if (!row.channel && !row.channelId) return false;
        const rowName = normalizeChannelName(row.channel);
        const rowId = extractNumericChannelId(row.channelId);
        return ownChannels.some((c) => {
            const ownName = normalizeChannelName(c.name);
            const ownId = extractNumericChannelId(c.channel_id || c.link_channel || c.id);
            return (rowId !== '' && ownId !== '' && rowId === ownId) || (rowName !== '' && ownName !== '' && rowName === ownName);
        });
    });
}
