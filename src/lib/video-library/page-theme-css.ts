/**
 * CSS trang Bộ sưu tập chèn vào để khung dashboard (body, main) đổi theo nền riêng của trang
 * (rất sáng / rất tối) — không có thì main giữ màu mặc định, lệch hẳn với thân trang.
 *
 * Mọi luật đều bọc trong `.dark` / `html:not(.dark)` để nút đổi giao diện vẫn có tác dụng.
 * Ở giao diện sáng KHÔNG đổi màu header: header chỉ có bản nền tối với chữ trắng, ép nền sáng
 * thì logo "VCB", mục menu đang chọn và tên người dùng thành trắng trên trắng, mất chữ.
 */
export const VIDEO_LIBRARY_PAGE_THEME_CSS = `
    html:not(.dark) body { background-color: #f8fafc !important; }
    html:not(.dark) main { background-color: #f8fafc !important; }
    html:not(.dark) .bg-gray-50 { background-color: #f8fafc !important; }

    .dark header { background-color: #07090F !important; border-bottom-color: #151820 !important; }
    .dark header p { color: #f8fafc !important; }
    .dark body { background-color: #07090F !important; }
    .dark main { background-color: #07090F !important; }
    .dark .bg-gray-50 { background-color: #07090F !important; }
`;
