"use client";

import { BarChart3 } from "lucide-react";
import { A5NotAvailable } from "../shared/A5NotAvailable";

const TIERS = ["A1", "A2", "A3", "A4", "A5"] as const;
const TIER_CLASS: Record<(typeof TIERS)[number], string> = {
  A1: "text-a1",
  A2: "text-a2",
  A3: "text-a3",
  A4: "text-a4",
  A5: "text-a5",
};

export function LeaderA5TierTable() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-base font-bold">
        <BarChart3 className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        Hiệu suất 5A — Team
      </div>
      <A5NotAvailable note="Hệ thống chưa phân loại video theo mô hình 5A (A1-A5) — chưa có dữ liệu thật để hiển thị." />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">TẦNG</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">VIDEO</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TRAFFIC</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => (
              <tr key={t} className="border-b border-gray-50">
                <td className={`py-2 font-bold ${TIER_CLASS[t]}`}>{t}</td>
                <td className="text-center text-gray-300">—</td>
                <td className="text-center text-gray-300">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
