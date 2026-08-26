'use client';

import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { ShieldAlert } from 'lucide-react';
import { IdPhotoSidebar } from './components/IdPhotoSidebar';

/**
 * Guard hiển thị ở tầng route: chỉ LEADER/ADMIN được vào khu "Tạo ảnh thẻ nhân viên" — khớp
 * đúng @Roles(UserRole.LEADER, UserRole.ADMIN) ở IdPhotoController bên BE. BE đã chặn ở API
 * (403) nên đây chỉ là lớp UX — ẩn hẳn giao diện thay vì để user thấy trang trắng/lỗi API
 * khi gõ thẳng URL, không phải lớp bảo mật thật.
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

  const isAuthorized = user.roles?.some((r) => [UserRole.LEADER, UserRole.ADMIN].includes(r));
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] text-center gap-3">
        <ShieldAlert className="w-10 h-10 text-[#9c9aa8]" />
        <h1 className="text-lg font-bold text-[#1b1b1d]">Bạn không có quyền truy cập tính năng này</h1>
        <p className="text-sm text-[#464554] max-w-sm">
          Tạo ảnh thẻ nhân viên chỉ dành cho Leader và Admin. Liên hệ quản trị viên nếu bạn cần được cấp quyền.
        </p>
      </div>
    );
  }

  return (
    <div className="text-[#1b1b1d] flex gap-6 min-h-[calc(100vh-160px)]">
      <IdPhotoSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
