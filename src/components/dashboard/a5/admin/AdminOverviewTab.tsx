"use client";

import { DashboardFilters } from "../shared/DashboardFilters";
import { LeaderContentFreshnessChart } from "../leader/LeaderContentFreshnessChart";
import { LeaderMemberCard } from "../leader/LeaderMemberCard";
import { LeaderProductCategoryChart } from "../leader/LeaderProductCategoryChart";
import { LeaderRevenueTotalCard } from "../leader/LeaderRevenueTotalCard";
import { LeaderTrafficTotalCard } from "../leader/LeaderTrafficTotalCard";
import { LeaderVideoByLineChart } from "../leader/LeaderVideoByLineChart";
import { LeaderVideoMonthCard } from "../leader/LeaderVideoMonthCard";
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

  const rows = data?.rows ?? [];
  const isAllTeams = f.teamFilter === "all";
  // "KPI ngày" (hôm nay) chỉ có ý nghĩa khi khoảng ngày đang chọn có bao gồm ngày hôm nay.
  const today = todayStr();
  const showDailyKpi = f.dateFrom <= today && today <= f.dateTo;

  // KPI video/target chỉ tổng hợp editor — content creator dùng kpi_completed/kpi_target cho SỐ
  // CONTENT (không phải video), gộp chung vào đây sẽ làm sai lệch tổng (khớp cách LeaderDashboard xử lý).
  const totals = rows.reduce(
    (acc, r) => ({
      current: acc.current + (r.is_content_creator ? 0 : r.kpi_completed),
      target: acc.target + (r.is_content_creator ? 0 : r.kpi_target),
      traffic: acc.traffic + r.traffic_month,
      revenue: acc.revenue + r.revenue_month,
      contentNew: acc.contentNew + r.content_new,
      contentOld: acc.contentOld + r.content_old,
    }),
    { current: 0, target: 0, traffic: 0, revenue: 0, contentNew: 0, contentOld: 0 },
  );

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

      <div className={isFetching ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <LeaderVideoMonthCard current={totals.current} target={totals.target} />
          <LeaderTrafficTotalCard total={totals.traffic} monthLabel={periodLabel} />
          <LeaderRevenueTotalCard total={totals.revenue} monthLabel={periodLabel} />
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-400">Đang tải dữ liệu…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Không có dữ liệu trong kỳ đã chọn.</p>
        ) : (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {rows.map((r, i) => (
              <LeaderMemberCard
                key={r.id}
                index={i}
                showDailyKpi={showDailyKpi}
                entity={{
                  id: r.id,
                  name: r.name,
                  kpi_completed: r.kpi_completed,
                  kpi_target: r.kpi_target,
                  kpi_day_completed: r.kpi_day_completed,
                  kpi_day_target: r.kpi_day_target,
                  traffic_month: r.traffic_month,
                  is_content_creator: r.is_content_creator,
                  content_collected_month: r.content_collected_month,
                  content_original_month: r.content_original_month,
                  content_approved_month: r.content_approved_month,
                }}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <LeaderVideoByLineChart data={data?.video_by_line ?? []} />
          </div>
          <LeaderProductCategoryChart data={data?.product_by_category ?? []} />
          <LeaderContentFreshnessChart data={{ new: totals.contentNew, old: totals.contentOld }} />
        </div>
      </div>
    </div>
  );
}
