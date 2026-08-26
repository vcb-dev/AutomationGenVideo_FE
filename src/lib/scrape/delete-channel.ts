/**
 * Hộp xác nhận trước khi xoá cứng một kênh khám phá bên ngoài.
 *
 * BE xoá kênh là xoá vĩnh viễn: bản ghi kênh và toàn bộ video/lịch sử chỉ số đi kèm đều
 * mất, không khôi phục được. Trên thẻ hiển thị thì một kênh đã cào 300 video trông giống
 * hệt một kênh rác 0 video, nên số video phải được nói ra ở bước xác nhận chứ không phải
 * để người dùng tự đoán.
 */

/**
 * Tám nền tảng có kênh khám phá bên ngoài xoá được. Giữ thành mảng chứ không chỉ là kiểu
 * union: test đếm được độ dài để bắt trường hợp thêm nền tảng mới mà quên nối nút xoá.
 */
export const DELETABLE_CHANNEL_PLATFORMS = [
  'facebook',
  'tiktok',
  'instagram',
  'youtube',
  'douyin',
  'xiaohongshu',
  'kuaishou',
  'bilibili',
] as const;

export type DeletableChannelPlatform = (typeof DELETABLE_CHANNEL_PLATFORMS)[number];

/**
 * Facebook lệch chuẩn: kênh của nó là "fanpage", route không có đoạn `profiles`. Bảy nền
 * tảng còn lại đều theo `/scraper/<platform>/profiles/<id>`.
 */
export function buildDeleteChannelPath(platform: DeletableChannelPlatform, id: number): string {
  if (platform === 'facebook') return `/scraper/fanpages/${id}`;
  return `/scraper/${platform}/profiles/${id}`;
}

/**
 * Đường dẫn "Đồng bộ tất cả" — lệch chuẩn ở Facebook giống hệt phần xoá.
 */
export function buildSyncAllChannelsPath(platform: DeletableChannelPlatform): string {
  if (platform === 'facebook') return '/scraper/fanpages/sync-all';
  return `/scraper/${platform}/profiles/sync-all`;
}

/**
 * Hộp xác nhận trước khi đồng bộ hàng loạt.
 *
 * Đây là thao tác tốn tiền thật: mỗi kênh là một lượt gọi API bên thứ ba (TikHub tính
 * 0,0055 USD/lượt, Facebook ăn vào quota RapidAPI đang cạn). Và nó chạy vài phút vì mỗi
 * kênh nghỉ 5 giây giữa các lượt — không nói trước thì người dùng tưởng treo rồi bấm lại.
 */
export function buildSyncAllConfirm(channelCount: number): string {
  if (channelCount <= 0) return '';
  return (
    `Đồng bộ lại toàn bộ ${channelCount.toLocaleString('vi-VN')} kênh của nền tảng này?\n\n` +
    `Quá trình chạy nền và mất vài phút. Mỗi kênh là một lượt gọi API có tính phí.`
  );
}

export interface DeleteChannelTarget {
  name: string;
  videoCount: number;
}

const FALLBACK_LABEL = 'kênh này';

export function buildDeleteChannelConfirm({ name, videoCount }: DeleteChannelTarget): string {
  const label = name.trim() ? `"${name.trim()}"` : FALLBACK_LABEL;

  // videoCount = 0 thì bỏ hẳn mệnh đề video: câu "kèm 0 video" vừa thừa vừa làm người đọc
  // khựng lại giữa lúc đang cần quyết định nhanh.
  const videoClause =
    videoCount > 0
      ? ` cùng ${videoCount.toLocaleString('vi-VN')} video đã cào`
      : '';

  return `Xoá ${label}${videoClause}?\n\nThao tác này KHÔNG HOÀN TÁC được.`;
}
