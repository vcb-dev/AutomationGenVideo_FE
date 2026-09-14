import {
  statusLabel,
  conditionLabel,
  conditionOptionsFor,
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
  it('dịch đủ ba mức tình trạng tinh gọn (Tốt, Bảo trì, Hỏng)', () => {
    expect(CONDITION_OPTIONS).toHaveLength(3);
    expect(conditionLabel('GOOD').label).toBe('Tốt');
    expect(conditionLabel('NEEDS_CHECK').label).toBe('Bảo trì');
    expect(conditionLabel('BROKEN').label).toBe('Hỏng');
  });

  it('BROKEN ở hai trục cho ra hai tông khác nhau', () => {
    expect(statusLabel('BROKEN').tone).toBe('bad');
    expect(conditionLabel('BROKEN').tone).toBe('broken');
  });
});

/**
 * Ô Tình trạng ở form sửa thiết bị.
 *
 * Ba mức chọn được không phủ hết enum của BE: màn Bàn giao luôn ghi `USED`, màn Kiểm tra ghi
 * được `IN_MAINTENANCE`. Đưa thẳng ba mức vào ô select thì máy vừa bàn giao xong mở form ra
 * không có option nào khớp — trình duyệt hiện ô trống hoặc nhảy về mục đầu, và người dùng đọc
 * sai tình trạng thật của chiếc máy đang cầm.
 */
describe('conditionOptionsFor', () => {
  it('giá trị đang có đứng đầu, không lặp lại ở dưới', () => {
    expect(conditionOptionsFor('NEEDS_CHECK').map((o) => o.value)).toEqual([
      'NEEDS_CHECK',
      'GOOD',
      'BROKEN',
    ]);
  });

  it('máy vừa bàn giao (USED) vẫn hiện đúng tình trạng của nó', () => {
    const options = conditionOptionsFor('USED');

    expect(options[0]).toEqual({ value: 'USED', label: 'Tốt' });
    expect(options.map((o) => o.value)).toContain('GOOD');
  });

  it('máy đang sửa (IN_MAINTENANCE) cũng vậy', () => {
    expect(conditionOptionsFor('IN_MAINTENANCE')[0]).toEqual({
      value: 'IN_MAINTENANCE',
      label: 'Bảo trì',
    });
  });

  it('vẫn chọn được cả ba mức chuẩn dù đang ở giá trị ngoài danh sách', () => {
    const values = conditionOptionsFor('USED').map((o) => o.value);

    expect(values).toEqual(expect.arrayContaining(['GOOD', 'NEEDS_CHECK', 'BROKEN']));
  });

  it('chưa có tình trạng thì chỉ hiện ba mức chuẩn, không chèn ô rỗng', () => {
    expect(conditionOptionsFor('').map((o) => o.value)).toEqual([
      'GOOD',
      'NEEDS_CHECK',
      'BROKEN',
    ]);
  });

  it('mọi lựa chọn đều có nhãn tiếng Việt, không lòi enum thô', () => {
    for (const option of conditionOptionsFor('USED')) {
      expect(option.label).not.toMatch(/^[A-Z_]+$/);
    }
  });
});
