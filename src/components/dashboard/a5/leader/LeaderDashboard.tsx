"use client";

import { useState } from "react";
import { LeaderHeader } from "./LeaderHeader";
import { LeaderMemberCard } from "./LeaderMemberCard";
import { currentMonthKey, LeaderMonthFilter, monthLabelOf } from "./LeaderMonthFilter";
import { LeaderRevenueTotalCard } from "./LeaderRevenueTotalCard";
import { LeaderTrafficTotalCard } from "./LeaderTrafficTotalCard";
import { LeaderVideoByLineChart } from "./LeaderVideoByLineChart";
import { LeaderVideoMonthCard } from "./LeaderVideoMonthCard";
import { useLeaderTaskDashboard } from "./leader-task-dashboard-api";

export function LeaderDashboard() {
  const [month, setMonth] = useState(currentMonthKey);
  const { data, isLoading, isFetching } = useLeaderTaskDashboard({ month });
  const members = data?.members ?? [];
  const isCurrentMonth = month === currentMonthKey();
  const monthLabel = monthLabelOf(month);

  const videoTotals = members.reduce(
    (acc, m) => ({ current: acc.current + m.kpi_completed, target: acc.target + m.kpi_target }),
    { current: 0, target: 0 },
  );
  const trafficTotal = members.reduce((sum, m) => sum + m.traffic_month, 0);
  const revenueTotal = members.reduce((sum, m) => sum + m.revenue_month, 0);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!data?.team) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Bạn chưa được gán làm leader của team nào, hoặc team chưa có thành viên.
      </div>
    );
  }

  return (
    <div className="w-full max-w-none p-4 text-sm text-gray-900 antialiased">
      <LeaderHeader teamName={data.team.name} monthLabel={monthLabel} />

      <LeaderMonthFilter month={month} onChange={setMonth} />

      <div className={isFetching ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <LeaderVideoMonthCard current={videoTotals.current} target={videoTotals.target} />
          <LeaderTrafficTotalCard total={trafficTotal} monthLabel={monthLabel} />
          <LeaderRevenueTotalCard total={revenueTotal} monthLabel={monthLabel} />
        </div>

        {members.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Team chưa có thành viên.</p>
        ) : (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {members.map((m, i) => (
              <LeaderMemberCard
                key={m.user_id}
                index={i}
                showDailyKpi={isCurrentMonth}
                entity={{
                  id: m.user_id,
                  name: m.full_name || m.email,
                  kpi_completed: m.kpi_completed,
                  kpi_target: m.kpi_target,
                  kpi_day_completed: m.kpi_day_completed,
                  kpi_day_target: m.kpi_day_target,
                  traffic_month: m.traffic_month,
                }}
              />
            ))}
          </div>
        )}

        <LeaderVideoByLineChart data={data.video_by_line} />
      </div>
    </div>
  );
}
