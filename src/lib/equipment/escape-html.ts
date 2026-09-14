/**
 * Escape một giá trị trước khi ghép vào chuỗi HTML.
 *
 * Phiếu in được dựng bằng `document.write` trên một chuỗi HTML tự ghép, nên MỌI giá trị nội suy
 * đều phải đi qua đây. Bỏ sót một chỗ là đủ: `project` và `place` là ô nhập tự do ở màn Tạo
 * phiếu mà bất kỳ nhân viên nào cũng điền được, còn iframe in thì cùng origin với ứng dụng —
 * một thẻ `<img onerror>` nhét vào tên dự án sẽ chạy trong phiên của người quản lý kho lúc họ
 * bấm In, và gọi được API dưới danh nghĩa của họ.
 *
 * Escape cả `'` và `"` vì có giá trị rơi vào trong thuộc tính HTML, không chỉ nằm giữa hai thẻ.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  // `&` phải nằm trong cùng một lượt thay thế, không xử lý riêng trước: làm hai lượt thì
  // `&lt;` do lượt sau sinh ra bị lượt trước escape tiếp thành `&amp;lt;`.
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}
