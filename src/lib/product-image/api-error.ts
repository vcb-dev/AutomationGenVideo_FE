/**
 * Đổi lỗi axios khi gọi /product-image/* thành câu hiển thị cho người dùng.
 *
 * BE trả `{ message }` qua AllExceptionsFilter — lời AI service (vd "Gemini trả lời: ...", "sửa
 * GEMINI_MODEL") đã được BE chuyển nguyên vào đây, nên hiện nguyên văn để người dùng/quản trị biết
 * đúng lý do thay vì một câu chung chung.
 */
export function isCanceledRequest(err: any): boolean {
  return err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
}

export function apiErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message) && message.length > 0) return message.join('; ');
  if (typeof message === 'string' && message.trim()) return message;
  if (err?.code === 'ECONNABORTED') return 'Máy chủ phản hồi quá lâu, vui lòng thử lại.';
  if (!err?.response) return 'Không kết nối được máy chủ, kiểm tra mạng rồi thử lại.';
  return fallback;
}
