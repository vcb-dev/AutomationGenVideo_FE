"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardFilters } from "../shared/DashboardFilters";
import { LeaderContentByClassificationChart } from "./LeaderContentByClassificationChart";
import { LeaderHeader } from "./LeaderHeader";
import { LeaderMemberCard } from "./LeaderMemberCard";
import { currentMonthKey, LeaderMonthFilter, monthLabelOf } from "./LeaderMonthFilter";
import { LeaderProductCategoryChart } from "./LeaderProductCategoryChart";
import { LeaderRevenueTotalCard } from "./LeaderRevenueTotalCard";
import { LeaderTrafficTotalCard } from "./LeaderTrafficTotalCard";
import { LeaderVideoByLineChart } from "./LeaderVideoByLineChart";
import { LeaderVideoMonthCard } from "./LeaderVideoMonthCard";
import { useLeaderTaskDashboard } from "./leader-task-dashboard-api";

type TabKey = "month" | "day";

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dmy(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function LeaderDashboard() {
  const [tab, setTab] = useState<TabKey>("month");
  const [month, setMonth] = useState(currentMonthKey);
  const [day, setDay] = useState(todayStr);
  const [isCapturing, setIsCapturing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const isDay = tab === "day";
  const { data, isLoading, isFetching } = useLeaderTaskDashboard(
    isDay ? { dateFrom: day, dateTo: day, pinTrafficMonth: true } : { month },
  );
  const members = data?.members ?? [];

  const periodLabel = isDay ? `Ngày ${dmy(day)}` : monthLabelOf(month);
  const trafficLabel = isDay ? `Tháng ${Number(day.split("-")[1])}` : monthLabelOf(month);

  // "Video tháng" chỉ tổng hợp editor — content creator dùng kpi_completed/kpi_target cho SỐ CONTENT
  // (không phải video), gộp chung vào đây sẽ làm sai lệch tổng.
  const videoTotals = members
    .filter((m) => !m.is_content_creator)
    .reduce(
      (acc, m) =>
        isDay
          ? {
              current: acc.current + m.kpi_day_completed,
              target: acc.target + m.kpi_day_target,
            }
          : { current: acc.current + m.kpi_completed, target: acc.target + m.kpi_target },
      { current: 0, target: 0 },
    );
  const videoCardLabel = isDay ? "Số video ngày" : "Số video tháng";

  const trafficTotal = members.reduce((sum, m) => sum + m.traffic_month, 0);
  const revenueTotal = members.reduce((sum, m) => sum + m.revenue_month, 0);

  const handleCapture = async () => {
    if (!reportRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const { toPng } = await import("html-to-image");
      const node = reportRef.current;
      const dataUrl = await toPng(node, {
        backgroundColor: "#f9fafb",
        pixelRatio: 3,
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: { width: `${node.scrollWidth}px`, height: `${node.scrollHeight}px` },
      });
      const teamSlug = (data?.team?.name ?? "team").replace(/[^a-zA-Z0-9]+/g, "-");
      const link = document.createElement("a");
      link.download = `bao-cao-${teamSlug}-${isDay ? day : month}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsCapturing(false);
    }
  };

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex shrink-0 gap-1 rounded-xl border border-amber-200 bg-amber-50 p-1">
          {(
            [
              ["month", "Thống kê theo tháng"],
              ["day", "Thống kê theo ngày"],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === key ? "bg-amber-500 text-white shadow" : "text-amber-800 hover:bg-amber-100",
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleCapture}
          disabled={isCapturing}
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          {isCapturing ? "Đang chụp..." : "Chụp ảnh báo cáo"}
        </button>
      </div>

      <div ref={reportRef} className="bg-gray-50">
        <LeaderHeader teamName={data.team.name} monthLabel={periodLabel} />

        {isDay ? (
          <DashboardFilters
            accent="amber"
            className="justify-center"
            showTeamFallback={false}
            showPlatformChannelFallback={false}
            singleDate={{ value: day, onChange: setDay }}
          />
        ) : (
          <LeaderMonthFilter month={month} onChange={setMonth} />
        )}

        <div className={isFetching ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <LeaderVideoMonthCard
              current={videoTotals.current}
              target={videoTotals.target}
              label={videoCardLabel}
            />
            <LeaderTrafficTotalCard total={trafficTotal} monthLabel={trafficLabel} />
            <LeaderRevenueTotalCard total={revenueTotal} monthLabel={trafficLabel} />
          </div>

          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Team chưa có thành viên.</p>
          ) : (
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {members.map((m, i) => (
                <LeaderMemberCard
                  key={m.user_id}
                  index={i}
                  dayView={isDay}
                  showDailyKpi={!isDay && month === currentMonthKey()}
                  entity={{
                    id: m.user_id,
                    name: m.full_name || m.email,
                    kpi_completed: m.kpi_completed,
                    kpi_target: m.kpi_target,
                    kpi_day_completed: m.kpi_day_completed,
                    kpi_day_target: m.kpi_day_target,
                    traffic_month: m.traffic_month,
                    is_content_creator: m.is_content_creator,
                    content_collected_month: m.content_collected_month,
                    content_original_month: m.content_original_month,
                    content_approved_month: m.content_approved_month,
                  }}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <LeaderVideoByLineChart data={data.video_by_line} />
            </div>
            <LeaderProductCategoryChart data={data.product_by_category} />
            <LeaderContentByClassificationChart data={data.content_by_classification} />
          </div>
        </div>
      </div>
    </div>
  );
}
