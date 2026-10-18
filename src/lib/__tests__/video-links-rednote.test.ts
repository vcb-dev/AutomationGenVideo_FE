import { guessPlatformFromUrl, parseVideoLinks } from '../video-links';

// rednote.com là domain quốc tế của Xiaohongshu, trước đây bị đoán thành 'tiktok'.
describe('guessPlatformFromUrl — link rednote.com', () => {
  it.each([
    'https://www.rednote.com/explore/6620f4c3000000000d021234?xsec_token=ABc=&xsec_source=pc_search',
    'https://www.rednote.com/discovery/item/6620f4c3000000000d021234',
  ])('%s → xiaohongshu', (url) => {
    expect(guessPlatformFromUrl(url)).toBe('xiaohongshu');
  });
});

describe('parseVideoLinks — dán link video rednote.com', () => {
  it('gắn đúng nền tảng xiaohongshu và bóc được mã bài', () => {
    const { links } = parseVideoLinks('https://www.rednote.com/explore/6620f4c3000000000d021234?xsec_token=ABc=');
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ platform: 'xiaohongshu', videoId: '6620f4c3000000000d021234' });
    expect(links[0].error).toBeUndefined();
  });

  it('cùng một bài dán bằng rednote.com và xiaohongshu.com chỉ tính một lần', () => {
    const { links, duplicates } = parseVideoLinks([
      'https://www.rednote.com/explore/6620f4c3000000000d021234',
      'https://www.xiaohongshu.com/explore/6620f4c3000000000d021234',
    ].join('\n'));
    expect(links).toHaveLength(1);
    expect(duplicates).toBe(1);
  });
});
