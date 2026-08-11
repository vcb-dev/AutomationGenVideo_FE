export type AvailabilityTone = 'ok' | 'tight' | 'none';

/**
 * Tách khỏi component để test được: đây là chỗ duy nhất quyết định người mượn đọc thấy gì
 * khi chọn model, và câu chữ ở đây quyết định họ có dời lịch hay không.
 */
export function availabilityLabel(
  available: number,
  requested: number,
): { tone: AvailabilityTone; text: string } {
  if (available < requested) {
    return { tone: 'none', text: `Thiếu ${requested - available} máy trong khung giờ này` };
  }
  if (available === requested) {
    return { tone: 'tight', text: `Chỉ còn đúng ${available} máy` };
  }
  return { tone: 'ok', text: `Còn ${available} máy trống` };
}
