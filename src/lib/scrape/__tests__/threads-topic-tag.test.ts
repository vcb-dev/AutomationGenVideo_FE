import { filterByTopicTag, normalizeTopicTag } from '../threads-helpers';

/**
 * Tag chủ đề Threads ("người đăng › trang sức"): bấm tag trên bài để lọc. Tag lưu từ hai nguồn —
 * tên hiển thị của Threads và tag người dùng gõ khi tìm — nên so sánh phải bỏ #, hoa thường,
 * khoảng trắng thừa, khớp với BE (normalizeTopicTag) và AI (normalize_tag).
 */
describe('normalizeTopicTag', () => {
  it('bỏ #, gộp khoảng trắng, chữ thường', () => {
    expect(normalizeTopicTag('#Trang  Sức ')).toBe('trang sức');
    expect(normalizeTopicTag('')).toBe('');
    expect(normalizeTopicTag('  #  ')).toBe('');
  });
});

describe('filterByTopicTag', () => {
  const posts = [
    { post_id: '1', topic_tag: 'trang sức' },
    { post_id: '2', topic_tag: 'Trang Sức' },
    { post_id: '3', topic_tag: 'trang sức bạc' },
    { post_id: '4', topic_tag: '' },
    { post_id: '5' },
  ];

  it('khớp đúng tag, không phân biệt hoa thường, không khớp tag dài hơn', () => {
    expect(filterByTopicTag(posts, '#trang sức').map((p) => p.post_id)).toEqual(['1', '2']);
  });

  it('tag rỗng thì không lọc', () => {
    expect(filterByTopicTag(posts, '')).toHaveLength(5);
  });
});
