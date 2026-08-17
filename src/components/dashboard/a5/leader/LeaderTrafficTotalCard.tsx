"use client";

interface LeaderTrafficTotalCardProps {
  total: number;
  monthLabel: string;
}

export function LeaderTrafficTotalCard({ total, monthLabel }: LeaderTrafficTotalCardProps) {
  return (
    <div className="flex h-full flex-col justify-center rounded-xl border border-sky-100 bg-sky-50 p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Traffic {monthLabel}</div>
      <div className="mt-2 text-4xl font-extrabold text-sky-900">{total.toLocaleString("vi-VN")}</div>
    </div>
  );
}
