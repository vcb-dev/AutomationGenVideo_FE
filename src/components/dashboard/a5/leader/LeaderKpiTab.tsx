"use client";

import { ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardFilters } from "../shared/DashboardFilters";
import { LeaderDailyKpiTable } from "./LeaderDailyKpiTable";
import { LeaderGaugeCards } from "./LeaderGaugeCards";
import { useLeaderTaskDashboard } from "./leader-task-dashboard-api";

function calendarMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRangeFromKey(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function LeaderKpiTab() {
  const [kpiMonth, setKpiMonth] = useState(calendarMonthKey);
  const monthLabel = useMemo(() => {
    const [y, m] = kpiMonth.split("-");
    return `tháng ${Number(m)}/${y}`;
  }, [kpiMonth]);

  const range = useMemo(() => monthRangeFromKey(kpiMonth), [kpiMonth]);
  const { data, isLoading } = useLeaderTaskDashboard({ dateFrom: range.from, dateTo: range.to });
  const kpi = data?.kpi;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-start gap-2 text-base font-bold text-amber-900">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <span>
              KPI {monthLabel}:{" "}
              {isLoading ? (
                "đang tải…"
              ) : kpi && kpi.total_target > 0 ? (
                <span className="text-amber-700">
                  {kpi.completed}/{kpi.total_target} video ({Math.round((kpi.completed / kpi.total_target) * 100)}%)
                </span>
              ) : (
                <span className="text-amber-700">chưa có chỉ tiêu KPI trong tháng này</span>
              )}
            </span>
          </div>
          <div className="mt-1 text-sm text-amber-800">Team: {data?.team?.name ?? "—"}</div>
        </div>
      </div>

      <DashboardFilters
        accent="amber"
        className="mb-4"
        showTeamFallback={false}
        showPlatformChannelFallback={false}
        monthPicker={{ value: kpiMonth, onChange: setKpiMonth }}
      />

      <LeaderGaugeCards />
      <LeaderDailyKpiTable />
    </div>
  );
}
