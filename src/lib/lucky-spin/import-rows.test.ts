import { isImportError, parseGiftRows, parseMemberRows } from './import-rows';

/**
 * Đọc file Excel là chỗ dễ vỡ nhất của tính năng nhập liệu: file người dùng gửi lên đặt tên cột
 * mỗi lúc một kiểu ("Tên" / "ten" / "Name") và hay có dòng trống ở cuối.
 *
 * Việc gộp team trùng tên và sinh id đã chuyển sang server, nên ở đây chỉ kiểm phần đọc file.
 */

describe('parseMemberRows — đọc danh sách thành viên từ Excel', () => {
  it('lấy đúng tên người và tên team, giữ nguyên thứ tự trong file', () => {
    const result = parseMemberRows([
      { Tên: 'Nguyễn Văn A', Team: 'Team Sales' },
      { Tên: 'Trần Thị B', Team: 'Team Marketing' },
    ]);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows).toEqual([
      { name: 'Nguyễn Văn A', teamName: 'Team Sales' },
      { name: 'Trần Thị B', teamName: 'Team Marketing' },
    ]);
    expect(result.skipped).toBe(0);
  });

  it('lấy đúng cột ảnh hoặc avatar nếu có', () => {
    const resultWithAnh = parseMemberRows([
      { Tên: 'Nguyễn Văn A', Team: 'Team Sales', Ảnh: 'https://example.com/a.jpg' },
    ]);
    if (isImportError(resultWithAnh)) throw new Error(resultWithAnh.error);
    expect(resultWithAnh.rows).toEqual([
      { name: 'Nguyễn Văn A', teamName: 'Team Sales', avatarUrl: 'https://example.com/a.jpg' },
    ]);

    const resultWithAvatar = parseMemberRows([
      { Tên: 'Trần Thị B', Team: 'Team Marketing', Avatar: 'https://example.com/b.png' },
    ]);
    if (isImportError(resultWithAvatar)) throw new Error(resultWithAvatar.error);
    expect(resultWithAvatar.rows).toEqual([
      { name: 'Trần Thị B', teamName: 'Team Marketing', avatarUrl: 'https://example.com/b.png' },
    ]);
  });

  it('cắt khoảng trắng thừa quanh tên người và tên team', () => {
    const result = parseMemberRows([{ Tên: '  Nguyễn Văn A  ', Team: '  Team Sales  ' }]);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.rows[0]).toEqual({ name: 'Nguyễn Văn A', teamName: 'Team Sales' });
  });

  it('bỏ qua dòng thiếu tên hoặc thiếu team và đếm đúng số dòng bỏ', () => {
    const result = parseMemberRows([
      { Tên: 'Nguyễn Văn A', Team: 'Team Sales' },
      { Tên: '', Team: 'Team Sales' },
      { Tên: 'Trần Thị B', Team: '   ' },
      { Tên: '  ', Team: '  ' },
    ]);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(3);
  });

  it.each([
    ['có dấu', 'Tên'],
    ['không dấu', 'ten'],
    ['tiếng Anh', 'name'],
    ['viết hoa', 'TEN'],
  ])('nhận cột tên viết kiểu %s', (_mo_ta, cot) => {
    const result = parseMemberRows([{ [cot]: 'Nguyễn Văn A', Team: 'Team Sales' }]);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.rows[0].name).toBe('Nguyễn Văn A');
  });

  it('báo lỗi rõ ràng khi file không có cột cần thiết', () => {
    expect(parseMemberRows([])).toEqual({ error: 'Không có dữ liệu để nhập.' });
    expect(parseMemberRows([{ Ho_ten: 'A', Team: 'B' }])).toEqual({
      error: 'Không tìm thấy cột "Tên" trong dữ liệu.',
    });
    expect(parseMemberRows([{ Tên: 'A', Nhom: 'B' }])).toEqual({
      error: 'Không tìm thấy cột "Team" trong dữ liệu.',
    });
  });
});

describe('parseGiftRows — đọc danh sách quà từ Excel', () => {
  it('lấy đúng tên quà và số lượng', () => {
    const result = parseGiftRows([
      { 'Tên quà': 'Voucher 500k', 'Số lượng': 10 },
      { 'Tên quà': 'Áo thun', 'Số lượng': 3 },
    ]);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows).toEqual([
      { name: 'Voucher 500k', total: 10 },
      { name: 'Áo thun', total: 3 },
    ]);
  });

  it('đọc được số lượng dạng chuỗi — ô Excel định dạng text hay cho ra kiểu này', () => {
    const result = parseGiftRows([{ 'Tên quà': 'Voucher', 'Số lượng': '7' }]);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.rows[0].total).toBe(7);
  });

  it('bỏ qua dòng số lượng bằng 0, âm hoặc không phải số', () => {
    const result = parseGiftRows([
      { 'Tên quà': 'Quà tốt', 'Số lượng': 5 },
      { 'Tên quà': 'Quà lỗi', 'Số lượng': 0 },
      { 'Tên quà': 'Quà âm', 'Số lượng': -2 },
      { 'Tên quà': 'Quà chữ', 'Số lượng': 'nhiều' },
      { 'Tên quà': '', 'Số lượng': 5 },
    ]);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows).toEqual([{ name: 'Quà tốt', total: 5 }]);
    expect(result.skipped).toBe(4);
  });

  it.each(['Tên quà', 'ten qua', 'name', 'Quà', 'qua'])('nhận cột tên quà viết là "%s"', (cot) => {
    const result = parseGiftRows([{ [cot]: 'Voucher', 'Số lượng': 2 }]);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.rows[0].name).toBe('Voucher');
  });

  it.each(['Số lượng', 'so luong', 'quantity', 'total', 'SL'])('nhận cột số lượng viết là "%s"', (cot) => {
    const result = parseGiftRows([{ 'Tên quà': 'Voucher', [cot]: 4 }]);
    if (isImportError(result)) throw new Error(result.error);
    expect(result.rows[0].total).toBe(4);
  });

  it('báo lỗi khi thiếu cột', () => {
    expect(parseGiftRows([])).toEqual({ error: 'Không có dữ liệu để nhập.' });
    expect(parseGiftRows([{ Mon: 'A', 'Số lượng': 1 }])).toEqual({
      error: 'Không tìm thấy cột "Tên quà" trong dữ liệu.',
    });
    expect(parseGiftRows([{ 'Tên quà': 'A', Kho: 1 }])).toEqual({
      error: 'Không tìm thấy cột "Số lượng" trong dữ liệu.',
    });
  });
});
