"use client";

import { DashboardFilters } from "../shared/DashboardFilters";
import { AdminTeamReportView } from "./AdminTeamReportView";
import { useAdminTeamReport } from "./admin-team-report-api";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AdminOverviewTab() {
  const f = useAdminOverviewFilters();
  const { data, isLoading, isFetching } = useAdminTeamReport({
    team: f.teamFilter,
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
  });

  const isAllTeams = f.teamFilter === "all";
  // "KPI ngày" (hôm nay) chỉ có ý nghĩa khi khoảng ngày đang chọn có bao gồm ngày hôm nay.
  const today = todayStr();
  const showDailyKpi = f.dateFrom <= today && today <= f.dateTo;

  const periodLabel = !isAllTeams && data?.team ? data.team.name : "Toàn công ty";

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

      <AdminTeamReportView
        data={data}
        isLoading={isLoading}
        isFetching={isFetching}
        dayView={false}
        showDailyKpi={showDailyKpi}
        trafficLabel={periodLabel}
        videoCardLabel="Số video tháng"
      />
    </div>
  );
}
