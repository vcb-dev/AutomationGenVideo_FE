/**
 * Chức năng: CSS trang Bộ sưu tập ép khung dashboard đổi theo nền trang mà không làm mất chữ ở header.
 */
import { VIDEO_LIBRARY_PAGE_THEME_CSS } from '../page-theme-css';

/** Tách CSS thành danh sách selector của từng luật. */
const selectors = VIDEO_LIBRARY_PAGE_THEME_CSS.split('}')
  .map((rule) => rule.split('{')[0].trim())
  .filter(Boolean);

const lightSelectors = selectors.filter((s) => s.startsWith('html:not(.dark)'));
const darkSelectors = selectors.filter((s) => s.startsWith('.dark'));

describe('VIDEO_LIBRARY_PAGE_THEME_CSS', () => {
  it('giao diện sáng không đụng vào header (header chỉ có bản nền tối, chữ trắng)', () => {
    expect(lightSelectors.filter((s) => /\bheader\b/.test(s))).toEqual([]);
  });

  it('giao diện sáng vẫn ép body và main sang nền sáng của trang', () => {
    expect(lightSelectors).toEqual(expect.arrayContaining(['html:not(.dark) body', 'html:not(.dark) main']));
  });

  it('giao diện tối vẫn đổi header, body, main sang nền tối của trang', () => {
    expect(darkSelectors).toEqual(expect.arrayContaining(['.dark header', '.dark body', '.dark main']));
  });

  it('mọi luật đều bọc theo giao diện để nút đổi sáng/tối còn tác dụng', () => {
    expect(selectors.filter((s) => !lightSelectors.includes(s) && !darkSelectors.includes(s))).toEqual([]);
  });
});
