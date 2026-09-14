/**
 * URL ảnh đại diện kênh, trỏ qua backend thay vì gọi thẳng CDN của Meta.
 *
 * Lý do: `avatar_url` lưu trong DB là URL CÓ CHỮ KÝ của Meta, kèm tham số `oe`
 * hạn vài ngày. Nó được lưu lúc đồng bộ tài khoản, rồi vài tuần sau trình duyệt
 * tải lại và nhận 403 — giao diện đầy ô trống.
 *
 * Facebook có dạng vĩnh viễn (`graph.facebook.com/{id}/picture`), nhưng Instagram
 * và Threads thì không có endpoint tương đương. Backend tự lấy ảnh về, tự hỏi lại
 * API khi URL hết hạn, và cache lại — nên đường dẫn này không bao giờ hết hạn.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export function accountAvatarUrl(accountId: string): string {
  return `${API_BASE}/social/accounts/${accountId}/avatar`;
}
