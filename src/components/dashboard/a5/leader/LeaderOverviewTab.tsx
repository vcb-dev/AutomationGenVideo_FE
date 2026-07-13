"use client";

import { AdminDonut5A } from "../admin/AdminDonut5A";
import { AdminGrowthBars5AMonthly } from "../admin/AdminGrowthBars5AMonthly";
import { PLATFORM_OPTIONS } from "../admin/admin-platform-channel-data";
import { TEAM_REGION_OPTIONS } from "../admin/admin-team-perf-data";
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
      <Funnel5A variant="leader" stepValues={f.funnelViewLabels} />
      <LeaderMemberTable />
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminDonut5A
          accent="amber"
          slices={f.donutSlices}
          centerTotal={f.totalVideoFiltered}
        />
        <AdminGrowthBars5AMonthly
          accent="amber"
          scaleFactor={f.growthChartScaleFactor}
          filterSummary={f.growthFilterSummary}
        />
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeaderA5TierTable />
        <LeaderHeatmap />
      </div>
    </div>
  );
}
