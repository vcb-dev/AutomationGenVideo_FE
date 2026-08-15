import { borrowHistoryLabel } from '../borrow-history-label';

/**
 * Chức năng: dịch một lượt mượn thành dòng chữ thủ kho đọc được.
 *
 * Vì sao đáng một file test riêng: đây là chỗ người quản lý kho nhìn để quyết định có đi đòi
 * máy hay không. Hai ca dễ lẫn nhau mà hậu quả ngược hẳn:
 *   - "đã trả nhưng hôm đó trả trễ"  → chuyện đã qua, chỉ để đánh giá ý thức
 *   - "đang giữ và đã quá hạn"       → máy còn ở ngoài, phải đi đòi NGAY
 * Hiện giống nhau thì thủ kho hoặc bỏ sót máy đang mất, hoặc đi đòi máy đã nằm trong kho.
 */
describe('borrowHistoryLabel', () => {
  it('đang giữ trong hạn: nói rõ đang giữ và giữ mấy ngày', () => {
    const label = borrowHistoryLabel({ status: 'HOLDING', heldDays: 3, lateDays: 0 });

    expect(label.text).toContain('Đang giữ');
    expect(label.text).toContain('3');
    expect(label.tone).toBe('busy');
  });

  it('đang giữ mà quá hạn: phải là tông cảnh báo, không phải tông bình thường', () => {
    const label = borrowHistoryLabel({ status: 'OVERDUE', heldDays: 8, lateDays: 3 });

    expect(label.text).toContain('Quá hạn');
    expect(label.text).toContain('3');
    expect(label.tone).toBe('bad');
  });

  it('đã trả đúng hạn: tông bình thường, không nhắc gì tới trễ', () => {
    const label = borrowHistoryLabel({ status: 'RETURNED', heldDays: 5, lateDays: 0 });

    expect(label.text).toContain('Đã trả');
    expect(label.text).toContain('5');
    expect(label.text.toLowerCase()).not.toContain('trễ');
    expect(label.tone).toBe('ok');
  });

  it('đã trả nhưng trả trễ: nêu số ngày trễ, nhưng KHÁC tông với máy đang quá hạn', () => {
    const returned = borrowHistoryLabel({ status: 'RETURNED', heldDays: 7, lateDays: 2 });
    const stillOut = borrowHistoryLabel({ status: 'OVERDUE', heldDays: 8, lateDays: 3 });

    expect(returned.text).toContain('trễ 2');
    // Máy đã nằm trong kho thì không được báo động đỏ như máy còn ở ngoài.
    expect(returned.tone).not.toBe(stillOut.tone);
  });

  it('thiếu mốc giao: nói không rõ, không bịa số ngày', () => {
    const label = borrowHistoryLabel({ status: 'UNKNOWN', heldDays: null, lateDays: null });

    expect(label.text).toContain('Không rõ');
    expect(label.text).not.toMatch(/\d/);
  });

  it('phiếu không đặt hạn: vẫn nói được số ngày giữ, không kết luận trễ', () => {
    const label = borrowHistoryLabel({ status: 'RETURNED', heldDays: 7, lateDays: null });

    expect(label.text).toContain('7');
    expect(label.text.toLowerCase()).not.toContain('trễ');
  });

  it('giữ 0 ngày vẫn hiện 0, không để trống', () => {
    const label = borrowHistoryLabel({ status: 'RETURNED', heldDays: 0, lateDays: 0 });

    expect(label.text).toContain('0');
  });
});
