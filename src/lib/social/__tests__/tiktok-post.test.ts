import type { TikTokCreatorInfo } from '@/lib/api/social';
import {
  EMPTY_TIKTOK_SETTINGS,
  TIKTOK_OPTIONS_PREFIX,
  TikTokComposerSettings,
  commercialLabelKind,
  localizePublishError,
  readTikTokErrorCode,
  encodeTikTokSettings,
  mergeCreatorInfos,
  validateTikTokSettings,
} from '../tiktok-post';

const s = (o: Partial<TikTokComposerSettings> = {}): TikTokComposerSettings => ({ ...EMPTY_TIKTOK_SETTINGS, ...o });

const info = (o: Partial<TikTokCreatorInfo> = {}): TikTokCreatorInfo => ({
  accountId: 'a',
  nickname: 'VCB',
  privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
  commentDisabled: false,
  duetDisabled: false,
  stitchDisabled: false,
  maxVideoPostDurationSec: 600,
  ...o,
});

describe('encodeTikTokSettings — khớp định dạng BE', () => {
  it('gói đủ trường, cờ dạng 0/1', () => {
    const raw = encodeTikTokSettings(s({ privacyLevel: 'SELF_ONLY', allowComment: true, commercial: true, brandOrganic: true }));
    expect(raw.startsWith(TIKTOK_OPTIONS_PREFIX)).toBe(true);
    expect(JSON.parse(raw.slice(TIKTOK_OPTIONS_PREFIX.length))).toEqual({ p: 'SELF_ONLY', c: 1, d: 0, s: 0, bo: 1, bc: 0 });
  });

  it('tắt "Công bố nội dung thương mại" thì không gửi cờ thương hiệu dù trước đó đã tick', () => {
    const raw = encodeTikTokSettings(s({ privacyLevel: 'SELF_ONLY', commercial: false, brandOrganic: true, brandContent: true }));
    const j = JSON.parse(raw.slice(TIKTOK_OPTIONS_PREFIX.length));
    expect([j.bo, j.bc]).toEqual([0, 0]);
  });
});

describe('mergeCreatorInfos', () => {
  it('quyền riêng tư = phần giao; tương tác tắt nếu một kênh tắt; thời lượng lấy nhỏ nhất', () => {
    const m = mergeCreatorInfos([
      info({ privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'], maxVideoPostDurationSec: 600 }),
      info({ privacyLevelOptions: ['SELF_ONLY', 'MUTUAL_FOLLOW_FRIENDS'], duetDisabled: true, maxVideoPostDurationSec: 180 }),
    ]);
    expect(m).toEqual({
      privacyLevelOptions: ['SELF_ONLY'],
      commentDisabled: false,
      duetDisabled: true,
      stitchDisabled: false,
      maxVideoPostDurationSec: 180,
    });
  });

  it('không có kênh nào → rỗng', () => {
    expect(mergeCreatorInfos([]).privacyLevelOptions).toEqual([]);
  });

  it('không kênh nào báo thời lượng → null', () => {
    expect(mergeCreatorInfos([info({ maxVideoPostDurationSec: null })]).maxVideoPostDurationSec).toBeNull();
  });
});

describe('validateTikTokSettings — trả MÃ lỗi để giao diện dịch theo VI/EN', () => {
  const ok = { allowedPrivacy: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'], hasVideo: true };

  it.each([
    [s({ privacyLevel: 'SELF_ONLY' }), ok, null],
    [s({ privacyLevel: 'SELF_ONLY' }), { ...ok, hasVideo: false }, 'video_required'],
    [s(), ok, 'privacy_required'],
    [s({ privacyLevel: 'MUTUAL_FOLLOW_FRIENDS' }), ok, 'privacy_invalid'],
    [s({ privacyLevel: 'SELF_ONLY', commercial: true }), ok, 'commercial_type_required'],
    [s({ privacyLevel: 'SELF_ONLY', commercial: true, brandContent: true }), ok, 'branded_self_only'],
    [s({ privacyLevel: 'PUBLIC_TO_EVERYONE', commercial: true, brandContent: true }), ok, null],
  ] as const)('ca %#', (settings, opts, want) => {
    expect(validateTikTokSettings(settings, opts as any)).toBe(want);
  });
});

describe('commercialLabelKind', () => {
  it('đúng loại nhãn', () => {
    expect(commercialLabelKind(s())).toBeNull();
    expect(commercialLabelKind(s({ commercial: true }))).toBeNull();
    expect(commercialLabelKind(s({ commercial: true, brandOrganic: true }))).toBe('organic');
    expect(commercialLabelKind(s({ commercial: true, brandOrganic: true, brandContent: true }))).toBe('branded');
  });
});

describe('localizePublishError — dịch lỗi đăng bài TikTok khi giao diện ở EN', () => {
  const dict = {
    errorCodes: { access_token_invalid: 'Your TikTok session has expired.' } as Record<string, string>,
    unknownError: (c: string) => `TikTok returned an error (${c})`,
  };
  const vi = 'Phiên đăng nhập TikTok đã hết hạn hoặc bị thu hồi. Hãy kết nối lại kênh. (mã TikTok: access_token_invalid)';

  it('đọc mã TikTok cuối câu', () => {
    expect(readTikTokErrorCode(vi)).toBe('access_token_invalid');
    expect(readTikTokErrorCode('lỗi khác')).toBeNull();
  });

  it('VI: giữ nguyên câu gốc', () => {
    expect(localizePublishError(vi, 'vi', dict)).toBe(vi);
  });

  it('EN + mã đã biết → câu tiếng Anh kèm mã', () => {
    expect(localizePublishError(vi, 'en', dict)).toBe('Your TikTok session has expired. (TikTok code: access_token_invalid)');
  });

  it('EN + mã lạ → câu chung kèm mã', () => {
    expect(localizePublishError('Lỗi gì đó (mã TikTok: weird_code)', 'en', dict))
      .toBe('TikTok returned an error (weird_code) (TikTok code: weird_code)');
  });

  it('EN: giữ phần "| stack:" phía sau để các chỗ đang cắt stack vẫn cắt đúng', () => {
    expect(localizePublishError(`${vi} | stack: at X`, 'en', dict))
      .toBe('Your TikTok session has expired. (TikTok code: access_token_invalid) | stack: at X');
  });

  it('EN + lỗi không phải TikTok (Facebook, mạng…) → giữ nguyên', () => {
    expect(localizePublishError('Request failed {"code":190}', 'en', dict)).toBe('Request failed {"code":190}');
    expect(localizePublishError(null, 'en', dict)).toBe('');
  });
});
