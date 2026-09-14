/**
 * Nhãn tiếng Việt cho trạng thái PHIẾU MƯỢN — bảng dịch của enum `MemsRequestStatus` bên BE.
 *
 * Bản trước nằm ngay trong màn Nhật ký và tự nghĩ ra ba giá trị không tồn tại (`ASSIGNED`,
 * `HANDED_OVER`, `COMPLETED`), đồng thời thiếu bốn giá trị có thật (`PREPARING`, `ON_LOAN`,
 * `PARTIALLY_RETURNED`, `CLOSED`). Vì chỗ tra bảng có `?? CANCELLED` nên hậu quả không phải ô
 * trống mà là NHÃN SAI: phiếu đang chuẩn bị, đang mượn hay đã trả xong đều hiện "Đã huỷ" —
 * trong khi mấy thẻ thống kê ngay phía trên lại đếm đúng, nên màn hình tự mâu thuẫn với chính nó.
 *
 * Tách ra khỏi màn hình để test được: đây là bảng phải khớp từng giá trị với enum của BE, mà một
 * bảng dịch nằm lẫn trong 800 dòng JSX thì không ai soát.
 */

export type RequestStatusTone =
  | 'pending'
  | 'approved'
  | 'preparing'
  | 'onLoan'
  | 'partial'
  | 'closed'
  | 'rejected'
  | 'cancelled'
  | 'draft';

export interface RequestStatusBadge {
  label: string;
  tone: RequestStatusTone;
}

/** Đủ chín giá trị của `MemsRequestStatus`, không thừa không thiếu. */
const REQUEST_STATUS: Record<string, RequestStatusBadge> = {
  DRAFT: { label: 'Nháp', tone: 'draft' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', tone: 'pending' },
  APPROVED: { label: 'Đã duyệt', tone: 'approved' },
  PREPARING: { label: 'Đang chuẩn bị', tone: 'preparing' },
  ON_LOAN: { label: 'Đang mượn', tone: 'onLoan' },
  PARTIALLY_RETURNED: { label: 'Trả một phần', tone: 'partial' },
  CLOSED: { label: 'Đã hoàn trả', tone: 'closed' },
  REJECTED: { label: 'Bị từ chối', tone: 'rejected' },
  CANCELLED: { label: 'Đã huỷ', tone: 'cancelled' },
};

/**
 * Giá trị lạ hiện nguyên mã thô chứ KHÔNG rơi về "Đã huỷ".
 *
 * Đây đúng là chỗ bản cũ sai: một nhãn dự phòng nghe hợp lý lại nói sai sự thật về phiếu, và
 * không ai phát hiện ra vì màn hình vẫn trông bình thường. Mã thô thì xấu nhưng trung thực.
 */
export function requestStatusBadge(status: string): RequestStatusBadge {
  return REQUEST_STATUS[status] ?? { label: status, tone: 'draft' };
}

/** Lựa chọn cho ô lọc. Chỉ những trạng thái BE nhận, nếu không bấm vào là ăn 400. */
export const REQUEST_STATUS_FILTER_OPTIONS = [
  { value: '', label: '⚡ Tất cả trạng thái phiếu' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'PREPARING', label: 'Đang chuẩn bị' },
  { value: 'ON_LOAN', label: 'Đang mượn' },
  { value: 'PARTIALLY_RETURNED', label: 'Trả một phần' },
  { value: 'CLOSED', label: 'Đã hoàn trả' },
  { value: 'REJECTED', label: 'Bị từ chối' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

/** Phiếu còn đang giữ máy ngoài kho — dùng cho thẻ thống kê "Đang mượn". */
export const HOLDING_STATUSES = ['ON_LOAN', 'PARTIALLY_RETURNED'];

/** Giai đoạn còn huỷ được — phải KHỚP với `CANCELLABLE_STATUSES` bên BE. */
const CANCELLABLE_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PREPARING'];

/**
 * Có hiện nút Huỷ phiếu cho người này không.
 *
 * Chép đúng luật của BE để không hiện nút rồi bấm vào ăn 403: chủ phiếu chỉ huỷ được khi phiếu
 * CHƯA duyệt — sau đó kho đã bắt đầu soạn hàng nên rút lui phải qua người giữ kho. Quản lý kho
 * huỷ được tới trước lúc bàn giao.
 */
export function canCancelRequest(
  request: { status: string; owner_id: string },
  viewer: { id?: string; isCatalogManager: boolean },
): boolean {
  if (!CANCELLABLE_STATUSES.includes(request.status)) return false;
  if (viewer.isCatalogManager) return true;
  return request.owner_id === viewer.id && request.status === 'PENDING_APPROVAL';
}
