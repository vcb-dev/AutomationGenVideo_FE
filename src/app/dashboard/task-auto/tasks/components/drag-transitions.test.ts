/**
 * Kanban board kéo-thả task (e15f705). DRAG_TRANSITIONS là bảng LUẬT DUY NHẤT quyết định
 * kéo-thả được phép làm gì — chỉ 2 dịch chuyển vừa hợp lệ ở BE (allowedTransition() trong
 * tasks.service.ts) vừa KHÔNG cần dữ liệu bắt buộc đi kèm (result_url khi nộp, lý do khi từ
 * chối). Test này khoá bảng luật để không ai lỡ tay thêm dịch chuyển thiếu dữ liệu bắt buộc
 * (VD: kéo thẳng sang SUBMITTED mà không có result_url) hoặc dịch chuyển không thể hoàn tác
 * (APPROVED có side-effect đẩy Drive, cố ý không cho kéo ngược).
 */

import { DRAG_TRANSITIONS } from './TasksKanbanBoard';
import type { TaskStatus } from '@/types/task-auto';

const ALL_STATUSES: TaskStatus[] = [
  'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED',
];

describe('DRAG_TRANSITIONS', () => {
  it('ASSIGNED kéo sang IN_PROGRESS bằng action "move" (tương đương nút Bắt đầu làm)', () => {
    expect(DRAG_TRANSITIONS.ASSIGNED).toEqual({ to: 'IN_PROGRESS', action: 'move' });
  });

  it('IN_PROGRESS kéo NGƯỢC lại ASSIGNED — cho sửa nhanh khi kéo nhầm cột', () => {
    expect(DRAG_TRANSITIONS.IN_PROGRESS).toEqual({ to: 'ASSIGNED', action: 'move' });
  });

  it('SUBMITTED kéo sang APPROVED dùng action "approve" (đi qua endpoint review, không phải update thường)', () => {
    expect(DRAG_TRANSITIONS.SUBMITTED).toEqual({ to: 'APPROVED', action: 'approve' });
  });

  it('APPROVED không có dịch chuyển kéo-thả nào — side-effect đẩy Drive không hoàn tác được', () => {
    expect(DRAG_TRANSITIONS.APPROVED).toBeUndefined();
  });

  it.each(['PENDING', 'REJECTED', 'CANCELLED'] as TaskStatus[])(
    '%s không có dịch chuyển kéo-thả nào (cần modal riêng hoặc không áp dụng)',
    (status) => {
      expect(DRAG_TRANSITIONS[status]).toBeUndefined();
    },
  );

  it('KHÔNG có trạng thái nào kéo thẳng sang SUBMITTED — nộp bài bắt buộc qua modal (cần result_url)', () => {
    const targets = ALL_STATUSES.map((s) => DRAG_TRANSITIONS[s]?.to).filter(Boolean);
    expect(targets).not.toContain('SUBMITTED');
  });

  it('KHÔNG có trạng thái nào kéo thẳng sang REJECTED — từ chối bắt buộc qua modal (cần lý do)', () => {
    const targets = ALL_STATUSES.map((s) => DRAG_TRANSITIONS[s]?.to).filter(Boolean);
    expect(targets).not.toContain('REJECTED');
  });

  it('mọi transition khai báo action="approve" thì to phải là APPROVED (đi đúng đường review)', () => {
    for (const status of ALL_STATUSES) {
      const t = DRAG_TRANSITIONS[status];
      if (t?.action === 'approve') expect(t.to).toBe('APPROVED');
    }
  });
});
