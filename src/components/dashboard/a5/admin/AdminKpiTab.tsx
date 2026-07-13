"use client";

import {
  AlertTriangle,
  Check,
  ClipboardList,
  Download,
  Globe,
  MapPin,
  Pencil,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardFilters } from "../shared/DashboardFilters";
import { TEAM_REGION_OPTIONS } from "./admin-team-perf-data";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";

function calendarMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthVi(ym: string) {
  const [y, m] = ym.split("-");
  return { label: `tháng ${Number(m)}/${y}`, mNum: Number(m), yNum: Number(y) };
}

type A5Vals = [number, number, number, number, number];

const initialTargets: { vn: A5Vals; global: A5Vals } = {
  vn: [90, 75, 75, 45, 15],
  global: [60, 50, 50, 30, 10],
};

export function AdminKpiTab() {
  const f = useAdminOverviewFilters();
  const [kpiMonth, setKpiMonth] = useState(calendarMonthKey);
  const [targets, setTargets] = useState(initialTargets);

  const isCurrentMonth = kpiMonth === calendarMonthKey();
  const monthLabel = useMemo(() => formatMonthVi(kpiMonth), [kpiMonth]);

  const setCell = (team: "vn" | "global", idx: number, raw: string) => {
    const n = Math.max(0, Math.floor(Number.parseInt(raw, 10) || 0));
    setTargets((t) => ({
      ...t,
      [team]: t[team].map((v, i) => (i === idx ? n : v)) as A5Vals,
    }));
  };

  const sum = (a: A5Vals) => a.reduce((s, x) => s + x, 0);
  const colTotals = [0, 1, 2, 3, 4].map(
    (i) => targets.vn[i] + targets.global[i],
  ) as A5Vals;

  const tierText = ["text-a1", "text-a2", "text-a3", "text-a4", "text-a5"] as const;

  const inputClass = (tierIdx: number) =>
    cn(
      "w-[3.25rem] rounded border py-1 text-center text-sm font-bold outline-none tabular-nums",
      tierText[tierIdx],
      isCurrentMonth
        ? "border-gray-200 bg-white focus:border-indigo-400"
        : "cursor-not-allowed border-transparent bg-gray-100 text-gray-800",
    );

  return (
    <div>
      <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center gap-2 text-base font-bold text-indigo-900">
          <ClipboardList className="h-5 w-5 shrink-0 text-indigo-700" aria-hidden />
          Admin giao KPI {monthLabel.label} cho từng Team
        </div>
        <div className="mt-1 text-sm text-indigo-700">
          Phân bổ tổng video theo mô hình 5A → Leader sẽ chia nhỏ cho từng thành viên theo ngày
        </div>
      </div>

      <DashboardFilters
        accent="indigo"
        className="mb-4"
        showPlatformChannelFallback={false}
        monthPicker={{ value: kpiMonth, onChange: setKpiMonth }}
        adminTeamRegion={{
          teamRegionId: f.teamRegionId,
          onTeamRegionIdChange: f.setTeamRegionId,
          options: TEAM_REGION_OPTIONS,
        }}
      />

      {!isCurrentMonth ? (
        <p className="mb-3 text-xs text-gray-500">
          Tháng đã chọn không phải tháng hiện tại — chỉ tiêu KPI chỉ xem, không chỉnh được.
        </p>
      ) : null}

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-base font-bold">
          <Target className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
          Phân bổ KPI video {monthLabel.label} theo Team
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">TEAM</th>
                <th className="pb-2 text-center text-xs font-bold text-a1">A1</th>
                <th className="pb-2 text-center text-xs font-bold text-a2">A2</th>
                <th className="pb-2 text-center text-xs font-bold text-a3">A3</th>
                <th className="pb-2 text-center text-xs font-bold text-a4">A4</th>
                <th className="pb-2 text-center text-xs font-bold text-a5">A5</th>
                <th className="pb-2 text-center text-xs font-bold text-gray-700">TỔNG</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">ĐÃ ĐẠT</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TIẾN ĐỘ</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 bg-amber-50/30">
                <td className="py-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <MapPin className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    Nội dung VN
                  </div>
                  <div className="text-xs text-gray-500">Leader: Trần Thị B · 5 người</div>
                </td>
                {[0, 1, 2, 3, 4].map((i) => (
                  <td key={i} className="text-center">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      readOnly={!isCurrentMonth}
                      value={targets.vn[i]}
                      onChange={(e) => setCell("vn", i, e.target.value)}
                      className={inputClass(i)}
                    />
                    <div className="mt-0.5 text-xs text-gray-500">
                      {i === 0 ? "đạt 72" : i === 1 ? "đạt 57" : i === 2 ? "đạt 37" : i === 3 ? "đạt 26" : "đạt 16"}
                      {i === 2 ? (
                        <AlertTriangle className="ml-0.5 inline h-3.5 w-3.5 text-red-500" aria-hidden />
                      ) : null}
                      {i === 4 ? (
                        <Check className="ml-0.5 inline h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      ) : null}
                    </div>
                  </td>
                ))}
                <td className="text-center font-bold">{sum(targets.vn)}</td>
                <td className="text-center font-semibold">208</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full w-[69%] rounded-full bg-amber-400" />
                    </div>
                    69%
                  </div>
                </td>
                <td className="text-right text-sm font-semibold text-amber-600">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                    Đang thực hiện
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <Globe className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    Toàn cầu
                  </div>
                  <div className="text-xs text-gray-500">Leader: Phạm D · 3 người</div>
                </td>
                {[0, 1, 2, 3, 4].map((i) => (
                  <td key={i} className="text-center">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      readOnly={!isCurrentMonth}
                      value={targets.global[i]}
                      onChange={(e) => setCell("global", i, e.target.value)}
                      className={inputClass(i)}
                    />
                    <div className="mt-0.5 text-xs text-gray-500">
                      {i === 0 ? "đạt 37" : i === 1 ? "đạt 30" : i === 2 ? "đạt 20" : i === 3 ? "đạt 14" : "đạt 8"}
                      {i === 2 ? (
                        <AlertTriangle className="ml-0.5 inline h-3.5 w-3.5 text-red-500" aria-hidden />
                      ) : null}
                    </div>
                  </td>
                ))}
                <td className="text-center font-bold">{sum(targets.global)}</td>
                <td className="text-center font-semibold">109</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full w-[55%] rounded-full bg-red-400" />
                    </div>
                    55%
                  </div>
                </td>
                <td className="text-right text-sm font-semibold text-red-500">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
                    Chậm tiến độ
                  </span>
                </td>
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td className="py-2.5">TỔNG CÔNG TY</td>
                {colTotals.map((v, i) => (
                  <td key={i} className={cn("text-center", tierText[i])}>
                    {v}
                  </td>
                ))}
                <td className="text-center">{sum(targets.vn) + sum(targets.global)}</td>
                <td className="text-center">317</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full w-[63%] rounded-full bg-amber-400" />
                    </div>
                    63%
                  </div>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!isCurrentMonth}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white",
              isCurrentMonth
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "cursor-not-allowed bg-gray-300 text-gray-500",
            )}
          >
            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
            Chỉnh KPI Team
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            Xuất báo cáo
          </button>
        </div>
      </div>
    </div>
  );
}
