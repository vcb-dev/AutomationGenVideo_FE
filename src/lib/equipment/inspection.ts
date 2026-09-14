/**
 * Màn Kiểm tra: kết luận cho máy đang nằm ở bàn nhận.
 *
 * Đây là mắt xích DUY NHẤT đưa một chiếc máy trở lại `AVAILABLE`. Thiếu nó thì máy vừa nhập kho
 * khai tình trạng xấu và máy trả về bị trầy đều nằm lại vĩnh viễn — kho cứ hao dần mà không ai
 * thấy máy biến đi đâu. BE đã có `GET /mems/pending-inspection` và `POST /assets/:code/inspect`
 * từ lâu nhưng chưa màn nào gọi tới.
 *
 * Phần thuần tách ra khỏi màn hình để test được: câu chữ ở đây quyết định thủ kho hiểu đúng hay
 * sai HỆ QUẢ của nút mình sắp bấm, mà một trong ba lựa chọn có tác dụng phụ (sinh lệnh bảo trì).
 */

export type InspectResult = 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'BROKEN';

export interface PendingReason {
  label: string;
  hint: string;
  tone: 'intake' | 'postReturn';
}

/**
 * Vì sao chiếc máy này đang chờ kết luận.
 *
 * Hai lối vào bàn kiểm tra khác hẳn nhau về trách nhiệm: máy mới nhập thì chưa ai đụng vào, còn
 * máy trả về thì có người vừa cầm nó đi và có thể có bản ghi sự cố kèm theo. Gộp chung một nhãn
 * là làm mất đúng thông tin người kiểm tra cần trước khi kết luận.
 */
export function pendingReason(status: string): PendingReason {
  if (status === 'POST_RETURN_CHECK') {
    return {
      label: 'Trả về, chờ đối chiếu',
      hint: 'Máy tệ đi so với lúc giao, hoặc thiếu phụ kiện khi trả.',
      tone: 'postReturn',
    };
  }
  return {
    label: 'Mới nhập, chờ kiểm',
    hint: 'Khai tình trạng không phải Tốt hoặc Đã dùng lúc nhập kho.',
    tone: 'intake',
  };
}

export interface InspectResultOption {
  value: InspectResult;
  label: string;
  /** Nói thẳng chuyện gì xảy ra sau khi bấm — nhất là tác dụng phụ. */
  consequence: string;
}

export const INSPECT_RESULT_OPTIONS: InspectResultOption[] = [
  {
    value: 'AVAILABLE',
    label: 'Đạt — cho về kệ',
    consequence: 'Máy trở lại Sẵn sàng và được tính vào số khả dụng ngay.',
  },
  {
    value: 'UNDER_MAINTENANCE',
    label: 'Đưa đi bảo trì',
    consequence:
      'Sinh một lệnh bảo trì bỏ ngỏ điểm kết thúc — máy bận cho tới khi có người đóng lệnh đó.',
  },
  {
    value: 'BROKEN',
    label: 'Hỏng',
    consequence: 'Máy bị loại khỏi số khả dụng, không cho mượn cho tới khi có kết luận khác.',
  },
];

/**
 * Tình trạng vật lý gợi ý theo kết luận.
 *
 * Chỉ là GỢI Ý điền sẵn, người kiểm tra vẫn sửa được: một chiếc về kệ có thể là Tốt hoặc Đã
 * dùng, mà ép cứng thì mọi lần đối chiếu về sau đều lệch.
 */
export function suggestedCondition(result: InspectResult, current: string): string {
  if (result === 'BROKEN') return 'BROKEN';
  if (result === 'UNDER_MAINTENANCE') return 'IN_MAINTENANCE';
  // Về kệ mà tình trạng đang là hỏng/cần kiểm thì phải nâng lên, nếu không máy "Sẵn sàng" lại
  // mang tình trạng Hỏng — hai cột nói ngược nhau ngay trên cùng một dòng.
  return ['BROKEN', 'NEEDS_CHECK', 'IN_MAINTENANCE'].includes(current) ? 'USED' : current;
}

/** Kết luận Bảo trì bắt buộc nêu lý do: nó thành nội dung của lệnh bảo trì vừa sinh ra. */
export function requiresNote(result: InspectResult): boolean {
  return result === 'UNDER_MAINTENANCE';
}
