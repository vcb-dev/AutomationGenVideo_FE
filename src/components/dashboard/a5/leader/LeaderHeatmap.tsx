"use client";

import { Grid3x3, Info } from "lucide-react";
import { useMemo } from "react";
import { useAdminOverviewFilters } from "../admin/AdminOverviewFiltersContext";

const ROWS_BASE = [
  { w: "Tuần 1", cells: [18, 14, 8, 5, 3] },
  { w: "Tuần 2", cells: [22, 16, 10, 7, 4] },
  { w: "Tuần 3", cells: [26, 20, 12, 9, 5] },
  { w: "Tuần 4", cells: [23, 23, 14, 12, 6] },
];

const CELL_CLASS: [string, string, string, string, string][] = [
  ["bg-pink-100 text-a1", "bg-blue-100 text-a2", "bg-gray-100", "bg-gray-100", "bg-gray-100"],
  ["bg-pink-200 text-a1", "bg-blue-100 text-a2", "bg-emerald-100 text-a3", "bg-gray-100", "bg-gray-100"],
  ["bg-pink-200 text-a1", "bg-blue-200 text-a2", "bg-emerald-100 text-a3", "bg-amber-100 text-a4", "bg-purple-100 text-a5"],
  ["bg-pink-300 text-white", "bg-blue-200 text-a2", "bg-emerald-200 text-a3", "bg-amber-100 text-a4", "bg-purple-100 text-a5"],
];

export function LeaderHeatmap() {
  const { growthChartScaleFactor: sf } = useAdminOverviewFilters();

  const rows = useMemo(
    () =>
      ROWS_BASE.map((row) => ({
        w: row.w,
        cells: row.cells.map((c) => String(Math.max(0, Math.round(c * sf)))),
      })),
    [sf],
  );

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-base font-bold">
        <Grid3x3 className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        Heatmap sản xuất 4 tuần
      </div>
      <p className="mb-3 text-xs text-gray-500">Ô số theo tỉ lệ bộ lọc hiện tại.</p>
      <table className="w-full text-center text-sm">
        <thead>
          <tr>
            <th className="pb-2 text-left text-xs text-gray-500" />
            <th className="pb-2 text-xs font-bold text-a1">A1</th>
            <th className="pb-2 text-xs font-bold text-a2">A2</th>
            <th className="pb-2 text-xs font-bold text-a3">A3</th>
            <th className="pb-2 text-xs font-bold text-a4">A4</th>
            <th className="pb-2 text-xs font-bold text-a5">A5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.w}>
              <td className="py-2 text-left text-xs text-gray-500">{row.w}</td>
              {row.cells.map((c, ci) => (
                <td key={ci}>
                  <span
                    className={`inline-flex min-w-[2.5rem] justify-center rounded px-1 py-2 text-sm font-bold ${CELL_CLASS[ri][ci]}`}
                  >
                    {c}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Màu đậm = sản lượng cao hơn
      </div>
    </div>
  );
}
