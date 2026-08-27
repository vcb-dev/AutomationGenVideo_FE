import { needsTwoApprovals, scopeToPurpose } from '@/lib/equipment/borrow-scope';

describe('scopeToPurpose', () => {
  it('mượn cá nhân gửi lên mục đích PERSONAL', () => {
    expect(scopeToPurpose('PERSONAL')).toBe('PERSONAL');
  });

  it('dùng tại công ty và mang ra ngoài đều là việc công ty', () => {
    // Mang máy ra ngoài để đi quay vẫn là việc công ty — chỗ này mà gửi nhầm PERSONAL thì
    // mọi phiếu đi quay đều bị đòi thêm chữ ký admin.
    expect(scopeToPurpose('INTERNAL')).toBe('WORK');
    expect(scopeToPurpose('OUTSIDE')).toBe('WORK');
  });
});

describe('needsTwoApprovals', () => {
  it('chỉ phiếu cá nhân mới cần hai chữ ký', () => {
    expect(needsTwoApprovals('PERSONAL')).toBe(true);
    expect(needsTwoApprovals('WORK')).toBe(false);
  });

  it('phiếu cũ không có mục đích thì vẫn là một chữ ký', () => {
    // Phiếu tạo trước khi có cột purpose đọc ra undefined.
    expect(needsTwoApprovals(undefined)).toBe(false);
  });
});
