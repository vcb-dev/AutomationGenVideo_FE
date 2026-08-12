import { availabilityLabel } from '../availability-label';

describe('availabilityLabel', () => {
  it('đủ dư thì báo còn trống', () => {
    expect(availabilityLabel(5, 2)).toEqual({ tone: 'ok', text: 'Còn 5 máy trống' });
  });

  it('vừa đủ thì cảnh báo sát nút', () => {
    // Người mượn cần biết mình đang lấy chiếc cuối để cân nhắc dời lịch.
    expect(availabilityLabel(2, 2)).toEqual({ tone: 'tight', text: 'Chỉ còn đúng 2 máy' });
  });

  it('hết máy thì nói rõ thiếu bao nhiêu, không chỉ báo lỗi', () => {
    // QĐ-08: không đẩy người dùng vào ngõ cụt.
    expect(availabilityLabel(1, 3)).toEqual({
      tone: 'none',
      text: 'Thiếu 2 máy trong khung giờ này',
    });
  });

  it('không còn máy nào', () => {
    expect(availabilityLabel(0, 1)).toEqual({
      tone: 'none',
      text: 'Thiếu 1 máy trong khung giờ này',
    });
  });
});
