"use client";

import { DashboardFilters } from "../shared/DashboardFilters";
import { Funnel5A } from "../shared/Funnel5A";
import { KpiTripleCards } from "../shared/KpiTripleCards";
import { PLATFORM_OPTIONS } from "./admin-platform-channel-data";
import { TEAM_REGION_OPTIONS } from "./admin-team-perf-data";
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
        adminTeamRegion={{
          teamRegionId: f.teamRegionId,
          onTeamRegionIdChange: f.setTeamRegionId,
          options: TEAM_REGION_OPTIONS,
        }}
        adminPlatformChannel={{
          platformId: f.platformId,
          onPlatformIdChange: f.setPlatformId,
          channelKey: f.channelKey,
          onChannelKeyChange: f.setChannelKey,
          platformOptions: PLATFORM_OPTIONS,
          channelOptions: f.channelSelectOptions,
        }}
      />
      <KpiTripleCards
        trafficLabel={f.kpiTrafficLabel}
        trafficVsPrevPct={f.kpiVsPrevPct}
        revenueLabel={f.kpiRevenueLabel}
        revenueVsPrevPct={f.kpiVsPrevPct}
        videoTotal={f.totalVideoFiltered}
        newVideosEst={f.kpiNewVideosEst}
      />
      <Funnel5A variant="admin" stepValues={f.funnelViewLabels} />
      <AdminTeamTable />
      <AdminPlatformTable />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <AdminDonut5A slices={f.donutSlices} centerTotal={f.totalVideoFiltered} />
        <AdminGrowthBars5AMonthly
          scaleFactor={f.growthChartScaleFactor}
          filterSummary={f.growthFilterSummary}
        />
      </div>
    </div>
  );
}
