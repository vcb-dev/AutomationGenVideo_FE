"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import { A5NotAvailable } from "../shared/A5NotAvailable";

interface AdminDonut5AProps {
  note: string;
  accent?: "indigo" | "amber";
}

export function AdminDonut5A({ note, accent = "indigo" }: AdminDonut5AProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-base font-bold">
        <PieChartIcon
          className={accent === "amber" ? "h-5 w-5 shrink-0 text-amber-600" : "h-5 w-5 shrink-0 text-gray-600"}
          aria-hidden
        />
        Phân bổ 5A
        <span className="text-xs font-normal text-gray-500"> (theo Team &amp; kênh)</span>
      </div>
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-full border-[10px] border-dashed border-gray-200 text-gray-300">
          <span className="text-sm font-semibold">—</span>
        </div>
        <A5NotAvailable note={note} />
      </div>
    </div>
  );
}
