"use client";

import { LeaderContentByClassificationChart } from "../leader/LeaderContentByClassificationChart";
import { LeaderMemberCard } from "../leader/LeaderMemberCard";
import { LeaderProductCategoryChart } from "../leader/LeaderProductCategoryChart";
import { LeaderRevenueTotalCard } from "../leader/LeaderRevenueTotalCard";
import { LeaderTrafficTotalCard } from "../leader/LeaderTrafficTotalCard";
import { LeaderVideoByLineChart } from "../leader/LeaderVideoByLineChart";
import { LeaderVideoMonthCard } from "../leader/LeaderVideoMonthCard";
import type { AdminTeamReport } from "./admin-team-report-api";

interface AdminTeamReportViewProps {
  data: AdminTeamReport | undefined;
  isLoading: boolean;
  isFetching: boolean;
  /** true = tab "Thống kê theo ngày": card video + gauge card thành viên theo kpi_day_* (đúng 1 ngày),
   * bỏ ô "KPI ngày" ở chân card thành viên. */
  dayView: boolean;
  /** Tab tháng: hiện ô "KPI ngày" (hôm nay) trên card thành viên — chỉ khi kỳ đang xem gồm hôm nay. Bỏ qua khi `dayView`. */
  showDailyKpi: boolean;
  /** Nhãn kỳ hiển thị trên card traffic/doanh thu. */
  trafficLabel: string;
  videoCardLabel: string;
}

export function AdminTeamReportView({
  data,
  isLoading,
  isFetching,
  dayView,
  showDailyKpi,
  trafficLabel,
  videoCardLabel,
}: AdminTeamReportViewProps) {
  const rows = data?.rows ?? [];

  // KPI video/target chỉ tổng hợp editor — content creator dùng kpi_completed/kpi_target cho SỐ
  // CONTENT (không phải video), gộp chung sẽ làm sai lệch tổng (khớp cách LeaderDashboard xử lý).
  const totals = rows.reduce(
    (acc, r) => ({
      current:
        acc.current + (r.is_content_creator ? 0 : dayView ? r.kpi_day_completed : r.kpi_completed),
      target: acc.target + (r.is_content_creator ? 0 : dayView ? r.kpi_day_target : r.kpi_target),
      traffic: acc.traffic + r.traffic_month,
      revenue: acc.revenue + r.revenue_month,
    }),
    { current: 0, target: 0, traffic: 0, revenue: 0 },
  );

  return (
    <div className={isFetching ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <LeaderVideoMonthCard current={totals.current} target={totals.target} label={videoCardLabel} />
        <LeaderTrafficTotalCard total={totals.traffic} monthLabel={trafficLabel} />
        <LeaderRevenueTotalCard total={totals.revenue} monthLabel={trafficLabel} />
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
              dayView={dayView}
              showDailyKpi={!dayView && showDailyKpi}
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
        <LeaderContentByClassificationChart data={data?.content_by_classification ?? []} />
      </div>
    </div>
  );
}
