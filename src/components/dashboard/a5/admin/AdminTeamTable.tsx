"use client";

import { BarChart3, Building2 } from "lucide-react";
import { A5NotAvailable } from "../shared/A5NotAvailable";
import { SectionHeading } from "../shared/SectionHeading";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";

function progressBarColor(pct: number) {
  if (pct >= 74) return "bg-blue-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-indigo-400";
}

export function AdminTeamTable() {
  const { teams: rows, teamTotals: T, isLoading, a5Note } = useAdminOverviewFilters();

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <SectionHeading icon={BarChart3} className="mb-1">
        Hiệu suất theo Team
      </SectionHeading>
      <p className="mb-2 text-xs text-gray-500">
        Số người, traffic, doanh thu và tiến độ KPI lấy từ dữ liệu thật (Lark KPI) theo khoảng thời gian đã chọn.
      </p>
      <div className="mb-3">
        <A5NotAvailable note={`Cột A1–A5: ${a5Note}`} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">TEAM</th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">LEADER</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">SỐ NGƯỜI</th>
              <th className="pb-2 text-center text-xs font-bold text-a1">A1</th>
              <th className="pb-2 text-center text-xs font-bold text-a2">A2</th>
              <th className="pb-2 text-center text-xs font-bold text-a3">A3</th>
              <th className="pb-2 text-center text-xs font-bold text-a4">A4</th>
              <th className="pb-2 text-center text-xs font-bold text-a5">A5</th>
              <th className="pb-2 text-center text-xs font-bold text-gray-700">VIDEO</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TRAFFIC</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TIẾN ĐỘ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-400">
                  Đang tải dữ liệu…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500">
                  Không có team khớp bộ lọc.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="py-3 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                      {r.name}
                    </span>
                  </td>
                  <td className="text-left text-gray-600">{r.leaderName ?? "—"}</td>
                  <td className="text-center">{r.staffCount}</td>
                  <td className="text-center text-gray-300">—</td>
                  <td className="text-center text-gray-300">—</td>
                  <td className="text-center text-gray-300">—</td>
                  <td className="text-center text-gray-300">—</td>
                  <td className="text-center text-gray-300">—</td>
                  <td className="text-center font-bold">{r.videoCount}</td>
                  <td className="text-center">{r.traffic > 0 ? r.traffic.toLocaleString("vi-VN") : "—"}</td>
                  <td className="text-center">
                    {r.progressPct == null ? (
                      <span className="text-gray-400">— (chưa có chỉ tiêu)</span>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${progressBarColor(r.progressPct)}`}
                            style={{ width: `${Math.min(100, r.progressPct)}%` }}
                          />
                        </div>
                        {r.progressPct}%
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
            {rows.length > 0 ? (
              <tr className="bg-blue-50 font-bold">
                <td className="py-2.5" colSpan={2}>
                  TỔNG
                </td>
                <td className="text-center">{T.staffCount}</td>
                <td className="text-center text-gray-300" colSpan={5}>
                  —
                </td>
                <td className="text-center">{T.videoCount}</td>
                <td className="text-center">{T.traffic > 0 ? T.traffic.toLocaleString("vi-VN") : "—"}</td>
                <td className="text-center">
                  {T.progressPct == null ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, T.progressPct)}%` }}
                        />
                      </div>
                      {T.progressPct}%
                    </div>
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
