import { WORKFLOW_STEP_IDS, workflowSteps } from '../workflow-steps';

/**
 * Ba bước của luồng mượn thiết bị, dùng chung cho cả quy trình:
 * Duyệt phiếu -> Bàn giao (gán máy & ký) -> Nhận trả.
 */

describe('workflowSteps', () => {
  it('luôn đủ ba bước chuẩn hoá, đúng thứ tự vòng đời phiếu', () => {
    expect(workflowSteps('approvals').map((s) => s.id)).toEqual([
      'approvals',
      'handover',
      'returns',
    ]);
  });

  it('bước đang đứng là current, trước đó là done, sau đó là todo', () => {
    expect(workflowSteps('handover').map((s) => s.state)).toEqual([
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
    ]);
  });

  it('đứng ở bước cuối thì các bước trước đều done', () => {
    expect(workflowSteps('returns').map((s) => s.state)).toEqual([
      'done',
      'done',
      'current',
    ]);
  });

  it('nếu truyền vào alias prepare thì tự động quy về bước handover', () => {
    expect(workflowSteps('prepare').map((s) => s.state)).toEqual([
      'done',
      'current',
      'todo',
    ]);
  });

  it('mọi bước đều có đường dẫn riêng, kể cả bước chưa tới', () => {
    for (const step of workflowSteps('approvals')) {
      expect(step.href).toMatch(/^\/dashboard\/equipment\//);
    }
  });

  it('nhãn là tiếng Việt, không lòi id ra màn hình', () => {
    for (const step of workflowSteps('handover')) {
      expect(step.label).not.toBe(step.id);
      expect(step.label).not.toMatch(/^[a-z]+$/);
    }
  });

  it('id lạ thì mọi bước đều todo, không nổ và không tự nhận bừa một bước', () => {
    const states = workflowSteps('khong-co-that' as never).map((s) => s.state);
    expect(states).toEqual(['todo', 'todo', 'todo']);
  });

  it('WORKFLOW_STEP_IDS khớp đúng thứ tự các bước', () => {
    expect(workflowSteps('approvals').map((s) => s.id)).toEqual([...WORKFLOW_STEP_IDS]);
  });
});

