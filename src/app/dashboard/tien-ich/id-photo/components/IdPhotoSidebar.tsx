'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ImagePlus, History, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard/tien-ich/id-photo', label: 'Tạo ảnh thẻ', icon: ImagePlus },
  { href: '/dashboard/tien-ich/id-photo/history', label: 'Lịch sử', icon: History },
  { href: '/dashboard/tien-ich/id-photo/stats', label: 'Thống kê', icon: BarChart3 },
];

/** Sidebar cục bộ riêng cho khu "Tạo ảnh thẻ nhân viên" — khác header/sidebar chung của
 * dashboard (Header.tsx), theo đúng bố cục mockup Stitch: khối "Tiện ích / Công cụ hỗ trợ"
 * bên trái, luôn hiển thị xuyên suốt 3 trang con (Tạo ảnh thẻ / Lịch sử / Thống kê). */
export function IdPhotoSidebar() {
  const pathname = usePathname() || '';

  return (
    <aside className="w-[260px] flex-none border-r border-[#e2e0ea] pr-4">
      <div className="flex items-center gap-2 px-2 mb-1">
        <span className="w-7 h-7 rounded-lg bg-[#4441cc]/10 flex items-center justify-center text-sm">🪪</span>
        <h2 className="text-lg font-bold text-[#1b1b1d]">Tiện ích</h2>
      </div>
      <p className="text-[11px] text-[#464554] px-2 mb-3">Công cụ hỗ trợ</p>

      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          // So khớp chính xác (không dùng startsWith) — "/id-photo" không được sáng đèn khi
          // đang ở "/id-photo/history" hay ngược lại.
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-[#4441cc] text-white shadow-sm'
                  : 'text-[#464554] hover:bg-[#f6f3f5] hover:text-[#1b1b1d]'
              }`}
            >
              <Icon className="w-4 h-4 flex-none" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
