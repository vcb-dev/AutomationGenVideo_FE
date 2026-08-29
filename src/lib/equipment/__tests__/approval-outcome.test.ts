import { approvalOutcome } from '../approval-outcome';

/**
 * Ký xong thì màn hình phải nói gì và dẫn đi đâu.
 *
 * Ba kết cục khác hẳn nhau và rất dễ lẫn: ký xong ĐỦ cấp thì phiếu sang bước chuẩn bị máy;
 * ký xong cấp một của phiếu hai cấp thì KHÔNG có việc gì cho người vừa ký nữa, phải chờ admin;
 * từ chối thì phiếu đóng luôn. Không phân biệt được thì người ký đứng nhìn màn hình không đổi
 * và tưởng nút duyệt hỏng.
 */

const APPROVED = {
  id: 'req-1',
  request_code: 'REQ-20260901-001',
  status: 'APPROVED',
  approved_levels: 1,
  required_levels: 1,
  next_approver_role: null,
};

describe('approvalOutcome', () => {
  it('đủ chữ ký thì dẫn thẳng sang bước chuẩn bị, kèm đúng phiếu vừa ký', () => {
    // Màn chuẩn bị tự lấy phiếu đầu danh sách, nên phải gắn id vào đường dẫn — không thì
    // người ký sang tới nơi lại đang soạn một phiếu khác.
    expect(approvalOutcome(APPROVED)).toMatchObject({
      kind: 'ready-to-prepare',
      nextHref: '/dashboard/equipment/prepare?request=req-1',
    });
  });

  it('nhắc đúng mã phiếu để người ký biết mình vừa ký cái nào', () => {
    expect(approvalOutcome(APPROVED).message).toContain('REQ-20260901-001');
  });

  it('ký cấp một của phiếu hai cấp thì báo còn chờ admin, KHÔNG dẫn đi đâu', () => {
    const out = approvalOutcome({
      ...APPROVED,
      status: 'PENDING_APPROVAL',
      approved_levels: 1,
      required_levels: 2,
      next_approver_role: 'ADMIN',
    });
    expect(out.kind).toBe('waiting-next-level');
    expect(out.message).toMatch(/ADMIN|admin/);
    expect(out).not.toHaveProperty('nextHref');
  });

  it('nêu rõ đã ký mấy trên mấy cấp', () => {
    const out = approvalOutcome({
      ...APPROVED,
      status: 'PENDING_APPROVAL',
      approved_levels: 1,
      required_levels: 2,
      next_approver_role: 'ADMIN',
    });
    expect(out.message).toContain('1/2');
  });

  it('từ chối thì báo đã đóng phiếu, không dẫn sang chuẩn bị', () => {
    const out = approvalOutcome({ ...APPROVED, status: 'REJECTED' });
    expect(out.kind).toBe('rejected');
    expect(out).not.toHaveProperty('nextHref');
  });

  it('phiếu đã đi quá bước duyệt thì vẫn dẫn sang chuẩn bị được', () => {
    // Hai người cùng mở màn duyệt, người kia ký trước và đã gán máy — phiếu thành PREPARING.
    // Vẫn để người này đi tiếp, đừng bắt họ tự tìm đường.
    expect(approvalOutcome({ ...APPROVED, status: 'PREPARING' }).kind).toBe('ready-to-prepare');
  });

  it('trạng thái lạ thì không đoán bừa', () => {
    expect(approvalOutcome({ ...APPROVED, status: 'ON_LOAN' }).kind).toBe('unknown');
  });
});
