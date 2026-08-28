import { manualStatusOptionsFor, statusDoorHints } from '../manual-status';

/**
 * Dropdown trạng thái trong form sửa thiết bị.
 *
 * Bản sao của `asset-status-rules.ts` bên BE. Cửa canh thật nằm ở BE; danh sách này chỉ để
 * người dùng không chọn được thứ chắc chắn bị từ chối.
 *
 * Một luật xuyên suốt: dropdown = trạng thái ĐANG CÓ + những đích đặt tay được. Thiếu vế đầu
 * thì ô select nhảy về giá trị đầu danh sách, và người dùng lưu một thay đổi họ không hề chọn.
 */

const values = (status: string) => manualStatusOptionsFor(status).map((o) => o.value);

describe('manualStatusOptionsFor', () => {
  it('máy trên kệ chọn được cả ba đích, đứng sau trạng thái đang có', () => {
    expect(values('AVAILABLE')).toEqual([
      'AVAILABLE',
      'PENDING_INSPECTION',
      'BROKEN',
      'LOST',
    ]);
  });

  it('máy đang mượn chỉ còn một đích: Mất', () => {
    // Trầy, thiếu phụ kiện, hỏng — ghi lúc nhận trả, vì đó là chỗ duy nhất sinh phiếu sự cố.
    expect(values('ON_LOAN')).toEqual(['ON_LOAN', 'LOST']);
  });

  it('trạng thái đang có không bị lặp hai lần', () => {
    expect(values('BROKEN')).toEqual(['BROKEN', 'PENDING_INSPECTION', 'LOST']);
  });

  it('máy đang bảo trì vẫn hiện đúng trạng thái của nó', () => {
    // Bảo trì không đặt tay được, nhưng máy ĐANG bảo trì thì ô select phải hiện ra như thế.
    expect(values('UNDER_MAINTENANCE')[0]).toBe('UNDER_MAINTENANCE');
    expect(values('UNDER_MAINTENANCE')).toContain('PENDING_INSPECTION');
  });

  it('mọi lựa chọn đều có nhãn tiếng Việt, không lòi enum thô', () => {
    for (const option of manualStatusOptionsFor('AVAILABLE')) {
      expect(option.label).not.toMatch(/^[A-Z_]+$/);
    }
  });
});

describe('statusDoorHints', () => {
  it('nêu đủ bốn trạng thái phải đi cửa khác', () => {
    const text = statusDoorHints().join(' ');
    expect(text).toMatch(/Sẵn sàng/);
    expect(text).toMatch(/Đang mượn/);
    expect(text).toMatch(/Bảo trì/);
    expect(text).toMatch(/thanh lý/i);
  });

  it('mỗi câu chỉ đúng một màn cụ thể, không nói chung chung', () => {
    // "Không được phép" mà không nói đi đâu thì người dùng đứng im rồi nhắn hỏi thủ kho.
    for (const hint of statusDoorHints()) {
      expect(hint).toMatch(/Kiểm tra|Bàn giao|Nhận trả|Xoá/);
    }
  });
});
