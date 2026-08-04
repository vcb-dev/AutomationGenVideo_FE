/**
 * Giữ lựa chọn đang có nếu nó còn hợp lệ, không còn thì trả về giá trị thay thế.
 *
 * Mọi ô <select> của vòng quay đều cần: danh sách team/thành viên có thể bị xóa ở tab khác,
 * mà React không tự dọn state theo. Để một id đã chết nằm lại trong state sẽ dẫn tới bảng lọc
 * ra rỗng, hoặc tệ hơn là ghi dữ liệu mới vào team không còn tồn tại.
 */
export function keepSelected(currentId: string, availableIds: string[], fallbackId: string): string {
  return availableIds.includes(currentId) ? currentId : fallbackId;
}
