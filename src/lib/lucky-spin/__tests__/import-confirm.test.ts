import { giftImportConfirm, memberImportConfirm } from '../import-confirm';

/**
 * Nhập Excel nay THAY danh sách chứ không cộng dồn (xem bulkCreateMembers bên BE), nên chọn
 * nhầm file giữa buổi sự kiện là mất sạch danh sách đang chạy. Phải hỏi lại trước khi xoá.
 *
 * Nội dung hộp thoại phải nói rõ MẤT GÌ và ĐƯỢC GÌ — "Bạn có chắc không?" thì ai cũng bấm
 * đồng ý mà không đọc. Con số cụ thể mới làm người ta khựng lại đúng lúc cần khựng.
 *
 * Tách logic dựng câu chữ ra khỏi component để test thẳng, không phải render cả cây React —
 * đúng quy ước FE của repo.
 */
describe('memberImportConfirm', () => {
  it('lần nhập đầu, chưa có ai thì không hỏi — không có gì để mất', () => {
    expect(memberImportConfirm({ members: 0, teams: 0 }, 95)).toBeNull();
  });

  it('đang có danh sách thì phải hỏi', () => {
    expect(memberImportConfirm({ members: 120, teams: 8 }, 95)).not.toBeNull();
  });

  it('nói rõ số sẽ mất và số sẽ thay vào', () => {
    const o = memberImportConfirm({ members: 120, teams: 8 }, 95)!;

    expect(o.description).toContain('120');
    expect(o.description).toContain('8');
    expect(o.description).toContain('95');
  });

  it('đánh dấu nguy hiểm để nút xác nhận hiện màu cảnh báo', () => {
    expect(memberImportConfirm({ members: 1, teams: 1 }, 1)!.danger).toBe(true);
  });

  it('nhắc rằng lịch sử trúng thưởng vẫn còn — nếu không người dùng sẽ không dám bấm', () => {
    const o = memberImportConfirm({ members: 10, teams: 2 }, 5)!;

    expect(o.description.toLowerCase()).toContain('lịch sử');
  });

  it('có thành viên nhưng chưa có team thì không nhắc tới team', () => {
    const o = memberImportConfirm({ members: 4, teams: 0 }, 3)!;

    expect(o.description).not.toContain('team');
  });
});

describe('giftImportConfirm', () => {
  it('chưa có quà nào thì không hỏi', () => {
    expect(giftImportConfirm(0, 12)).toBeNull();
  });

  it('nói rõ số quà sẽ mất và số sẽ thay vào', () => {
    const o = giftImportConfirm(7, 12)!;

    expect(o.description).toContain('7');
    expect(o.description).toContain('12');
    expect(o.danger).toBe(true);
  });

  it('nhắc lịch sử trao quà vẫn giữ', () => {
    expect(giftImportConfirm(3, 1)!.description.toLowerCase()).toContain('lịch sử');
  });
});
