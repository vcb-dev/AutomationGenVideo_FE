import { fanpageAvatarSrc } from '../fanpage-avatar';

/**
 * Avatar fanpage ở Khám phá kênh: BE trả avatar_url = 'FAILED' (dấu khi đẩy ảnh lên kho lỗi), FE
 * gắn thẳng vào <img src> nên trình duyệt gọi /dashboard/externalChannels/FAILED → 404 và page mất
 * avatar (6/14 fanpage local ngày 2026-10-01).
 */
describe('fanpageAvatarSrc', () => {
  it('dùng avatar đã lưu', () => {
    expect(fanpageAvatarSrc({ avatar_url: 'https://cdn/a.jpg', profile_id: '1' })).toBe('https://cdn/a.jpg');
  });

  it("'FAILED' không phải URL — rơi về ảnh Graph theo ID page", () => {
    expect(fanpageAvatarSrc({ avatar_url: 'FAILED', profile_id: '100063576820959' })).toBe(
      'https://graph.facebook.com/100063576820959/picture?type=large',
    );
  });

  it('id tạm tmp_ không dựng link Graph (luôn 404) — hiện chữ cái đầu', () => {
    expect(fanpageAvatarSrc({ avatar_url: 'FAILED', profile_id: 'tmp_kazan.jewelry' })).toBeNull();
    expect(fanpageAvatarSrc({ avatar_url: null, profile_id: null })).toBeNull();
  });
});
