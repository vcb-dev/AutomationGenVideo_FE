/**
 * Chức năng: kịch bản từ voice ở tab Content — trạng thái Đang tạo / Xong / Lỗi, tự làm mới, quyền Thử lại.
 */
import { UserRole } from '@/types/auth';
import { canRetryScript, hasProcessingScript, scriptStatusOf } from '../script-status';

describe('scriptStatusOf', () => {
  it('giữ nguyên trạng thái BE trả về', () => {
    expect(scriptStatusOf({ script_status: 'PROCESSING' })).toBe('PROCESSING');
    expect(scriptStatusOf({ script_status: 'FAILED' })).toBe('FAILED');
    expect(scriptStatusOf({ script_status: 'DONE' })).toBe('DONE');
  });

  it('content cũ không có script_status → coi là đã xong', () => {
    expect(scriptStatusOf({})).toBe('DONE');
    expect(scriptStatusOf({ script_status: null })).toBe('DONE');
  });
});

describe('hasProcessingScript', () => {
  it('còn ít nhất một content đang tạo kịch bản → cần tự làm mới', () => {
    expect(hasProcessingScript([{ script_status: 'DONE' }, { script_status: 'PROCESSING' }])).toBe(true);
  });

  it('tất cả đã xong / lỗi / dòng cũ → dừng tự làm mới', () => {
    expect(hasProcessingScript([{ script_status: 'DONE' }, { script_status: 'FAILED' }, {}])).toBe(false);
    expect(hasProcessingScript([])).toBe(false);
  });
});

describe('canRetryScript', () => {
  it('admin, leader, manager được tạo lại kịch bản', () => {
    expect(canRetryScript([UserRole.ADMIN])).toBe(true);
    expect(canRetryScript([UserRole.LEADER])).toBe(true);
    expect(canRetryScript([UserRole.MANAGER])).toBe(true);
    expect(canRetryScript([UserRole.MEMBER, UserRole.LEADER])).toBe(true);
  });

  it('member / editor / chưa đăng nhập → không được', () => {
    expect(canRetryScript([UserRole.MEMBER])).toBe(false);
    expect(canRetryScript([UserRole.EDITOR, UserRole.CONTENT])).toBe(false);
    expect(canRetryScript([])).toBe(false);
    expect(canRetryScript(undefined)).toBe(false);
  });
});
