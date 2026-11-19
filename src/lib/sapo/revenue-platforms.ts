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
