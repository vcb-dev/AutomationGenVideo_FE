import { returnOutcome, ReturnItem } from '../return-outcome';

const NAMES = {
  'CAM-001': ['Pin', 'Sạc', 'Dây đeo'],
  'LEN-002': ['Nắp trước', 'Nắp sau'],
};

const item = (over: Partial<ReturnItem> & { code: string }): ReturnItem => ({
  selected: true,
  conditionBefore: 'GOOD',
  conditionAfter: 'GOOD',
  photoCount: 1,
  accessories: [true, true, true],
  ...over,
});

describe('returnOutcome', () => {
  it('máy nguyên vẹn, đủ phụ kiện thì về thẳng Sẵn sàng', () => {
    const result = returnOutcome([item({ code: 'CAM-001' })], NAMES);
    expect(result.units[0]).toMatchObject({
      code: 'CAM-001',
      nextStatus: 'AVAILABLE',
      opensIncident: false,
    });
  });

  it('tình trạng xấu hơn lúc giao thì đi Kiểm tra sau trả và mở sự cố', () => {
    // BR-42: cho về Sẵn sàng ngay là người mượn kế tiếp lãnh hậu quả.
    const result = returnOutcome(
      [item({ code: 'CAM-001', conditionBefore: 'GOOD', conditionAfter: 'USED' })],
      NAMES,
    );
    expect(result.units[0]).toMatchObject({
      nextStatus: 'POST_RETURN_CHECK',
      opensIncident: true,
    });
  });

  it('tình trạng tốt lên không bị coi là sự cố', () => {
    // Máy vừa đi bảo trì về thì tình trạng khá hơn lúc giao, không có gì để quy trách nhiệm.
    const result = returnOutcome(
      [item({ code: 'CAM-001', conditionBefore: 'USED', conditionAfter: 'GOOD' })],
      NAMES,
    );
    expect(result.units[0]).toMatchObject({ nextStatus: 'AVAILABLE', opensIncident: false });
  });

  it('thiếu phụ kiện thì máy vẫn phải đi kiểm tra, nhưng không mở sự cố tình trạng', () => {
    const result = returnOutcome(
      [item({ code: 'CAM-001', accessories: [true, false, true] })],
      NAMES,
    );
    expect(result.units[0]).toMatchObject({
      nextStatus: 'POST_RETURN_CHECK',
      opensIncident: false,
      missingAccessories: ['Sạc'],
    });
  });

  it('thiếu ảnh khi trả thì chưa xác nhận nhận lại được', () => {
    const result = returnOutcome([item({ code: 'CAM-001', photoCount: 0 })], NAMES);
    expect(result.canConfirm).toBe(false);
    expect(result.unitsMissingPhoto).toEqual(['CAM-001']);
  });

  it('trả đủ mọi máy thì phiếu đóng', () => {
    const result = returnOutcome(
      [item({ code: 'CAM-001' }), item({ code: 'LEN-002' })],
      NAMES,
    );
    expect(result.requestStatus).toBe('CLOSED');
    expect(result.selectedCount).toBe(2);
  });

  it('còn một máy chưa mang tới thì phiếu chỉ là trả một phần', () => {
    const result = returnOutcome(
      [item({ code: 'CAM-001' }), item({ code: 'LEN-002', selected: false })],
      NAMES,
    );
    expect(result.requestStatus).toBe('PARTIALLY_RETURNED');
    expect(result.units).toHaveLength(1);
  });

  it('chưa chọn máy nào thì chưa xác nhận được', () => {
    const result = returnOutcome([item({ code: 'CAM-001', selected: false })], NAMES);
    expect(result.canConfirm).toBe(false);
  });

  it('tình trạng lạ được coi là mức xấu nhất', () => {
    // Thà bắt kiểm tra thừa còn hơn cho một máy không rõ tình trạng về thẳng kệ.
    const result = returnOutcome(
      [item({ code: 'CAM-001', conditionAfter: 'CHƯA_RÕ' })],
      NAMES,
    );
    expect(result.units[0].nextStatus).toBe('POST_RETURN_CHECK');
  });
});
