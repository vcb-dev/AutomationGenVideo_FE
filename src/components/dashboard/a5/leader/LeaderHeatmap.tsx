"use client";

import { Grid3x3 } from "lucide-react";
import { A5NotAvailable } from "../shared/A5NotAvailable";

const WEEKS = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
const TIERS = ["A1", "A2", "A3", "A4", "A5"];

export function LeaderHeatmap() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-base font-bold">
        <Grid3x3 className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        Heatmap sản xuất 4 tuần
      </div>
      <A5NotAvailable note="Hệ thống chưa phân loại video theo mô hình 5A (A1-A5) — chưa có dữ liệu thật để hiển thị." />
      <table className="mt-3 w-full text-center text-sm">
        <thead>
          <tr>
            <th className="pb-2 text-left text-xs text-gray-500" />
            {TIERS.map((t) => (
              <th key={t} className="pb-2 text-xs font-bold text-gray-300">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKS.map((w) => (
            <tr key={w}>
              <td className="py-2 text-left text-xs text-gray-500">{w}</td>
              {TIERS.map((t) => (
                <td key={t}>
                  <span className="inline-flex min-w-[2.5rem] justify-center rounded bg-gray-50 px-1 py-2 text-sm font-bold text-gray-300">
                    —
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
