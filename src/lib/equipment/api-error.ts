/**
 * Lấy câu lỗi đọc được từ một lỗi trả về của API.
 *
 * NestJS trả `message` ở HAI dạng khác nhau tuỳ nguồn lỗi:
 *   - Lỗi nghiệp vụ (`BadRequestException('...')`) → chuỗi
 *   - Lỗi validate DTO (class-validator)          → MẢNG chuỗi, mỗi ràng buộc một dòng
 *
 * Các màn trước đây gán thẳng giá trị đó vào state kiểu `string`. Gặp mảng thì React nối các
 * phần tử lại không dấu phân cách — "serialNumber should not be emptylocationId must be a UUID" —
 * đọc như chuỗi rác chứ không như một lời chỉ dẫn.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { status?: number; data?: { message?: unknown } };
    code?: string;
  };

  // KHÔNG có `response` nghĩa là request chưa từng tới máy chủ: máy chủ chưa bật, sập giữa
  // chừng, hoặc bị CORS chặn. Nói đúng vế đó thay vì một câu chung chung về dữ liệu — người
  // dùng biết ngay phải đi xem cái gì thay vì đi báo lỗi chức năng.
  //
  // Lý do có mục này: một lần API kho thiết bị hỏng vì máy chủ không phản hồi, mà màn hình chỉ
  // ghi "Không đọc được danh sách thiết bị" nên mất cả buổi truy nhầm hướng.
  if (error && typeof error === 'object' && 'config' in error && !err.response) {
    return err.code === 'ECONNABORTED'
      ? 'Máy chủ phản hồi quá lâu nên yêu cầu bị huỷ. Thử lại sau giây lát.'
      : 'Không kết nối được máy chủ. Kiểm tra backend còn chạy không rồi tải lại trang.';
  }

  const message = err?.response?.data?.message;

  if (Array.isArray(message)) {
    const parts = message.filter((part): part is string => typeof part === 'string' && !!part.trim());
    // Nối bằng dấu chấm phẩy: nhiều ràng buộc hỏng cùng lúc vẫn tách bạch từng câu.
    if (parts.length > 0) return parts.join('; ');
  }

  if (typeof message === 'string' && message.trim()) return message;

  return fallback;
}
