/**
 * Logic thuần cho phần "Cài đặt TikTok" trên màn soạn bài.
 *
 * TikTok (Content Posting API — Direct Post) bắt app phải cho người dùng TỰ chọn:
 * quyền riêng tư (không chọn sẵn), bình luận/Duet/Stitch, và công bố nội dung thương mại.
 * Định dạng gói tuỳ chọn phải KHỚP với BE (`publish/tiktok-post.util.ts`): `tiktok:` + JSON gọn,
 * gửi qua trường `privacy` vì bảng social_posts không có cột riêng.
 */
import type { TikTokCreatorInfo } from '@/lib/api/social';

// Nhãn quyền riêng tư, câu kiểm tra, nhãn nội dung thương mại: nằm trong bộ dịch
// SocialLanguageContext (t.tiktok.*) — file này chỉ trả MÃ để giao diện tự dịch theo VI/EN.

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

export type TikTokSettingsError =
  | 'video_required'
  | 'privacy_required'
  | 'privacy_invalid'
  | 'commercial_type_required'
  | 'branded_self_only';

/**
 * Kiểm tra trước khi đăng. Trả MÃ lỗi (dịch qua t.tiktok.validation[mã]) hoặc null nếu hợp lệ.
 * Khớp các luật TikTok yêu cầu trên giao diện đăng bài.
 */
export function validateTikTokSettings(
  s: TikTokComposerSettings,
  opts: { allowedPrivacy: string[]; hasVideo: boolean },
): TikTokSettingsError | null {
  if (!opts.hasVideo) return 'video_required';
  if (!s.privacyLevel) return 'privacy_required';
  if (!opts.allowedPrivacy.includes(s.privacyLevel)) return 'privacy_invalid';
  if (s.commercial && !s.brandOrganic && !s.brandContent) return 'commercial_type_required';
  if (s.commercial && s.brandContent && s.privacyLevel === 'SELF_ONLY') return 'branded_self_only';
  return null;
}

/** Loại nhãn TikTok sẽ gắn khi công bố nội dung thương mại (dịch qua t.tiktok.labelBranded/labelOrganic) */
export function commercialLabelKind(s: TikTokComposerSettings): 'branded' | 'organic' | null {
  if (!s.commercial) return null;
  if (s.brandContent) return 'branded';
  if (s.brandOrganic) return 'organic';
  return null;
}

/** Đọc mã lỗi TikTok mà backend gắn cuối câu: "… (mã TikTok: access_token_invalid)" */
export function readTikTokErrorCode(message: string | null | undefined): string | null {
  const m = /\(mã TikTok: ([a-z0-9_]+)\)/i.exec(message || '');
  return m ? m[1] : null;
}

/**
 * Lỗi đăng bài backend trả về là tiếng Việt. Khi giao diện đang ở EN và lỗi có mã TikTok,
 * thay bằng câu tiếng Anh theo mã (giữ mã ở cuối để tra cứu). Lỗi khác giữ nguyên.
 */
export function localizePublishError(
  message: string | null | undefined,
  lang: 'vi' | 'en',
  dict: { errorCodes: Record<string, string>; unknownError: (code: string) => string },
): string {
  const msg = message || '';
  if (lang !== 'en') return msg;
  const code = readTikTokErrorCode(msg);
  if (!code) return msg;
  const stackIdx = msg.search(/\s*\|\s*stack:/i);
  const tail = stackIdx >= 0 ? msg.slice(stackIdx) : '';
  const text = dict.errorCodes[code] || dict.unknownError(code);
  return `${text} (TikTok code: ${code})${tail}`;
}

export const TIKTOK_MUSIC_POLICY_URL = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
export const TIKTOK_BRANDED_POLICY_URL = 'https://www.tiktok.com/legal/page/global/bc-policy/en';
