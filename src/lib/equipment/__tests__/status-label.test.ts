import {
  statusLabel,
  conditionLabel,
  STATUS_OPTIONS,
  CONDITION_OPTIONS,
} from '../status-label';

describe('statusLabel', () => {
  it('dịch đủ tám trạng thái của BE', () => {
    expect(STATUS_OPTIONS).toHaveLength(8);
    expect(statusLabel('AVAILABLE')).toEqual({ label: 'Sẵn sàng', tone: 'ok' });
    expect(statusLabel('ON_LOAN')).toEqual({ label: 'Đang mượn', tone: 'busy' });
  });

  it('tách Bảo trì khỏi Hỏng bằng hai tông khác nhau', () => {
    // Gộp một tông từng khiến thủ kho tưởng máy đang bảo trì là máy đã hỏng.
    expect(statusLabel('UNDER_MAINTENANCE').tone).toBe('maint');
    expect(statusLabel('BROKEN').tone).toBe('bad');
  });

  it('POST_RETURN_CHECK có nhãn riêng, không rơi về mã thô', () => {
    // BR-42 bắt buộc trạng thái này; thiếu nó là màn kho hiện ra chuỗi in hoa khó đọc.
    expect(statusLabel('POST_RETURN_CHECK')).toEqual({
      label: 'Kiểm tra sau trả',
      tone: 'wait',
    });
  });

  it('enum lạ vẫn hiện mã thô thay vì ô trống', () => {
    expect(statusLabel('SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', tone: 'wait' });
  });
});

describe('conditionLabel', () => {
  it('dịch đủ năm mức tình trạng của enum MemsAssetCondition', () => {
    // Enum BE là GOOD/USED/NEEDS_CHECK/BROKEN/IN_MAINTENANCE — lệch một tên là màn kho
    // hiện ra chuỗi in hoa thô ngay giữa bảng.
    expect(CONDITION_OPTIONS).toHaveLength(5);
    expect(conditionLabel('GOOD').label).toBe('Tốt');
    expect(conditionLabel('USED').label).toBe('Có dấu hiệu sử dụng');
    expect(conditionLabel('NEEDS_CHECK').label).toBe('Cần kiểm tra');
    expect(conditionLabel('BROKEN').label).toBe('Hỏng');
    expect(conditionLabel('IN_MAINTENANCE').label).toBe('Đang sửa chữa');
  });

  it('BROKEN ở hai trục cho ra hai tông khác nhau', () => {
    // Cùng một chữ nhưng khác trục: một cái là vị trí quy trình, một cái là chất lượng máy.
    expect(statusLabel('BROKEN').tone).toBe('bad');
    expect(conditionLabel('BROKEN').tone).toBe('broken');
  });
});
