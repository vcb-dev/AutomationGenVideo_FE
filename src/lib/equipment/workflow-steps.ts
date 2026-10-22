/**
 * Ba bước của luồng mượn thiết bị: duyệt → bàn giao & gán máy → nhận trả.
 *
 * MỘT nguồn duy nhất cho cả quy trình. Bỏ bước gán serial trung gian vì việc gán máy
 * đã được tích hợp thẳng vào bước bàn giao (linh hoạt, không bắt buộc thủ kho phải làm 2 lần).
 */

export const WORKFLOW_STEP_IDS = ['approvals', 'handover', 'returns'] as const;

export type WorkflowStepId = (typeof WORKFLOW_STEP_IDS)[number] | 'prepare';

export interface WorkflowStep {
  id: (typeof WORKFLOW_STEP_IDS)[number];
  label: string;
  /** Nói rõ bước này làm gì — hiện dưới nhãn ở màn rộng. */
  hint: string;
  href: string;
  state: 'done' | 'current' | 'todo';
}

const DEFINITIONS: Record<(typeof WORKFLOW_STEP_IDS)[number], { label: string; hint: string }> = {
  approvals: { label: 'Duyệt phiếu', hint: 'Ký cho phiếu chờ duyệt' },
  handover: { label: 'Bàn giao', hint: 'Gán máy, chụp ảnh & ký' },
  returns: { label: 'Nhận trả', hint: 'Đối chiếu và kết luận' },
};

/**
 * Danh sách bước kèm trạng thái so với chỗ đang đứng.
 *
 * Bước CHƯA TỚI vẫn có đường dẫn và vẫn bấm được: thủ kho hay phải nhận trả một phiếu cũ trong
 * khi phiếu mới còn đang chờ duyệt. Khoá lại là bắt họ đi vòng qua thanh menu.
 */
export function workflowSteps(current: WorkflowStepId): WorkflowStep[] {
  const normalizedCurrent = current === 'prepare' ? 'handover' : current;
  const currentIndex = WORKFLOW_STEP_IDS.indexOf(normalizedCurrent as (typeof WORKFLOW_STEP_IDS)[number]);

  return WORKFLOW_STEP_IDS.map((id, index) => ({
    id,
    ...DEFINITIONS[id],
    href: `/dashboard/equipment/${id}`,
    // `currentIndex === -1` là id lạ: thà không tô bước nào còn hơn tô sai chỗ đứng.
    state:
      currentIndex === -1
        ? 'todo'
        : index < currentIndex
          ? 'done'
          : index === currentIndex
            ? 'current'
            : 'todo',
  }));
}
