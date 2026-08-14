import { Asset } from '../api';
import { stockSummary, stockByCategory } from '../stock-summary';

const asset = (id: string, status: string, categoryId = 'c1', categoryName = 'Camera'): Asset => ({
  id,
  asset_code: id,
  serial_number: `SN-${id}`,
  status,
  condition: 'GOOD',
  model: { id: 'm1', name: 'Sony A7 IV', category: { id: categoryId, name: categoryName } },
  location: null,
});

describe('stockSummary', () => {
  it('đếm đúng từng nhóm trạng thái', () => {
    const s = stockSummary([
      asset('a1', 'AVAILABLE'),
      asset('a2', 'AVAILABLE'),
      asset('a3', 'ON_LOAN'),
      asset('a4', 'UNDER_MAINTENANCE'),
      asset('a5', 'PENDING_INSPECTION'),
    ]);
    expect(s).toEqual({ total: 5, available: 2, onLoan: 1, maintenance: 1, pendingCheck: 1 });
  });

  it('máy thanh lý và máy mất không tính vào tổng', () => {
    const s = stockSummary([
      asset('a1', 'AVAILABLE'),
      asset('a2', 'DISPOSED'),
      asset('a3', 'LOST'),
    ]);
    expect(s.total).toBe(1);
  });

  it('gộp Hỏng vào chỉ số bảo trì', () => {
    // Cả hai đều là máy nằm ở xưởng sửa, thủ kho nhìn cùng một con số.
    expect(stockSummary([asset('a1', 'BROKEN'), asset('a2', 'UNDER_MAINTENANCE')]).maintenance)
      .toBe(2);
  });

  it('gộp Chờ kiểm tra và Kiểm tra sau trả vào một chỉ số', () => {
    // BR-42: máy vừa trả về chưa cho mượn lại được, cùng nghĩa với máy chờ kiểm tra lúc nhập kho.
    expect(
      stockSummary([asset('a1', 'PENDING_INSPECTION'), asset('a2', 'POST_RETURN_CHECK')])
        .pendingCheck,
    ).toBe(2);
  });

  it('kho rỗng cho ra toàn số không', () => {
    expect(stockSummary([])).toEqual({
      total: 0, available: 0, onLoan: 0, maintenance: 0, pendingCheck: 0,
    });
  });
});

describe('stockByCategory', () => {
  it('tính sẵn sàng trên tổng theo từng danh mục', () => {
    const rows = stockByCategory([
      asset('a1', 'AVAILABLE', 'c1', 'Camera'),
      asset('a2', 'ON_LOAN', 'c1', 'Camera'),
      asset('a3', 'AVAILABLE', 'c2', 'Lens'),
    ]);
    expect(rows.find((r) => r.categoryId === 'c1')).toEqual({
      categoryId: 'c1', categoryName: 'Camera', available: 1, total: 2,
    });
  });

  it('danh mục căng nhất xếp lên đầu', () => {
    // Thủ kho cần thấy ngay chỗ sắp hết máy, không phải đọc theo bảng chữ cái.
    const rows = stockByCategory([
      asset('a1', 'AVAILABLE', 'c1', 'Camera'),
      asset('a2', 'AVAILABLE', 'c1', 'Camera'),
      asset('a3', 'ON_LOAN', 'c2', 'Lens'),
      asset('a4', 'AVAILABLE', 'c2', 'Lens'),
    ]);
    expect(rows.map((r) => r.categoryName)).toEqual(['Lens', 'Camera']);
  });

  it('máy thanh lý không làm phình mẫu số', () => {
    const rows = stockByCategory([
      asset('a1', 'AVAILABLE', 'c1', 'Camera'),
      asset('a2', 'DISPOSED', 'c1', 'Camera'),
    ]);
    expect(rows[0]).toMatchObject({ available: 1, total: 1 });
  });
});
