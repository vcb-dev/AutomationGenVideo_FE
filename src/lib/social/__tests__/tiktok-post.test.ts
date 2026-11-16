import type { TikTokCreatorInfo } from '@/lib/api/social';
import {
  EMPTY_TIKTOK_SETTINGS,
  TIKTOK_OPTIONS_PREFIX,
  TikTokComposerSettings,
  commercialLabel,
  encodeTikTokSettings,
  isTikTokPostingAccount,
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

describe('isTikTokPostingAccount', () => {
  it.each([
    [{ platform: 'TIKTOK', extra_data: { openId: 'oid' } }, true],
    [{ platform: 'TIKTOK', extra_data: { source: 'manual', openId: 'oid' } }, false],
    [{ platform: 'TIKTOK', extra_data: { source: 'sapo_orders' } }, false],
    [{ platform: 'TIKTOK', extra_data: undefined }, false],
    [{ platform: 'YOUTUBE', extra_data: { openId: 'oid' } }, false],
  ] as const)('%j → %s', (acc, want) => {
    expect(isTikTokPostingAccount(acc as any)).toBe(want);
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

describe('validateTikTokSettings', () => {
  const ok = { allowedPrivacy: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'], hasVideo: true };

  it('hợp lệ → null', () => {
    expect(validateTikTokSettings(s({ privacyLevel: 'SELF_ONLY' }), ok)).toBeNull();
  });

  it('chưa có video', () => {
    expect(validateTikTokSettings(s({ privacyLevel: 'SELF_ONLY' }), { ...ok, hasVideo: false })).toMatch(/video/);
  });

  it('chưa chọn quyền riêng tư (TikTok cấm chọn sẵn)', () => {
    expect(validateTikTokSettings(s(), ok)).toMatch(/Ai có thể xem video/);
  });

  it('quyền riêng tư không còn trong lựa chọn của kênh', () => {
    expect(validateTikTokSettings(s({ privacyLevel: 'MUTUAL_FOLLOW_FRIENDS' }), ok)).toMatch(/chọn lại/);
  });

  it('bật nội dung thương mại mà chưa chọn loại', () => {
    expect(validateTikTokSettings(s({ privacyLevel: 'SELF_ONLY', commercial: true }), ok)).toMatch(/Thương hiệu của bạn/);
  });

  it('nội dung có tài trợ + "Chỉ mình tôi" → không hợp lệ', () => {
    expect(validateTikTokSettings(s({ privacyLevel: 'SELF_ONLY', commercial: true, brandContent: true }), ok)).toMatch(/Chỉ mình tôi/);
  });

  it('nội dung có tài trợ + công khai → hợp lệ', () => {
    expect(validateTikTokSettings(s({ privacyLevel: 'PUBLIC_TO_EVERYONE', commercial: true, brandContent: true }), ok)).toBeNull();
  });
});

describe('commercialLabel', () => {
  it('đúng nhãn theo loại', () => {
    expect(commercialLabel(s())).toBeNull();
    expect(commercialLabel(s({ commercial: true, brandOrganic: true }))).toMatch(/Nội dung quảng cáo/);
    expect(commercialLabel(s({ commercial: true, brandOrganic: true, brandContent: true }))).toMatch(/Hợp tác có trả phí/);
  });
});
