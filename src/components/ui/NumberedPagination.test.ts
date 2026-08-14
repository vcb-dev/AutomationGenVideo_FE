/**
 * NumberedPagination dùng chung cho trang chuyển đổi nội dung AI (7f94a61) — `getPageNumbers`
 * quyết định dãy số + dấu "..." hiển thị. Test khoá 2 điều dễ vỡ nhất: hiển thị ĐỦ số khi
 * tổng số trang ít (không cần rút gọn), và luôn giữ đúng 1 trang liền kề mỗi bên trang hiện
 * tại khi rút gọn — sai 1 ly ở biên rangeStart/rangeEnd rất dễ lặp lại dấu "..." liền số hoặc
 * bỏ sót số 1/trang cuối.
 */

import { getPageNumbers } from './NumberedPagination';

describe('getPageNumbers — tổng số trang <= 7: hiển thị đủ, không rút gọn', () => {
  it('total=1 trả về [1]', () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });

  it('total=7 trả đủ 1..7 dù đang ở trang nào', () => {
    expect(getPageNumbers(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getPageNumbers(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('getPageNumbers — tổng số trang > 7: rút gọn với "..."', () => {
  it('đang ở trang đầu (1/20): không có "..." bên trái, có "..." bên phải', () => {
    expect(getPageNumbers(1, 20)).toEqual([1, 2, '...', 20]);
  });

  it('đang ở trang cuối (20/20): có "..." bên trái, không có bên phải', () => {
    expect(getPageNumbers(20, 20)).toEqual([1, '...', 19, 20]);
  });

  it('đang ở giữa (10/20): "..." cả 2 bên, giữ đúng 1 trang liền kề mỗi bên', () => {
    expect(getPageNumbers(10, 20)).toEqual([1, '...', 9, 10, 11, '...', 20]);
  });

  it('trang 2/20: rangeStart=2 chạm biên "không cần dấu ... bên trái" (liền số 1)', () => {
    expect(getPageNumbers(2, 20)).toEqual([1, 2, 3, '...', 20]);
  });

  it('trang 3/20: rangeStart=2 vẫn liền số 1, không có "..." thừa', () => {
    expect(getPageNumbers(3, 20)).toEqual([1, 2, 3, 4, '...', 20]);
  });

  it('trang 4/20: bắt đầu có "..." bên trái vì rangeStart=3 > 2', () => {
    expect(getPageNumbers(4, 20)).toEqual([1, '...', 3, 4, 5, '...', 20]);
  });

  it('trang total-1 (19/20): rangeEnd chạm biên total-1, liền số cuối không có "..."', () => {
    expect(getPageNumbers(19, 20)).toEqual([1, '...', 18, 19, 20]);
  });

  it('total=8 (vừa vượt ngưỡng 7): vẫn rút gọn đúng quy tắc', () => {
    expect(getPageNumbers(4, 8)).toEqual([1, '...', 3, 4, 5, '...', 8]);
  });

  it('không bao giờ có 2 dấu "..." liên tiếp', () => {
    for (let current = 1; current <= 20; current++) {
      const pages = getPageNumbers(current, 20);
      for (let i = 0; i < pages.length - 1; i++) {
        expect(!(pages[i] === '...' && pages[i + 1] === '...')).toBe(true);
      }
    }
  });

  it('luôn có trang 1 và trang cuối trong kết quả', () => {
    for (let current = 1; current <= 20; current++) {
      const pages = getPageNumbers(current, 20);
      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(20);
    }
  });
});
