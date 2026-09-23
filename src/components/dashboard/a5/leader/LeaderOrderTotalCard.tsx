"use client";

import { Package } from "lucide-react";

interface LeaderOrderTotalCardProps {
  total: number;
  monthLabel: string;
}

/** Tổng số đơn hàng thực tế từ Sapo theo kỳ đã chọn. */
export function LeaderOrderTotalCard({ total, monthLabel }: LeaderOrderTotalCardProps) {
  return (
    <div className="flex h-full flex-col justify-center rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Tổng số đơn {monthLabel}</div>
        <Package className="h-4 w-4 text-amber-600/70" />
      </div>
      <div className="mt-2 text-4xl font-extrabold text-amber-900">
        {total.toLocaleString("vi-VN")}
        <span className="ml-1.5 text-lg font-semibold text-amber-700">đơn</span>
      </div>
    </div>
  );
}
