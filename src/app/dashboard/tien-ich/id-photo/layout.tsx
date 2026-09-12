'use client';

import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { ShieldAlert } from 'lucide-react';

/**
 * Guard hiển thị ở tầng route, khớp ĐÚNG @Roles bên IdPhotoController:
 *  - LEADER/ADMIN: dùng được cả khu "Tạo ảnh thẻ nhân viên".
 *  - MANAGER: CHỈ vào được tab Thống kê — endpoint /id-photo/history/team-summary mở riêng
 *    cho MANAGER, còn 6 endpoint tạo/lịch sử vẫn trả 403. page.tsx tự ẩn 2 tab kia và ép về
 *    tab "Thống kê" cho MANAGER (xem `statsOnly` ở page.tsx), nên ở đây chỉ cần chặn những ai
 *    không có bất kỳ role liên quan nào.
 *
 * Trước đây khu này còn có IdPhotoSidebar (điều hướng dọc sang 3 route con /history, /stats)
 * và một lớp chặn theo pathname riêng cho MANAGER. Từ khi 3 khu được gộp thành tab ngang trên
 * cùng 1 trang (page.tsx#activeTab, cùng kiểu với khu "Chuyển đổi content"), route con không
 * còn tồn tại nữa nên lớp chặn theo pathname cũng bỏ luôn — chỉ còn đúng 1 lớp gate ở đây.
 *
 * BE mới là chốt chặn thật (403); đây chỉ là lớp UX — ẩn hẳn giao diện thay vì để user thấy
 * trang trắng/lỗi API khi gõ thẳng URL.
 */
export default function IdPhotoLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  // Đang hydrate phiên đăng nhập (dashboard/layout.tsx bên ngoài đã tự lo phần loading toàn
  // trang) — user có thể chưa kịp có ngay tick đầu, chờ 1 nhịp thay vì chớp "không có quyền".
  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-160px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4441cc]" />
      </div>
    );
  }

  const hasAnyAccess =
    user.roles?.some((r) => [UserRole.LEADER, UserRole.ADMIN, UserRole.MANAGER].includes(r)) ?? false;

  if (!hasAnyAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] text-center gap-3">
        <ShieldAlert className="w-10 h-10 text-[#9c9aa8]" />
        <h1 className="text-lg font-bold text-[#1b1b1d]">Bạn không có quyền truy cập tính năng này</h1>
        <p className="text-sm text-[#464554] max-w-sm">
          Tạo ảnh thẻ nhân viên chỉ dành cho Leader và Admin (Manager xem được tab Thống kê). Liên hệ quản
          trị viên nếu bạn cần được cấp quyền.
        </p>
      </div>
    );
  }

  return <div className="text-[#1b1b1d] min-h-[calc(100vh-160px)]">{children}</div>;
}
