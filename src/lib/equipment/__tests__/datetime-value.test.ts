import {
  isOffGridTime,
  joinDateTime,
  splitDateTime,
  timeOptions,
  toLocalDateTimeValue,
} from '../datetime-value';

/**
 * Chức năng: tách/ghép giá trị ngày-giờ của màn Tạo phiếu.
 *
 * Vì sao đáng một file test riêng: giá trị này chảy thẳng vào `new Date(...).toISOString()` lúc
 * gửi phiếu. Ghép nửa vời cho ra `Invalid Date`, và lỗi nổ ở chỗ không liên quan gì tới ô nhập.
 * Còn tách sai một ký tự thì phiếu lệch giờ mà nhìn mắt thường không thấy.
 */

describe('splitDateTime', () => {
  it('tách đúng ngày và giờ', () => {
    expect(splitDateTime('2026-09-10T08:30')).toEqual({ date: '2026-09-10', time: '08:30' });
  });

  it('có giây thì cắt bỏ, giữ đúng HH:mm', () => {
    // Vài trình duyệt trả kèm giây khi người dùng gõ tay vào ô datetime-local.
    expect(splitDateTime('2026-09-10T08:30:45').time).toBe('08:30');
  });

  it('chưa chọn gì thì hai phần đều rỗng, không nổ', () => {
    for (const value of ['', undefined, null]) {
      expect(splitDateTime(value)).toEqual({ date: '', time: '' });
    }
  });

  it('chỉ có ngày thì giờ rỗng', () => {
    expect(splitDateTime('2026-09-10')).toEqual({ date: '2026-09-10', time: '' });
  });
});

describe('joinDateTime', () => {
  it('ghép lại đúng định dạng của ô datetime-local', () => {
    expect(joinDateTime('2026-09-10', '08:30')).toBe('2026-09-10T08:30');
  });

  it('thiếu một trong hai thì trả rỗng, KHÔNG ghép nửa vời', () => {
    // `2026-09-10T` cho ra Invalid Date, và nó chảy tới tận `toISOString()` lúc gửi phiếu.
    expect(joinDateTime('2026-09-10', '')).toBe('');
    expect(joinDateTime('', '08:30')).toBe('');
    expect(joinDateTime('', '')).toBe('');
  });

  it('đi vòng tách rồi ghép thì ra đúng giá trị ban đầu', () => {
    const value = '2026-09-10T08:30';
    const { date, time } = splitDateTime(value);

    expect(joinDateTime(date, time)).toBe(value);
  });
});

describe('timeOptions', () => {
  it('mặc định cách nhau 30 phút, phủ trọn một ngày', () => {
    const options = timeOptions();

    expect(options).toHaveLength(48);
    expect(options[0]).toBe('00:00');
    expect(options[1]).toBe('00:30');
    expect(options[options.length - 1]).toBe('23:30');
  });

  it('luôn có số 0 đệm ở cả giờ lẫn phút', () => {
    // `8:0` không phải giá trị hợp lệ của datetime-local; thiếu đệm là ô nhập im lặng bỏ trống.
    for (const option of timeOptions()) {
      expect(option).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('đổi bước thì số lựa chọn đổi theo', () => {
    expect(timeOptions(15)).toHaveLength(96);
    expect(timeOptions(60)).toHaveLength(24);
  });
});

describe('isOffGridTime', () => {
  it('giờ lệch khỏi danh sách thì nhận ra', () => {
    // Không nhận ra ca này thì ô select rơi về lựa chọn đầu và ÂM THẦM đổi giờ của phiếu ngay
    // khi người dùng mở form ra xem.
    expect(isOffGridTime('08:17')).toBe(true);
  });

  it('giờ nằm đúng trên lưới thì không sao', () => {
    expect(isOffGridTime('08:30')).toBe(false);
    expect(isOffGridTime('00:00')).toBe(false);
  });

  it('chưa chọn giờ thì không tính là lệch', () => {
    expect(isOffGridTime('')).toBe(false);
  });
});

describe('toLocalDateTimeValue', () => {
  it('lấy giờ máy chứ không lấy giờ UTC', () => {
    expect(toLocalDateTimeValue(new Date(2026, 9, 24, 10, 23))).toBe('2026-10-24T10:23');
  });

  it('đọc lại bằng new Date() ra đúng mốc ban đầu (tới phút)', () => {
    const at = new Date(2026, 9, 24, 23, 5);
    expect(new Date(toLocalDateTimeValue(at)).getTime()).toBe(at.getTime());
  });

  it('đệm số 0 cho tháng, ngày, giờ, phút một chữ số', () => {
    expect(toLocalDateTimeValue(new Date(2026, 0, 3, 4, 7))).toBe('2026-01-03T04:07');
  });
});
