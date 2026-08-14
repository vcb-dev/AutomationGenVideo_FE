import { handoverReadiness } from '../handover-readiness';

const device = (code: string, photoCount: number, accessories: boolean[] = [true, true]) => ({
  code,
  photoCount,
  accessories,
});

describe('handoverReadiness', () => {
  it('đủ ảnh và đã tick xác nhận thì bàn giao được', () => {
    const result = handoverReadiness([device('CAM-002', 2), device('LEN-004', 1)], true);
    expect(result.canHandover).toBe(true);
    expect(result.totalPhotoCount).toBe(3);
  });

  it('thiếu ảnh là chặn cứng, nói rõ máy nào', () => {
    // BR-26: ảnh là căn cứ quy trách nhiệm, không có ảnh thì lúc nhận lại không cãi được.
    const result = handoverReadiness([device('CAM-002', 0), device('LEN-004', 1)], true);
    expect(result.canHandover).toBe(false);
    expect(result.unitsMissingPhoto).toEqual(['CAM-002']);
  });

  it('chưa tick xác nhận thì chưa bàn giao dù đủ ảnh', () => {
    // BR-27: chưa xác nhận thì máy vẫn ở trạng thái Sẵn sàng.
    expect(handoverReadiness([device('CAM-002', 1)], false).canHandover).toBe(false);
  });

  it('phụ kiện chưa tick chỉ cảnh báo, không chặn', () => {
    // Chặn cứng sẽ khiến người ta tick bừa cho qua, mất luôn giá trị đối chiếu lúc nhận lại.
    const result = handoverReadiness([device('CAM-002', 1, [true, false, false])], true);
    expect(result.canHandover).toBe(true);
    expect(result.uncheckedAccessoryCount).toBe(2);
  });

  it('không có máy nào thì không bàn giao được dù đã tick', () => {
    expect(handoverReadiness([], true).canHandover).toBe(false);
  });

  it('đếm phụ kiện thiếu trên toàn bộ biên bản, không phải từng máy', () => {
    const result = handoverReadiness(
      [device('CAM-002', 1, [false, true]), device('LEN-004', 1, [false, false])],
      true,
    );
    expect(result.uncheckedAccessoryCount).toBe(3);
  });
});
