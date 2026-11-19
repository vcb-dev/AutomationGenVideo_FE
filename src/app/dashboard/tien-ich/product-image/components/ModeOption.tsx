'use client';

import type { ReactNode } from 'react';

/** Một thẻ chọn "Cách tạo" (tab Ghép background và tab Chị Nhạm cầm SP): biểu tượng, tên, nhãn 0đ/Tính phí, mô tả. */
export function ModeOption({
  active,
  onSelect,
  icon,
  title,
  badge,
  description,
}: {
  active: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  badge: ReactNode;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`w-full text-left rounded-xl border-2 px-3 py-2.5 transition-colors disabled:opacity-50 ${
        active ? 'border-[#4441cc] bg-[#f6f5ff]' : 'border-[#e2e0ea] hover:border-[#c7c4d7]'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-[#1b1b1d]">
        <span className={active ? 'text-[#4441cc]' : 'text-[#9c9aa8]'}>{icon}</span>
        {title}
        <span className="ml-auto">{badge}</span>
      </span>
      <span className="block mt-1 text-xs text-[#464554]">{description}</span>
    </button>
  );
}

/** Nhãn "0đ" xanh của thẻ chọn. */
export function FreeBadge() {
  return (
    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">0đ</span>
  );
}
