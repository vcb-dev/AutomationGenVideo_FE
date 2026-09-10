"use client";

import { useState } from "react";
import { DashboardFilters } from "../shared/DashboardFilters";
import { AdminTeamReportView } from "./AdminTeamReportView";
import { useAdminTeamReport } from "./admin-team-report-api";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dmy(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Tab "Thống kê theo ngày" của admin — cùng báo cáo với tab Tổng quan nhưng xem đúng 1 NGÀY: card
 * video + gauge card thành viên theo KPI ngày, traffic/doanh thu vẫn giữ theo THÁNG (pin_traffic_month).
 * Bộ lọc team dùng chung state với tab Tổng quan; ngày là state riêng để 2 tab không đè lên nhau.
 */
export function AdminDailyTab() {
  const f = useAdminOverviewFilters();
  const [day, setDay] = useState(todayStr);

  const { data, isLoading, isFetching } = useAdminTeamReport({
    team: f.teamFilter,
    dateFrom: day,
    dateTo: day,
    pinTrafficMonth: true,
  });

  const isAllTeams = f.teamFilter === "all";
  const teamLabel = !isAllTeams && data?.team ? data.team.name : "Toàn công ty";

  return (
    <div>
      <DashboardFilters
        accent="indigo"
        singleDate={{ value: day, onChange: setDay }}
        showPlatformChannelFallback={false}
        adminTeamRegion={{
          teamRegionId: f.teamFilter,
          onTeamRegionIdChange: f.setTeamFilter,
          options: f.teamOptions,
        }}
      />

      <p className="mb-3 text-xs text-gray-500">
        {teamLabel} · Ngày {dmy(day)} · traffic &amp; doanh thu tính theo tháng
      </p>

      <AdminTeamReportView
        data={data}
        isLoading={isLoading}
        isFetching={isFetching}
        dayView
        showDailyKpi={false}
        trafficLabel={`Tháng ${Number(day.split("-")[1])}`}
        videoCardLabel="Số video ngày"
      />
    </div>
  );
}
