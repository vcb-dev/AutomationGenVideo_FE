/**
 * Nhãn ngày trên trang Tổng quan kênh nội bộ phải đọc theo giờ Việt Nam.
 *
 * BE gom mọi con số theo ngày giờ VN (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`), còn FE trước đây
 * lại dựng nhãn bằng `new Date(iso).getDate()` — tức đọc theo đồng hồ MÁY. `new Date('2026-08-25')`
 * là nửa đêm UTC, nên máy đặt ở múi giờ âm sẽ hiện "24 Th8" cho đúng cột số liệu ngày 25/8.
 *
 * Test chạy với TZ America/New_York (UTC-4) để nếu ai đó lỡ bỏ `timeZone` đi thì hỏng ngay.
 */
process.env.TZ = 'America/New_York';

type SharedModule = typeof import('../shared');
let shortDate: SharedModule['shortDate'];
let fullDate: SharedModule['fullDate'];
let syncDescription: SharedModule['syncDescription'];

beforeAll(() => {
  ({ shortDate, fullDate, syncDescription } = require('../shared') as SharedModule);
});

describe('shortDate — nhãn trục ngang của biểu đồ', () => {
  it('giữ nguyên ngày mà BE gửi sang, không lùi một ngày theo máy', () => {
    expect(shortDate('2026-08-25')).toBe('25 Th8');
    expect(shortDate('2026-01-01')).toBe('1 Th1');
  });

  it('mốc thời gian sát nửa đêm quy về đúng ngày Việt Nam', () => {
    // 18:00 UTC = 01:00 sáng hôm sau ở VN, và vẫn là 14:00 cùng ngày ở New York.
    expect(shortDate('2026-08-24T18:00:00.000Z')).toBe('25 Th8');
    // 16:00 UTC = 23:00 cùng ngày ở VN.
    expect(shortDate('2026-08-24T16:00:00.000Z')).toBe('24 Th8');
  });

  it('chuỗi rỗng hoặc hỏng thì trả rỗng, không ra "NaN ThNaN"', () => {
    expect(shortDate('')).toBe('');
    expect(shortDate('khong-phai-ngay')).toBe('');
  });
});

describe('fullDate — ngày đầy đủ trong gợi ý của biểu đồ', () => {
  it('dạng dd/mm/yyyy theo giờ Việt Nam', () => {
    expect(fullDate('2026-08-25')).toBe('25/08/2026');
    expect(fullDate('2026-08-24T18:00:00.000Z')).toBe('25/08/2026');
  });

  it('ngày hỏng thì trả rỗng', () => {
    expect(fullDate('')).toBe('');
  });
});

describe('syncDescription — dòng phụ dưới tên kênh', () => {
  const NOW = new Date('2026-08-25T03:00:00.000Z'); // 10:00 sáng 25/8 giờ VN

  beforeAll(() => jest.useFakeTimers({ now: NOW }));
  afterAll(() => jest.useRealTimers());

  it('chưa đồng bộ lần nào', () => {
    expect(syncDescription(null)).toBe('Chưa đồng bộ');
  });

  it('đồng bộ sáng nay', () => {
    expect(syncDescription('2026-08-25T01:00:00.000Z')).toContain('hôm nay');
  });

  it('đồng bộ 23h đêm qua giờ VN là "hôm qua", không phải "hôm nay"', () => {
    // 16:00 UTC ngày 24/8 = 23:00 ngày 24/8 giờ VN — cách hiện tại 11 tiếng, cách cũ chia
    // cho 86.400.000 rồi làm tròn xuống ra 0 ngày và nói nhầm thành "hôm nay".
    expect(syncDescription('2026-08-24T16:00:00.000Z')).toContain('hôm qua');
  });

  it('lâu hơn thì đếm số ngày theo lịch', () => {
    expect(syncDescription('2026-08-20T03:00:00.000Z')).toBe('Đồng bộ 5 ngày trước');
  });
});
