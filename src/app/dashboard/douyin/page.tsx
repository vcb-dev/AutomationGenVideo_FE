'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Trang tìm kiếm Douyin real-time (Apify) đã ngừng dùng — chuyển sang bản
// TikHub-based tại /dashboard/externalChannels/douyin.
export default function DouyinScraperPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/externalChannels/douyin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-400">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Đang chuyển tới trang Douyin mới...</span>
      </div>
    </div>
  );
}
