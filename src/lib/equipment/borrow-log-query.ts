/**
 * Dựng tham số truy vấn cho trang Nhật ký mượn từ trạng thái bộ lọc trên màn hình.
 *
 * Bộ lọc để trống là chuyện thường xuyên nhất — mở trang lần đầu, hoặc bấm xoá lọc. Gửi kèm
 * `status=` rỗng thì BE nhận chuỗi rỗng và lọc theo nó, kết quả ra 0 dòng và người dùng tưởng
 * kho không có lượt mượn nào. Hỏng im lặng: không lỗi, không cảnh báo, chỉ là bảng trống.
 */

/** Trần một trang, khớp `MAX_PAGE_SIZE` bên BE — xin hơn cũng bị cắt. */
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export interface BorrowLogFilters {
  status: string;
  from: string;
  to: string;
  page: number;
  pageSize?: number;
}

export interface BorrowLogQuery {
  status?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export function buildBorrowLogQuery(filters: BorrowLogFilters): BorrowLogQuery {
  let { from, to } = filters;

  // Người dùng hay chọn ngược thứ tự ngày. Gửi nguyên thì BE trả rỗng mà không nói vì sao.
  if (from && to && from > to) [from, to] = [to, from];

  const query: BorrowLogQuery = {
    page: Math.max(1, filters.page || 1),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, filters.pageSize || DEFAULT_PAGE_SIZE)),
  };

  if (filters.status) query.status = filters.status;
  if (from) query.from = from;
  if (to) query.to = to;

  return query;
}
