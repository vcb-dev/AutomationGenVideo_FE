/**
 * Bốn bước của luồng mượn thiết bị: duyệt → gán serial → bàn giao → nhận trả.
 *
 * MỘT nguồn duy nhất cho cả bốn màn. Trước đây mỗi màn tự khai mảng bước của riêng nó và chúng
 * đã lệch nhau thật — hai màn vẽ hai luồng khác nhau cho cùng một quy trình. Màn hình giờ chỉ
 * cần nói mình đang đứng ở đâu, không phải chép lại danh sách.
 */

export const WORKFLOW_STEP_IDS = ['approvals', 'prepare', 'handover', 'returns'] as const;

export type WorkflowStepId = (typeof WORKFLOW_STEP_IDS)[number];

export interface WorkflowStep {
  id: WorkflowStepId;
  label: string;
  /** Nói rõ bước này làm gì — hiện dưới nhãn ở màn rộng. */
  hint: string;
  href: string;
  state: 'done' | 'current' | 'todo';
}

const DEFINITIONS: Record<WorkflowStepId, { label: string; hint: string }> = {
  approvals: { label: 'Duyệt phiếu', hint: 'Ký cho phiếu chờ duyệt' },
  prepare: { label: 'Gán serial', hint: 'Chọn máy cụ thể' },
  handover: { label: 'Bàn giao', hint: 'Chụp ảnh, ký biên bản' },
  returns: { label: 'Nhận trả', hint: 'Đối chiếu và kết luận' },
};

/**
 * Danh sách bước kèm trạng thái so với chỗ đang đứng.
 *
 * Bước CHƯA TỚI vẫn có đường dẫn và vẫn bấm được: thủ kho hay phải nhận trả một phiếu cũ trong
 * khi phiếu mới còn đang chờ duyệt. Khoá lại là bắt họ đi vòng qua thanh menu.
 */
export function workflowSteps(current: WorkflowStepId): WorkflowStep[] {
  const currentIndex = WORKFLOW_STEP_IDS.indexOf(current);

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
