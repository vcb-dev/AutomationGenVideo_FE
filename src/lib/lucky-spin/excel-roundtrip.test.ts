import * as path from 'path';
import { giftHistoryToExcelRows, memberHistoryToExcelRows } from './export-rows';
import { isImportError, parseGiftRows, parseMemberRows } from './import-rows';
import { GiftRecord, WinRecord } from '@/types/lucky-spin';

/**
 * Vòng khép kín: xuất ra .xlsx rồi nhập lại chính file đó.
 *
 * Chạy trên đúng bản xlsx được phục vụ ở /public/vendor/lucky-spin — nếu file vendor bị thiếu
 * hay hỏng, test này gãy trước khi người dùng gặp lỗi. Dùng XLSX.write/XLSX.read thay cho
 * XLSX.writeFile vì bước cuối chỉ là tải file về máy, không ảnh hưởng nội dung bảng tính.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require(path.join(process.cwd(), 'public/vendor/lucky-spin/xlsx.full.min.js'));

/** Đúng chuỗi lời gọi mà sheet-io.ts dùng khi đọc file người dùng chọn. */
function readRows(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/** Đúng chuỗi lời gọi mà sheet-io.ts dùng khi xuất file, trừ bước writeFile. */
function writeRows(rows: Record<string, string>[], sheetName: string): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('Excel — thư viện vendor đọc/ghi được', () => {
  it('nạp được xlsx.full.min.js từ public/vendor', () => {
    expect(typeof XLSX.read).toBe('function');
    expect(typeof XLSX.write).toBe('function');
    expect(typeof XLSX.utils.sheet_to_json).toBe('function');
    expect(typeof XLSX.utils.json_to_sheet).toBe('function');
  });
});

describe('Nhập thành viên từ file .xlsx thật', () => {
  it('đọc file có cột Tên/Team rồi dựng đúng team và thành viên', () => {
    const buffer = writeRows(
      [
        { Tên: 'Nguyễn Văn A', Team: 'Team Sales' },
        { Tên: 'Trần Thị Bích', Team: 'Team Sales' },
        { Tên: 'Lê Văn Cường', Team: 'Team Marketing' },
      ],
      'Thanh vien',
    );

    const rows = readRows(buffer);
    expect(rows).toHaveLength(3);

    const result = parseMemberRows(rows);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows.map((r) => r.teamName)).toEqual(['Team Sales', 'Team Sales', 'Team Marketing']);
    expect(result.rows.map((r) => r.name)).toEqual(['Nguyễn Văn A', 'Trần Thị Bích', 'Lê Văn Cường']);
    expect(result.skipped).toBe(0);
  });

  it('giữ nguyên dấu tiếng Việt qua một vòng ghi rồi đọc', () => {
    const ten = 'Đặng Thị Quỳnh Hương';
    const rows = readRows(writeRows([{ Tên: ten, Team: 'Tổ Kỹ thuật' }], 'Thanh vien'));

    const result = parseMemberRows(rows);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows[0].name).toBe(ten);
    expect(result.rows[0].teamName).toBe('Tổ Kỹ thuật');
  });

  it('ô trống trong file không làm hỏng việc nhập, chỉ bị đếm là dòng bỏ qua', () => {
    // defval: '' khiến ô trống thành chuỗi rỗng thay vì mất hẳn khỏi object.
    const rows = readRows(
      writeRows(
        [
          { Tên: 'Nguyễn Văn A', Team: 'Team Sales' },
          { Tên: '', Team: 'Team Sales' },
        ],
        'Thanh vien',
      ),
    );

    const result = parseMemberRows(rows);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });
});

describe('Nhập quà từ file .xlsx thật', () => {
  it('đọc cột Tên quà/Số lượng và đặt tồn kho ban đầu', () => {
    const rows = readRows(
      writeRows(
        [
          { 'Tên quà': 'Voucher 500k', 'Số lượng': '10' },
          { 'Tên quà': 'Áo thun đồng phục', 'Số lượng': '25' },
        ],
        'Qua tang',
      ),
    );

    const result = parseGiftRows(rows);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows).toEqual([
      { name: 'Voucher 500k', total: 10 },
      { name: 'Áo thun đồng phục', total: 25 },
    ]);
  });
});

describe('Xuất lịch sử ra Excel', () => {
  const history: WinRecord[] = [
    { id: '1', memberId: 'm1', name: 'Nguyễn Văn A', team: 'Team Sales', time: '2026-08-03T02:30:00.000Z' },
    { id: '2', memberId: 'm2', name: 'Trần Thị Bích', team: 'Tổ Kỹ thuật', time: '2026-08-03T03:15:00.000Z' },
  ];

  const giftHistory: GiftRecord[] = [
    {
      id: 'g1',
      memberId: 'm1',
      name: 'Nguyễn Văn A',
      team: 'Team Sales',
      gift: 'Voucher 500k',
      time: '2026-08-03T02:30:00.000Z',
    },
  ];

  it('file lịch sử thành viên có đủ 3 cột và đọc lại được nguyên vẹn', () => {
    const rows = readRows(writeRows(memberHistoryToExcelRows(history), 'Thanh vien trung'));

    expect(Object.keys(rows[0])).toEqual(['Tên', 'Team', 'Thời gian']);
    expect(rows).toHaveLength(2);
    expect(rows[0]['Tên']).toBe('Nguyễn Văn A');
    expect(rows[1]['Team']).toBe('Tổ Kỹ thuật');
    expect(String(rows[0]['Thời gian'])).not.toHaveLength(0);
  });

  it('file lịch sử quà có đủ 4 cột kể cả tên quà', () => {
    const rows = readRows(writeRows(giftHistoryToExcelRows(giftHistory), 'Qua tang da trao'));

    expect(Object.keys(rows[0])).toEqual(['Người nhận', 'Team', 'Quà', 'Thời gian']);
    expect(rows[0]['Quà']).toBe('Voucher 500k');
    expect(rows[0]['Người nhận']).toBe('Nguyễn Văn A');
  });

  it('tên sheet được giữ đúng để người nhận file biết đang xem bảng nào', () => {
    const wb = XLSX.read(new Uint8Array(writeRows(memberHistoryToExcelRows(history), 'Thanh vien trung')), {
      type: 'array',
    });
    expect(wb.SheetNames).toContain('Thanh vien trung');
  });

  it('xuất rồi nhập lại: dữ liệu người trúng quay về đúng như cũ', () => {
    const rows = readRows(writeRows(memberHistoryToExcelRows(history), 'Thanh vien trung'));

    // File xuất ra có cột Tên và Team nên chính nó nhập ngược lại được làm danh sách thành viên.
    const result = parseMemberRows(rows);
    if (isImportError(result)) throw new Error(result.error);

    expect(result.rows.map((r) => r.name)).toEqual(['Nguyễn Văn A', 'Trần Thị Bích']);
    expect(result.rows.map((r) => r.teamName)).toEqual(['Team Sales', 'Tổ Kỹ thuật']);
  });
});
