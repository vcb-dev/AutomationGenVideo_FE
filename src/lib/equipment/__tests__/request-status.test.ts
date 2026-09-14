import {
  REQUEST_STATUS_FILTER_OPTIONS,
  canCancelRequest,
  requestStatusBadge,
} from '../request-status';

/**
 * Bảng dịch trạng thái phiếu mượn phải khớp TỪNG GIÁ TRỊ với enum `MemsRequestStatus` bên BE.
 *
 * Vì sao đáng một file test riêng: bản cũ tra bảng kèm `?? CANCELLED`, nên thiếu một khoá không
 * cho ra ô trống mà cho ra NHÃN SAI. Phiếu đang mượn hiện "Đã huỷ" — sai kiểu đó không ai nhìn
 * ra khi soát mắt, vì màn hình vẫn trông bình thường.
 */

/** Chép tay từ `enum MemsRequestStatus` trong schema.prisma. Lệch là test này phải đỏ. */
const ENUM_CUA_BE = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'PREPARING',
  'ON_LOAN',
  'PARTIALLY_RETURNED',
  'CLOSED',
];

describe('requestStatusBadge', () => {
  it.each(ENUM_CUA_BE)('có nhãn riêng cho %s', (status) => {
    expect(requestStatusBadge(status).label).not.toBe(status);
  });

  it('bốn trạng thái từng bị thiếu không còn hiện thành "Đã huỷ"', () => {
    // Đây là lỗi thật đã gặp: phiếu đang chuẩn bị, đang mượn, trả một phần và đã đóng đều rơi
    // vào nhãn dự phòng, trong khi thẻ thống kê ngay phía trên lại đếm đúng.
    for (const status of ['PREPARING', 'ON_LOAN', 'PARTIALLY_RETURNED', 'CLOSED']) {
      expect(requestStatusBadge(status).label).not.toBe('Đã huỷ');
    }
  });

  it('phân biệt được đã huỷ với đã hoàn trả', () => {
    expect(requestStatusBadge('CANCELLED').label).toBe('Đã huỷ');
    expect(requestStatusBadge('CLOSED').label).toBe('Đã hoàn trả');
  });

  it('giá trị lạ hiện mã thô, không mượn nhãn của trạng thái khác', () => {
    // Thà xấu mà trung thực: một nhãn dự phòng nghe hợp lý sẽ nói sai về phiếu mà không ai biết.
    expect(requestStatusBadge('TRANG_THAI_LA').label).toBe('TRANG_THAI_LA');
  });
});

describe('REQUEST_STATUS_FILTER_OPTIONS', () => {
  it('mọi lựa chọn lọc đều là trạng thái BE nhận', () => {
    // Ba lựa chọn cũ (`ASSIGNED`, `HANDED_OVER`, `COMPLETED`) không có trong enum: bấm vào là
    // BE trả lỗi chứ không lọc được gì.
    for (const option of REQUEST_STATUS_FILTER_OPTIONS) {
      if (option.value === '') continue;
      expect(ENUM_CUA_BE).toContain(option.value);
    }
  });
});

/**
 * Nút Huỷ phiếu phải hiện đúng bằng luật của BE.
 *
 * Hiện thừa thì người dùng bấm vào ăn 403; hiện thiếu thì phiếu đặt nhầm ngày nằm đó giữ chỗ
 * cho tới khi có người từ chối hộ.
 */
describe('canCancelRequest', () => {
  const cua_toi = { status: 'PENDING_APPROVAL', owner_id: 'toi' };
  const toi = { id: 'toi', isCatalogManager: false };
  const thu_kho = { id: 'thu-kho', isCatalogManager: true };

  it('chủ phiếu huỷ được phiếu của mình khi còn chờ duyệt', () => {
    expect(canCancelRequest(cua_toi, toi)).toBe(true);
  });

  it('chủ phiếu KHÔNG huỷ được sau khi phiếu đã duyệt', () => {
    // Kho đã bắt đầu soạn hàng; rút lui phải qua người giữ kho.
    expect(canCancelRequest({ ...cua_toi, status: 'APPROVED' }, toi)).toBe(false);
    expect(canCancelRequest({ ...cua_toi, status: 'PREPARING' }, toi)).toBe(false);
  });

  it('không phải phiếu của mình thì không hiện nút', () => {
    expect(canCancelRequest({ ...cua_toi, owner_id: 'nguoi-khac' }, toi)).toBe(false);
  });

  it('quản lý kho huỷ được mọi phiếu chưa bàn giao', () => {
    for (const status of ['PENDING_APPROVAL', 'APPROVED', 'PREPARING']) {
      expect(canCancelRequest({ status, owner_id: 'nguoi-khac' }, thu_kho)).toBe(true);
    }
  });

  it('máy đã ra khỏi kho thì không ai huỷ được', () => {
    // Đường về duy nhất là màn Nhận trả.
    for (const status of ['ON_LOAN', 'PARTIALLY_RETURNED', 'CLOSED', 'REJECTED', 'CANCELLED']) {
      expect(canCancelRequest({ status, owner_id: 'toi' }, thu_kho)).toBe(false);
      expect(canCancelRequest({ status, owner_id: 'toi' }, toi)).toBe(false);
    }
  });
});
