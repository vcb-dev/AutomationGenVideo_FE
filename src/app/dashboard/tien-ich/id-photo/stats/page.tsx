'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route cũ /dashboard/tien-ich/id-photo/stats — trước là 1 trang riêng điều hướng qua
 * IdPhotoSidebar (xem git history), nay nội dung đã gộp thành tab "Thống kê" ngay trên trang
 * chính (page.tsx#activeTab, components/StatsTab.tsx). Giữ route này lại làm chỗ đáp cho
 * link/bookmark cũ (kể cả link menu header dành cho Manager, dùng query ?tab=stats mới), tự
 * bắn sang trang chính đúng tab thay vì để 404.
 */
export default function IdPhotoStatsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/tien-ich/id-photo?tab=stats');
  }, [router]);

  return <div className="flex items-center justify-center h-[calc(100vh-160px)]" />;
}
