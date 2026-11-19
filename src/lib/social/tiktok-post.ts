/**
 * Logic thuần cho phần "Cài đặt TikTok" trên màn soạn bài.
 *
 * TikTok (Content Posting API — Direct Post) bắt app phải cho người dùng TỰ chọn:
 * quyền riêng tư (không chọn sẵn), bình luận/Duet/Stitch, và công bố nội dung thương mại.
 * Định dạng gói tuỳ chọn phải KHỚP với BE (`publish/tiktok-post.util.ts`): `tiktok:` + JSON gọn,
 * gửi qua trường `privacy` vì bảng social_posts không có cột riêng.
 */
import type { TikTokCreatorInfo } from '@/lib/api/social';

export const TIKTOK_PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Mọi người',
  MUTUAL_FOLLOW_FRIENDS: 'Bạn bè (follow nhau)',
  FOLLOWER_OF_CREATOR: 'Người theo dõi',
  SELF_ONLY: 'Chỉ mình tôi',
};

export interface TikTokComposerSettings {
  /** '' = chưa chọn — TikTok cấm chọn sẵn */
  privacyLevel: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  /** Bật "Công bố nội dung thương mại" */
  commercial: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
}

export const EMPTY_TIKTOK_SETTINGS: TikTokComposerSettings = {
  privacyLevel: '',
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  commercial: false,
  brandOrganic: false,
  brandContent: false,
};

export const TIKTOK_OPTIONS_PREFIX = 'tiktok:';

/** Gói tuỳ chọn gửi BE qua trường privacy (cùng định dạng với BE) */
export function encodeTikTokSettings(s: TikTokComposerSettings): string {
  const commercial = s.commercial;
  return TIKTOK_OPTIONS_PREFIX + JSON.stringify({
    p: s.privacyLevel,
    c: s.allowComment ? 1 : 0,
    d: s.allowDuet ? 1 : 0,
    s: s.allowStitch ? 1 : 0,
    bo: commercial && s.brandOrganic ? 1 : 0,
    bc: commercial && s.brandContent ? 1 : 0,
  });
}

/**
 * Gộp thông tin nhiều kênh TikTok đang chọn thành một bộ lựa chọn chung:
 * chỉ cho chọn quyền riêng tư mà MỌI kênh đều cho phép; kênh nào tắt tương tác thì tắt chung;
 * giới hạn thời lượng lấy mức nhỏ nhất.
 */
export function mergeCreatorInfos(infos: TikTokCreatorInfo[]) {
  if (!infos.length) {
    return { privacyLevelOptions: [] as string[], commentDisabled: false, duetDisabled: false, stitchDisabled: false, maxVideoPostDurationSec: null as number | null };
  }
  const privacyLevelOptions = infos
    .map((i) => i.privacyLevelOptions || [])
    .reduce((acc, list) => acc.filter((p) => list.includes(p)));
  const durations = infos.map((i) => i.maxVideoPostDurationSec).filter((d): d is number => typeof d === 'number' && d > 0);
  return {
    privacyLevelOptions,
    commentDisabled: infos.some((i) => i.commentDisabled),
    duetDisabled: infos.some((i) => i.duetDisabled),
    stitchDisabled: infos.some((i) => i.stitchDisabled),
    maxVideoPostDurationSec: durations.length ? Math.min(...durations) : null,
  };
}

/**
 * Kiểm tra trước khi đăng. Trả câu lỗi tiếng Việt hoặc null nếu hợp lệ.
 * Khớp các luật TikTok yêu cầu trên giao diện đăng bài.
 */
export function validateTikTokSettings(
  s: TikTokComposerSettings,
  opts: { allowedPrivacy: string[]; hasVideo: boolean },
): string | null {
  if (!opts.hasVideo) return 'TikTok chỉ đăng được video — hãy thêm một video.';
  if (!s.privacyLevel) return 'Chọn "Ai có thể xem video" cho TikTok.';
  if (!opts.allowedPrivacy.includes(s.privacyLevel)) return 'Quyền riêng tư đã chọn không còn hợp lệ với kênh TikTok này. Hãy chọn lại.';
  if (s.commercial && !s.brandOrganic && !s.brandContent) {
    return 'Đã bật "Công bố nội dung thương mại" — chọn "Thương hiệu của bạn" và/hoặc "Nội dung có tài trợ".';
  }
  if (s.commercial && s.brandContent && s.privacyLevel === 'SELF_ONLY') {
    return 'Nội dung có tài trợ không thể để chế độ "Chỉ mình tôi".';
  }
  return null;
}

/** Nhãn TikTok sẽ gắn lên video khi công bố nội dung thương mại */
export function commercialLabel(s: TikTokComposerSettings): string | null {
  if (!s.commercial) return null;
  if (s.brandContent) return 'Video sẽ được gắn nhãn "Hợp tác có trả phí".';
  if (s.brandOrganic) return 'Video sẽ được gắn nhãn "Nội dung quảng cáo".';
  return null;
}

export const TIKTOK_MUSIC_POLICY_URL = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
export const TIKTOK_BRANDED_POLICY_URL = 'https://www.tiktok.com/legal/page/global/bc-policy/en';
