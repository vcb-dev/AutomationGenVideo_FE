import { apiErrorMessage } from '../api-error';

/**
 * NestJS trả `message` ở hai dạng tuỳ nguồn lỗi: chuỗi cho lỗi nghiệp vụ, MẢNG chuỗi cho lỗi
 * validate DTO. Các màn trước đây gán thẳng vào state kiểu `string`, nên gặp mảng thì React nối
 * các phần tử không dấu phân cách và người dùng đọc được một chuỗi dính liền vô nghĩa.
 */
const err = (message: unknown) => ({ response: { data: { message } } });

describe('apiErrorMessage', () => {
  it('lỗi nghiệp vụ dạng chuỗi thì lấy nguyên văn', () => {
    expect(apiErrorMessage(err('Máy CAM-001 đã được gán cho phiếu khác'), 'dự phòng')).toBe(
      'Máy CAM-001 đã được gán cho phiếu khác',
    );
  });

  it('lỗi validate dạng mảng thì nối bằng dấu chấm phẩy, không dính liền', () => {
    const message = apiErrorMessage(
      err(['serialNumber should not be empty', 'locationId must be a UUID']),
      'dự phòng',
    );

    expect(message).toBe('serialNumber should not be empty; locationId must be a UUID');
    expect(message).not.toContain('emptylocationId');
  });

  it('mảng một phần tử không thừa dấu phân cách', () => {
    expect(apiErrorMessage(err(['Chỉ một lỗi']), 'dự phòng')).toBe('Chỉ một lỗi');
  });

  it('mảng rỗng hoặc toàn rác thì rơi về câu dự phòng', () => {
    expect(apiErrorMessage(err([]), 'dự phòng')).toBe('dự phòng');
    expect(apiErrorMessage(err(['', '   ']), 'dự phòng')).toBe('dự phòng');
    expect(apiErrorMessage(err([null, 42]), 'dự phòng')).toBe('dự phòng');
  });

  it('mảng lẫn phần tử không phải chuỗi thì chỉ lấy phần đọc được', () => {
    expect(apiErrorMessage(err(['Lỗi thật', null]), 'dự phòng')).toBe('Lỗi thật');
  });

  it('chuỗi rỗng hoặc toàn khoảng trắng cũng rơi về dự phòng', () => {
    expect(apiErrorMessage(err(''), 'dự phòng')).toBe('dự phòng');
    expect(apiErrorMessage(err('   '), 'dự phòng')).toBe('dự phòng');
  });

  it('lỗi mạng không có response vẫn ra câu dự phòng, không nổ', () => {
    expect(apiErrorMessage(new Error('Network Error'), 'dự phòng')).toBe('dự phòng');
    expect(apiErrorMessage(undefined, 'dự phòng')).toBe('dự phòng');
    expect(apiErrorMessage(null, 'dự phòng')).toBe('dự phòng');
    expect(apiErrorMessage({}, 'dự phòng')).toBe('dự phòng');
  });
});

/**
 * Phân biệt "máy chủ không phản hồi" với "dữ liệu hỏng".
 *
 * Lỗi axios KHÔNG có `response` nghĩa là request chưa từng tới máy chủ. Gộp nó vào câu dự phòng
 * chung là đẩy người dùng đi truy nhầm hướng — đã xảy ra thật với API kho thiết bị.
 *
 * Nhận diện bằng sự có mặt của `config` (axios luôn gắn) chứ không bằng `message`, vì `Error`
 * thường cũng có `message` mà không phải lỗi mạng.
 */
const loiMang = (over: object = {}) => ({ config: { url: '/mems/assets' }, ...over });

describe('apiErrorMessage — máy chủ không phản hồi', () => {
  it('không có response thì nói rõ là không kết nối được máy chủ', () => {
    const message = apiErrorMessage(loiMang(), 'Không đọc được danh sách thiết bị.');

    expect(message).toMatch(/không kết nối được máy chủ/i);
    expect(message).toMatch(/backend/i);
  });

  it('quá thời gian chờ thì nói đúng là quá lâu, không phải mất kết nối', () => {
    const message = apiErrorMessage(loiMang({ code: 'ECONNABORTED' }), 'dự phòng');

    expect(message).toMatch(/quá lâu/i);
  });

  it('có response thì vẫn ưu tiên câu lỗi của máy chủ như cũ', () => {
    const message = apiErrorMessage(
      loiMang({ response: { status: 409, data: { message: 'Máy CAM-001 đang được mượn' } } }),
      'dự phòng',
    );

    expect(message).toBe('Máy CAM-001 đang được mượn');
  });

  it('có response nhưng máy chủ không nói gì thì về câu dự phòng, KHÔNG báo mất kết nối', () => {
    // Báo nhầm "mất kết nối" khi máy chủ vẫn trả lời là đẩy người dùng đi sai hướng ngược lại.
    const message = apiErrorMessage(loiMang({ response: { status: 500, data: {} } }), 'dự phòng');

    expect(message).toBe('dự phòng');
  });

  it('Error thường không bị nhận nhầm thành lỗi mạng', () => {
    expect(apiErrorMessage(new Error('Network Error'), 'dự phòng')).toBe('dự phòng');
  });
});
