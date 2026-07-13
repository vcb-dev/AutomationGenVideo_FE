"use client";

import { CalendarDays, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardFilters } from "../shared/DashboardFilters";
import { LeaderDailyKpiTable } from "./LeaderDailyKpiTable";
import { LeaderGaugeCards } from "./LeaderGaugeCards";

function calendarMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function LeaderKpiTab() {
  const [kpiMonth, setKpiMonth] = useState(calendarMonthKey);

  const monthLabel = useMemo(() => {
    const [y, m] = kpiMonth.split("-");
    return `tháng ${Number(m)}/${y}`;
  }, [kpiMonth]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-start gap-2 text-base font-bold text-amber-900">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <span>
              KPI {monthLabel} từ Admin: <span className="text-amber-700">300 video</span> (A1:90 · A2:75 · A3:75 ·
              A4:45 · A5:15)
            </span>
          </div>
          <div className="mt-1 text-sm text-amber-800">
            Chia nhỏ KPI theo ngày cho từng thành viên · 23 ngày làm việc
          </div>
        </div>
        <span className="inline-flex items-center gap-1 self-start rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-800 sm:self-center">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Còn 8 ngày
        </span>
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
