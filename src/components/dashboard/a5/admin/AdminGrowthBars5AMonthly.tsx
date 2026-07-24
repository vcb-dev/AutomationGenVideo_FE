"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { A5NotAvailable } from "../shared/A5NotAvailable";

interface AdminGrowthBars5AMonthlyProps {
  note: string;
  className?: string;
  accent?: "indigo" | "amber";
}

export function AdminGrowthBars5AMonthly({ note, className, accent = "indigo" }: AdminGrowthBars5AMonthlyProps) {
  const iconAccent = accent === "amber" ? "text-amber-600" : "text-indigo-600";

  return (
    <div className={cn("rounded-xl border border-gray-100 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center gap-2 text-base font-bold">
        <LineChartIcon className={cn("h-5 w-5 shrink-0", iconAccent)} aria-hidden />
        Tăng trưởng 5A theo tháng
      </div>
      <div className="mb-3">
        <A5NotAvailable note={note} />
      </div>
      <div className="flex h-[220px] w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-300">
        Chưa có dữ liệu
      </div>
    </div>
  );
}
