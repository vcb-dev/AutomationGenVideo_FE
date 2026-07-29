"use client";

import { AdminDonut5A } from "../admin/AdminDonut5A";
import { AdminGrowthBars5AMonthly } from "../admin/AdminGrowthBars5AMonthly";
import { useAdminOverviewFilters } from "../admin/AdminOverviewFiltersContext";
import { DashboardFilters } from "../shared/DashboardFilters";
import { Funnel5A } from "../shared/Funnel5A";
import { KpiTripleCards } from "../shared/KpiTripleCards";
import { LeaderA5TierTable } from "./LeaderA5TierTable";
import { LeaderHeatmap } from "./LeaderHeatmap";
import { LeaderMemberTable } from "./LeaderMemberTable";

export function LeaderOverviewTab() {
  const f = useAdminOverviewFilters();

  return (
    <div>
      <DashboardFilters
        accent="amber"
        showDateRange
        defaultDateFrom={f.dateFrom}
        defaultDateTo={f.dateTo}
        onDateRangeChange={(r) => f.setDateRange(r.from, r.to)}
        showTeamFallback={false}
        showPlatformChannelFallback={false}
      />
      <KpiTripleCards
        trafficLabel={f.kpiTrafficLabel}
        revenueLabel={f.kpiRevenueLabel}
        videoTotal={f.videoTotal}
        progressPct={f.kpiProgressPct}
        syncNote={f.kpiSyncNote}
        isLoading={f.isLoading}
      />
      <Funnel5A variant="leader" note={f.a5Note} />
      <LeaderMemberTable />
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminDonut5A accent="amber" note={f.a5Note} />
        <AdminGrowthBars5AMonthly accent="amber" note={f.a5Note} />
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeaderA5TierTable />
        <LeaderHeatmap />
      </div>
    </div>
  );
}
