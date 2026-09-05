import {
  INSPECT_RESULT_OPTIONS,
  pendingReason,
  requiresNote,
  suggestedCondition,
} from '../inspection';

/**
 * Chức năng: phần thuần của màn Kiểm tra — mắt xích duy nhất đưa máy trở lại Sẵn sàng.
 *
 * Vì sao đáng một file test riêng: một trong ba kết luận có TÁC DỤNG PHỤ (sinh lệnh bảo trì bỏ
 * ngỏ, giữ máy bận vô hạn về sau). Người kiểm tra phải đọc được điều đó trước khi bấm, và tình
 * trạng vật lý gợi ý phải nhất quán với kết luận — máy "Sẵn sàng" mà tình trạng "Hỏng" thì hai
 * cột trên cùng một dòng nói ngược nhau.
 */

describe('pendingReason', () => {
  it('phân biệt máy mới nhập với máy trả về', () => {
    // Hai lối vào bàn kiểm tra khác nhau về trách nhiệm: máy trả về có người vừa cầm đi.
    expect(pendingReason('PENDING_INSPECTION').tone).toBe('intake');
    expect(pendingReason('POST_RETURN_CHECK').tone).toBe('postReturn');
  });

  it('trạng thái lạ vẫn có nhãn, không để trống', () => {
    expect(pendingReason('TRANG_THAI_LA').label).toBeTruthy();
  });
});

describe('INSPECT_RESULT_OPTIONS', () => {
  it('đúng ba kết luận mà BE nhận', () => {
    expect(INSPECT_RESULT_OPTIONS.map((o) => o.value)).toEqual([
      'AVAILABLE',
      'UNDER_MAINTENANCE',
      'BROKEN',
    ]);
  });

  it('mỗi kết luận đều nói rõ hệ quả', () => {
    for (const option of INSPECT_RESULT_OPTIONS) {
      expect(option.consequence.length).toBeGreaterThan(20);
    }
  });

  it('kết luận Bảo trì nói rõ nó sinh lệnh bảo trì', () => {
    // Tác dụng phụ duy nhất trong ba lựa chọn; giấu đi là thủ kho bấm mà không biết máy sẽ bận
    // vô hạn cho tới khi có người đóng lệnh.
    const maintenance = INSPECT_RESULT_OPTIONS.find((o) => o.value === 'UNDER_MAINTENANCE');
    expect(maintenance?.consequence).toMatch(/lệnh bảo trì/);
  });
});

describe('suggestedCondition', () => {
  it('cho về kệ mà đang mang tình trạng xấu thì nâng lên Đã dùng', () => {
    // Nếu không, máy "Sẵn sàng" vẫn mang tình trạng "Hỏng" và mọi bộ lọc theo tình trạng đều sai.
    expect(suggestedCondition('AVAILABLE', 'BROKEN')).toBe('USED');
    expect(suggestedCondition('AVAILABLE', 'NEEDS_CHECK')).toBe('USED');
    expect(suggestedCondition('AVAILABLE', 'IN_MAINTENANCE')).toBe('USED');
  });

  it('cho về kệ mà tình trạng đã ổn thì giữ nguyên', () => {
    // Không tự hạ một chiếc đang Tốt xuống Đã dùng chỉ vì nó đi qua bàn kiểm tra.
    expect(suggestedCondition('AVAILABLE', 'GOOD')).toBe('GOOD');
    expect(suggestedCondition('AVAILABLE', 'USED')).toBe('USED');
  });

  it('bảo trì và hỏng thì tình trạng bám theo kết luận', () => {
    expect(suggestedCondition('UNDER_MAINTENANCE', 'GOOD')).toBe('IN_MAINTENANCE');
    expect(suggestedCondition('BROKEN', 'GOOD')).toBe('BROKEN');
  });
});

describe('requiresNote', () => {
  it('chỉ kết luận Bảo trì bắt buộc nêu lý do', () => {
    // Ghi chú đó thành nội dung của lệnh bảo trì; bỏ trống là sinh ra một lệnh không ai biết vì sao.
    expect(requiresNote('UNDER_MAINTENANCE')).toBe(true);
    expect(requiresNote('AVAILABLE')).toBe(false);
    expect(requiresNote('BROKEN')).toBe(false);
  });
});
