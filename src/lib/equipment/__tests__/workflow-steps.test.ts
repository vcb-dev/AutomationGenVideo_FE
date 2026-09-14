import { WORKFLOW_STEP_IDS, workflowSteps } from '../workflow-steps';

/**
 * Bốn bước của luồng mượn thiết bị, dùng chung cho cả bốn màn.
 *
 * Trước đây mỗi màn tự khai mảng bước của riêng nó, và chúng đã lệch nhau thật: màn Chuẩn bị
 * ghi "Kiểm tra khi giao" là bước 3, màn Bàn giao cũng ghi thế nhưng đặt "Bàn giao" ở bước 4 —
 * hai màn vẽ hai luồng khác nhau cho cùng một quy trình. Gom về một nguồn để hết chuyện đó.
 */

describe('workflowSteps', () => {
  it('luôn đủ bốn bước, đúng thứ tự vòng đời phiếu', () => {
    expect(workflowSteps('approvals').map((s) => s.id)).toEqual([
      'approvals',
      'prepare',
      'handover',
      'returns',
    ]);
  });

  it('bước đang đứng là current, trước đó là done, sau đó là todo', () => {
    expect(workflowSteps('handover').map((s) => s.state)).toEqual([
      'done',
      'done',
      'current',
      'todo',
    ]);
  });

  it('đứng ở bước đầu thì không có bước nào là done', () => {
    expect(workflowSteps('approvals').map((s) => s.state)).toEqual([
      'current',
      'todo',
      'todo',
      'todo',
    ]);
  });

  it('đứng ở bước cuối thì ba bước trước đều done', () => {
    expect(workflowSteps('returns').map((s) => s.state)).toEqual([
      'done',
      'done',
      'done',
      'current',
    ]);
  });

  it('mọi bước đều có đường dẫn riêng, kể cả bước chưa tới', () => {
    // Bước chưa tới vẫn phải bấm được: thủ kho hay nhận trả một phiếu cũ trong khi phiếu mới
    // còn đang chờ duyệt. Khoá lại là bắt họ đi vòng qua thanh menu.
    for (const step of workflowSteps('approvals')) {
      expect(step.href).toMatch(/^\/dashboard\/equipment\//);
    }
  });

  it('nhãn là tiếng Việt, không lòi id ra màn hình', () => {
    for (const step of workflowSteps('prepare')) {
      expect(step.label).not.toBe(step.id);
      expect(step.label).not.toMatch(/^[a-z]+$/);
    }
  });

  it('id lạ thì mọi bước đều todo, không nổ và không tự nhận bừa một bước', () => {
    // Trang khác lỡ dùng thanh này thì thà không tô bước nào còn hơn tô sai chỗ đứng.
    const states = workflowSteps('khong-co-that' as never).map((s) => s.state);
    expect(states).toEqual(['todo', 'todo', 'todo', 'todo']);
  });

  it('WORKFLOW_STEP_IDS khớp đúng thứ tự các bước', () => {
    expect(workflowSteps('approvals').map((s) => s.id)).toEqual([...WORKFLOW_STEP_IDS]);
  });
});
