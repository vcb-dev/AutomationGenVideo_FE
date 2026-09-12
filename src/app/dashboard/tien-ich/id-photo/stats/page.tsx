'use client';

import { BarChart3 } from 'lucide-react';

/**
 * Chưa có endpoint BE cho thống kê ảnh thẻ (6 endpoint hiện có chỉ phục vụ luồng tạo + lịch
 * sử) — để "Sắp ra mắt" thay vì tự bịa số liệu giả từ GET /id-photo/history.
 */
export default function IdPhotoStatsPage() {
  return (
    <div className="text-[#1b1b1d]">
      <header className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Thống kê</h1>
        <p className="text-[#464554] text-sm mt-0.5">Số liệu tổng hợp về ảnh thẻ đã tạo.</p>
      </header>

      <div className="border border-[#e2e0ea] rounded-2xl bg-white p-16 flex flex-col items-center justify-center text-center gap-2">
        <BarChart3 className="w-8 h-8 text-[#c7c4d7]" />
        <p className="text-sm font-semibold text-[#1b1b1d]">Sắp ra mắt</p>
        <p className="text-xs text-[#9c9aa8] max-w-sm">
          Trang thống kê ảnh thẻ theo team, vị trí và thời gian đang được phát triển.
        </p>
      </div>
    </div>
  );
}
