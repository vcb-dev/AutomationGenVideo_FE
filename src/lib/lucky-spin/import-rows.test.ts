import { importGiftsFromRows, importMembersFromRows, isImportError } from './import-rows';
import { Team } from '@/types/lucky-spin';

/**
 * Nhập hàng loạt là chỗ dễ vỡ nhất của vòng quay: file người dùng gửi lên đặt tên cột mỗi lúc
 * một kiểu ("Tên" / "ten" / "Name"), có dòng trống ở cuối, và nhiều dòng cùng một team.
 * Các test dưới đây đi từ những ca thật đó.
 */

const noTeams: Team[] = [];

describe('importMembersFromRows — nhập thành viên từ Excel', () => {
  it('tạo team mới cho tên team chưa tồn tại, nhiều dòng cùng team chỉ sinh MỘT team', () => {
    const rows = [
      { Tên: 'Nguyễn Văn A', Team: 'Team Sales' },
      { Tên: 'Trần Thị B', Team: 'Team Sales' },
      { Tên: 'Lê Văn C', Team: 'Team Marketing' },
    ];

    const result = importMembersFromRows(rows, noTeams);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.teams).toHaveLength(2);
    expect(result.teams.map((t) => t.name)).toEqual(['Team Sales', 'Team Marketing']);
    expect(result.members).toHaveLength(3);
    expect(result.skipped).toBe(0);

    // Hai người cùng "Team Sales" phải trỏ về đúng một teamId.
    expect(result.members[0].teamId).toBe(result.members[1].teamId);
    expect(result.members[2].teamId).not.toBe(result.members[0].teamId);
  });

  it('dùng lại team đã có sẵn, không phân biệt hoa thường', () => {
    const existing: Team[] = [{ id: 'team-cu', name: 'Team Sales', status: 'active' }];
    const rows = [{ Tên: 'Nguyễn Văn A', Team: 'TEAM sales' }];

    const result = importMembersFromRows(rows, existing);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.teams).toHaveLength(0);
    expect(result.members[0].teamId).toBe('team-cu');
  });

  it('bỏ qua dòng thiếu tên hoặc thiếu team và đếm đúng số dòng bỏ', () => {
    const rows = [
      { Tên: 'Nguyễn Văn A', Team: 'Team Sales' },
      { Tên: '', Team: 'Team Sales' },
      { Tên: 'Trần Thị B', Team: '   ' },
      { Tên: '  ', Team: '  ' },
    ];

    const result = importMembersFromRows(rows, noTeams);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.members).toHaveLength(1);
    expect(result.skipped).toBe(3);
  });

  it('cắt khoảng trắng thừa quanh tên người và tên team', () => {
    const rows = [{ Tên: '  Nguyễn Văn A  ', Team: '  Team Sales  ' }];

    const result = importMembersFromRows(rows, noTeams);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.members[0].name).toBe('Nguyễn Văn A');
    expect(result.teams[0].name).toBe('Team Sales');
  });

  it.each([
    ['có dấu', 'Tên'],
    ['không dấu', 'ten'],
    ['tiếng Anh', 'name'],
    ['viết hoa', 'TEN'],
  ])('nhận cột tên viết kiểu %s', (_mo_ta, cot) => {
    const result = importMembersFromRows([{ [cot]: 'Nguyễn Văn A', Team: 'Team Sales' }], noTeams);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.members[0].name).toBe('Nguyễn Văn A');
  });

  it('thành viên nhập vào luôn ở trạng thái sẵn sàng quay và chưa nhận quà', () => {
    const result = importMembersFromRows([{ Tên: 'Nguyễn Văn A', Team: 'Team Sales' }], noTeams);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.members[0].status).toBe('active');
    expect(result.members[0].giftReceived).toBe(false);
    expect(result.teams[0].status).toBe('active');
  });

  it('báo lỗi rõ ràng khi file không có cột cần thiết', () => {
    expect(importMembersFromRows([], noTeams)).toEqual({ error: 'Không có dữ liệu để nhập.' });
    expect(importMembersFromRows([{ Ho_ten: 'A', Team: 'B' }], noTeams)).toEqual({
      error: 'Không tìm thấy cột "Tên" trong dữ liệu.',
    });
    expect(importMembersFromRows([{ Tên: 'A', Nhom: 'B' }], noTeams)).toEqual({
      error: 'Không tìm thấy cột "Team" trong dữ liệu.',
    });
  });
});

describe('importGiftsFromRows — nhập quà tặng', () => {
  it('đặt số lượng còn lại bằng tổng số lượng lúc mới nhập', () => {
    const rows = [
      { 'Tên quà': 'Voucher 500k', 'Số lượng': 10 },
      { 'Tên quà': 'Áo thun', 'Số lượng': 3 },
    ];

    const result = importGiftsFromRows(rows);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.gifts).toHaveLength(2);
    expect(result.gifts[0]).toMatchObject({ name: 'Voucher 500k', total: 10, remaining: 10 });
    expect(result.gifts[1]).toMatchObject({ name: 'Áo thun', total: 3, remaining: 3 });
  });

  it('đọc được số lượng dạng chuỗi — ô Excel định dạng text hay cho ra kiểu này', () => {
    const result = importGiftsFromRows([{ 'Tên quà': 'Voucher', 'Số lượng': '7' }]);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.gifts[0].total).toBe(7);
  });

  it('bỏ qua dòng số lượng bằng 0, âm hoặc không phải số', () => {
    const rows = [
      { 'Tên quà': 'Quà tốt', 'Số lượng': 5 },
      { 'Tên quà': 'Quà lỗi', 'Số lượng': 0 },
      { 'Tên quà': 'Quà âm', 'Số lượng': -2 },
      { 'Tên quà': 'Quà chữ', 'Số lượng': 'nhiều' },
      { 'Tên quà': '', 'Số lượng': 5 },
    ];

    const result = importGiftsFromRows(rows);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.gifts).toHaveLength(1);
    expect(result.gifts[0].name).toBe('Quà tốt');
    expect(result.skipped).toBe(4);
  });

  it.each(['Tên quà', 'ten qua', 'name', 'Quà', 'qua'])('nhận cột tên quà viết là "%s"', (cot) => {
    const result = importGiftsFromRows([{ [cot]: 'Voucher', 'Số lượng': 2 }]);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.gifts[0].name).toBe('Voucher');
  });

  it.each(['Số lượng', 'so luong', 'quantity', 'total', 'SL'])('nhận cột số lượng viết là "%s"', (cot) => {
    const result = importGiftsFromRows([{ 'Tên quà': 'Voucher', [cot]: 4 }]);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.gifts[0].total).toBe(4);
  });

  it('báo lỗi khi thiếu cột', () => {
    expect(importGiftsFromRows([])).toEqual({ error: 'Không có dữ liệu để nhập.' });
    expect(importGiftsFromRows([{ Mon: 'A', 'Số lượng': 1 }])).toEqual({
      error: 'Không tìm thấy cột "Tên quà" trong dữ liệu.',
    });
    expect(importGiftsFromRows([{ 'Tên quà': 'A', Kho: 1 }])).toEqual({
      error: 'Không tìm thấy cột "Số lượng" trong dữ liệu.',
    });
  });
});
