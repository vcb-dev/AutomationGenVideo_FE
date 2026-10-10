'use client'

import { WinVideosGrid } from '@/components/task-auto/WinVideosGrid'

export default function ContentPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">Video nổi bật trên Facebook</h1>
        <p className="text-slate-500 text-base mt-1">
          Toàn bộ video trên trang Facebook nội bộ đạt từ 10K lượt xem — lọc theo team, kênh, tuyến nội dung và thị trường
        </p>
      </div>

      <WinVideosGrid />
    </div>
  )
}
