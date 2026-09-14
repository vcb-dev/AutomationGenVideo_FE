/**
 * Một tấm ảnh người dùng vừa chọn ở màn Bàn giao hoặc Nhận trả, chưa tải lên máy chủ.
 *
 * Ở chung một chỗ vì cả hai màn đều dùng. Trước đây kiểu này được `export` ngay trong màn Bàn
 * giao rồi màn Nhận trả `import` từ *page module* của nó — chạy được, nhưng nó kéo cả một trang
 * client component vào phụ thuộc của trang kia chỉ để lấy một khai báo kiểu.
 *
 * `file` bỏ trống với ảnh đã có sẵn trên máy chủ; `previewUrl` là blob cục bộ nên nhớ
 * `URL.revokeObjectURL` khi gỡ ảnh, không thì tab giữ luôn bộ nhớ của mọi tấm đã chọn.
 */
export interface PhotoItem {
  file?: File;
  previewUrl: string;
  name: string;
}
