import { manualStatusOptionsFor, statusDoorHints } from '../manual-status';

const values = (status: string) => manualStatusOptionsFor(status).map((o) => o.value);

describe('manualStatusOptionsFor', () => {
  it('máy trên kệ chọn được các đích Sẵn sàng, Bảo trì, Hỏng, Mất', () => {
    expect(values('AVAILABLE')).toEqual([
      'AVAILABLE',
      'UNDER_MAINTENANCE',
      'BROKEN',
      'LOST',
    ]);
  });

  it('máy đang mượn chỉ còn một đích: Mất', () => {
    expect(values('ON_LOAN')).toEqual(['ON_LOAN', 'LOST']);
  });

  it('máy chờ kiểm tra sau trả cũng chỉ còn một đích: Mất', () => {
    // Phải KHỚP với chốt bên BE (`WORKFLOW_ONLY_STATUSES` + `MANUAL_EXITS_FROM_WORKFLOW`). Cửa
    // đúng để rời POST_RETURN_CHECK là màn Kiểm tra — chỉ ở đó kết luận Bảo trì mới sinh kèm
    // lệnh bảo trì. Chào thêm lựa chọn ở đây là hiện nút mà bấm vào ăn 400.
    expect(values('POST_RETURN_CHECK')).toEqual(['POST_RETURN_CHECK', 'LOST']);
  });

  it('trạng thái đang có không bị lặp hai lần', () => {
    expect(values('BROKEN')).toEqual(['BROKEN', 'AVAILABLE', 'UNDER_MAINTENANCE', 'LOST']);
  });

  it('máy đang bảo trì vẫn hiện đúng trạng thái của nó và chọn được Sẵn sàng', () => {
    expect(values('UNDER_MAINTENANCE')[0]).toBe('UNDER_MAINTENANCE');
    expect(values('UNDER_MAINTENANCE')).toContain('AVAILABLE');
  });

  it('mọi lựa chọn đều có nhãn tiếng Việt, không lòi enum thô', () => {
    for (const option of manualStatusOptionsFor('AVAILABLE')) {
      expect(option.label).not.toMatch(/^[A-Z_]+$/);
    }
  });
});

describe('statusDoorHints', () => {
  it('nêu đủ các trạng thái', () => {
    const text = statusDoorHints().join(' ');
    expect(text).toMatch(/Sẵn sàng/);
    expect(text).toMatch(/Đang mượn/);
    expect(text).toMatch(/Bảo trì/);
    expect(text).toMatch(/thanh lý/i);
  });
});
