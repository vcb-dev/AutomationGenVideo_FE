'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { canManageCatalog } from '@/lib/equipment/catalog-permissions';

/**
 * Chốt quyền cho các màn điều phối kho: Duyệt phiếu, Chuẩn bị, Bàn giao, Nhận trả, Nhật ký.
 *
 * Ẩn đầu mục trên thanh điều hướng là chưa đủ — gõ thẳng địa chỉ vẫn vào được trang. Cửa canh
 * thật nằm ở `MemsMediaLeaderGuard` phía BE; chỗ này để người không có quyền đọc được một câu
 * giải thích thay vì một màn hình trống kèm vài thông báo lỗi đỏ.
 *
 * Trong lúc hồ sơ chưa nạp xong thì KHÔNG kết luận là thiếu quyền: hiện lời từ chối rồi đổi ý
 * ngay sau đó trông như hệ thống hỏng.
 */
export function RequireCatalogManager({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading || !user) {
    return (
      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Đang tải…</div>
    );
  }

  if (!canManageCatalog(user.roles, user.team)) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
          <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            Màn hình này dành cho người quản lý kho
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Chỉ Leader hoặc Manager của Team Media và Admin mới điều phối được phiếu mượn thiết
            bị. Nếu bạn cần mượn máy, hãy tạo phiếu ở màn Kho thiết bị.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/dashboard/equipment"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Về Kho thiết bị
            </Link>
            <Link
              href="/dashboard/equipment/new-request"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/[0.12] dark:text-slate-200 dark:hover:bg-white/[0.04]"
            >
              Tạo phiếu mượn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
