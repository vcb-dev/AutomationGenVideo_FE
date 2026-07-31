"use client";

interface LeaderRevenueTotalCardProps {
  total: number;
  monthLabel: string;
}

/** Tổng doanh thu tự báo cáo hằng ngày (RevenueReport), cộng dồn trong kỳ đã chọn — chưa có KPI/mục tiêu. */
export function LeaderRevenueTotalCard({ total, monthLabel }: LeaderRevenueTotalCardProps) {
  return (
    <div className="flex h-full flex-col justify-center rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Doanh thu {monthLabel}</div>
      <div className="mt-2 text-4xl font-extrabold text-emerald-900">
        {total.toLocaleString("vi-VN")}
        <span className="ml-1 text-lg font-semibold text-emerald-700">đ</span>
      </div>
    </div>
  );
}
