"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentMonthKey(d);
}

export function monthLabelOf(monthKey: string) {
  const [, m] = monthKey.split("-");
  return `Tháng ${Number(m)}`;
}

interface LeaderMonthFilterProps {
  month: string;
  onChange: (month: string) => void;
}

/** Bộ lọc tháng cho báo cáo leader — không cho chọn tới tháng tương lai (chưa có dữ liệu). */
export function LeaderMonthFilter({ month, onChange }: LeaderMonthFilterProps) {
  const atLatest = month >= currentMonthKey();
  const [y, m] = month.split("-");

  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(shiftMonthKey(month, -1))}
        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50"
        aria-label="Tháng trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[120px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-center text-sm font-semibold text-gray-700">
        Tháng {Number(m)}/{y}
      </span>
      <button
        type="button"
        onClick={() => !atLatest && onChange(shiftMonthKey(month, 1))}
        disabled={atLatest}
        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Tháng sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
