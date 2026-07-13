"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3, Building2, MapPin, MapPinned } from "lucide-react";
import { SectionHeading } from "../shared/SectionHeading";
import type { AdminTeamRegionId } from "./admin-team-perf-data";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";

const REGION_ICONS: Record<AdminTeamRegionId, LucideIcon> = {
  vietnam: MapPin,
  japan: Building2,
  taiwan: MapPinned,
};

function progressBarColor(pct: number) {
  if (pct >= 74) return "bg-blue-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-indigo-400";
}

export function AdminTeamTable() {
  const { teamPerfRows: rows, teamPerfTotals: T } = useAdminOverviewFilters();

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <SectionHeading icon={BarChart3} className="mb-1">
        Hiệu suất theo Team
      </SectionHeading>
      <p className="mb-3 text-xs text-gray-500">
        Số liệu A1–A5 và traffic được tỉ lệ hoá theo video trong phạm vi Team + nền tảng + kênh đã
        chọn. Chọn &quot;Tất cả&quot; để xem đủ theo team.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">TEAM</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">SỐ NGƯỜI</th>
              <th className="pb-2 text-center text-xs font-bold text-a1">A1</th>
              <th className="pb-2 text-center text-xs font-bold text-a2">A2</th>
              <th className="pb-2 text-center text-xs font-bold text-a3">A3</th>
              <th className="pb-2 text-center text-xs font-bold text-a4">A4</th>
              <th className="pb-2 text-center text-xs font-bold text-a5">A5</th>
              <th className="pb-2 text-center text-xs font-bold text-gray-700">TỔNG</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TRAFFIC</th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TIẾN ĐỘ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-500">
                  Không có team khớp bộ lọc.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const Icon = REGION_ICONS[r.id];
                const sum = r.a1 + r.a2 + r.a3 + r.a4 + r.a5;
                return (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-3 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                        {r.label}
                      </span>
                    </td>
                    <td className="text-center">{r.staff}</td>
                    <td className="text-center font-semibold text-a1">{r.a1}</td>
                    <td className="text-center text-a2">{r.a2}</td>
                    <td className="text-center text-a3">{r.a3}</td>
                    <td className="text-center text-a4">{r.a4}</td>
                    <td className="text-center text-a5">{r.a5}</td>
                    <td className="text-center font-bold">{sum}</td>
                    <td className="text-center">{r.trafficLabel}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${progressBarColor(r.progressPct)}`}
                            style={{ width: `${r.progressPct}%` }}
                          />
                        </div>
                        {r.progressPct}%
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {rows.length > 0 ? (
              <tr className="bg-blue-50 font-bold">
                <td className="py-2.5">TỔNG</td>
                <td className="text-center">{T.staff}</td>
                <td className="text-center text-a1">{T.a1}</td>
                <td className="text-center text-a2">{T.a2}</td>
                <td className="text-center text-a3">{T.a3}</td>
                <td className="text-center text-a4">{T.a4}</td>
                <td className="text-center text-a5">{T.a5}</td>
                <td className="text-center">{T.total5}</td>
                <td className="text-center">{T.trafficLabel}</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${T.progressPct}%` }}
                      />
                    </div>
                    {T.progressPct}%
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
