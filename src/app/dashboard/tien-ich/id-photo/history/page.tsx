'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route cũ /dashboard/tien-ich/id-photo/history — trước là 1 trang riêng điều hướng qua
 * IdPhotoSidebar (xem git history), nay nội dung đã gộp thành tab "Lịch sử" ngay trên trang
 * chính (page.tsx#activeTab, components/HistoryTab.tsx). Giữ route này lại làm chỗ đáp cho
 * link/bookmark cũ, tự bắn sang trang chính đúng tab thay vì để 404.
 */
export default function IdPhotoHistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/tien-ich/id-photo?tab=history');
  }, [router]);

  return <div className="flex items-center justify-center h-[calc(100vh-160px)]" />;
}
