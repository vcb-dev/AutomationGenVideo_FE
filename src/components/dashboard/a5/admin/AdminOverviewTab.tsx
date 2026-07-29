"use client";

import { DashboardFilters } from "../shared/DashboardFilters";
import { Funnel5A } from "../shared/Funnel5A";
import { KpiTripleCards } from "../shared/KpiTripleCards";
import { AdminDonut5A } from "./AdminDonut5A";
import { AdminGrowthBars5AMonthly } from "./AdminGrowthBars5AMonthly";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";
import { AdminPlatformTable } from "./AdminPlatformTable";
import { AdminTeamTable } from "./AdminTeamTable";

export function AdminOverviewTab() {
  const f = useAdminOverviewFilters();

  return (
    <div>
      <DashboardFilters
        accent="indigo"
        showDateRange
        defaultDateFrom={f.dateFrom}
        defaultDateTo={f.dateTo}
        onDateRangeChange={(r) => f.setDateRange(r.from, r.to)}
        showPlatformChannelFallback={false}
        adminTeamRegion={{
          teamRegionId: f.teamFilter,
          onTeamRegionIdChange: f.setTeamFilter,
          options: f.teamOptions,
        }}
      />
      <KpiTripleCards
        trafficLabel={f.kpiTrafficLabel}
        revenueLabel={f.kpiRevenueLabel}
        videoTotal={f.videoTotal}
        progressPct={f.kpiProgressPct}
        syncNote={f.kpiSyncNote}
        isLoading={f.isLoading}
      />
      <Funnel5A variant="admin" note={f.a5Note} />
      <AdminTeamTable />
      <AdminPlatformTable />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <AdminDonut5A note={f.a5Note} />
        <AdminGrowthBars5AMonthly note={f.a5Note} />
      </div>
    </div>
  );
}
