import { buildBorrowLogQuery } from '../borrow-log-query';

/**
 * Chức năng: dựng tham số truy vấn cho trang Nhật ký mượn từ trạng thái bộ lọc trên màn hình.
 *
 * Vì sao đáng một file test riêng: bộ lọc để trống là chuyện thường xuyên nhất (mở trang lần
 * đầu, bấm xoá lọc). Nếu gửi kèm `status=`, `from=` rỗng thì BE nhận chuỗi rỗng và lọc theo nó
 * — kết quả ra 0 dòng, người dùng tưởng kho không có lượt mượn nào. Đó là kiểu hỏng im lặng:
 * không lỗi, không cảnh báo, chỉ là bảng trống.
 *
 * Đổi bộ lọc cũng phải nhảy về trang 1: đang ở trang 5 của "tất cả" mà lọc còn 3 dòng thì trang
 * 5 rỗng trơn.
 */
describe('buildBorrowLogQuery', () => {
  it('bộ lọc rỗng thì không gửi tham số thừa', () => {
    const q = buildBorrowLogQuery({ status: '', from: '', to: '', page: 1 });

    expect(q).not.toHaveProperty('status');
    expect(q).not.toHaveProperty('from');
    expect(q).not.toHaveProperty('to');
  });

  it('chỉ gửi tham số nào thật sự có giá trị', () => {
    const q = buildBorrowLogQuery({ status: 'OVERDUE', from: '', to: '2026-08-31', page: 1 });

    expect(q.status).toBe('OVERDUE');
    expect(q.to).toBe('2026-08-31');
    expect(q).not.toHaveProperty('from');
  });

  it('luôn kèm trang và cỡ trang', () => {
    const q = buildBorrowLogQuery({ status: '', from: '', to: '', page: 3 });

    expect(q.page).toBe(3);
    expect(q.pageSize).toBeGreaterThan(0);
  });

  it('không xin quá trần 100 mà BE cho phép', () => {
    const q = buildBorrowLogQuery({ status: '', from: '', to: '', page: 1, pageSize: 5000 });

    expect(q.pageSize).toBeLessThanOrEqual(100);
  });

  it('trang nhỏ hơn 1 được kéo về 1', () => {
    const q = buildBorrowLogQuery({ status: '', from: '', to: '', page: 0 });

    expect(q.page).toBe(1);
  });

  it('khoảng ngày ngược thì đảo lại cho đúng thứ tự', () => {
    // Người dùng hay chọn nhầm thứ tự. Gửi nguyên thì BE trả rỗng mà không nói vì sao.
    const q = buildBorrowLogQuery({ status: '', from: '2026-08-31', to: '2026-08-01', page: 1 });

    expect(q.from).toBe('2026-08-01');
    expect(q.to).toBe('2026-08-31');
  });
});
