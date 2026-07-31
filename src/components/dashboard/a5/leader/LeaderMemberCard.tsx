"use client";

import { cn } from "@/lib/utils";
import type { LeaderDashboardMember } from "./leader-task-dashboard-api";
import { LeaderGaugeRing } from "./LeaderGaugeRing";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

// Cố định theo thứ tự thành viên (không phải theo % hiệu suất) — chỉ để phân biệt trực quan giữa
// các card, không mang ý nghĩa trạng thái (trạng thái đã có viền màu riêng theo % video tháng).
const AVATAR_COLORS = ["bg-amber-500", "bg-sky-500", "bg-violet-500", "bg-rose-500", "bg-emerald-500", "bg-indigo-500"];

function statusAccent(pct: number | null) {
  if (pct == null) return "border-t-gray-200";
  if (pct >= 100) return "border-t-emerald-400";
  if (pct >= 70) return "border-t-indigo-400";
  if (pct >= 40) return "border-t-amber-400";
  return "border-t-red-400";
}

interface LeaderMemberCardProps {
  member: LeaderDashboardMember;
  index: number;
  /** "KPI ngày" chỉ có ý nghĩa khi đang xem đúng tháng hiện tại (chỉ tiêu/tiến độ trong NGÀY). */
  showDailyKpi: boolean;
}

/**
 * Video tháng là chỉ số chính (gauge lớn, căn giữa) — KPI ngày và Traffic là 2 ô phụ ở chân card.
 * flex-1 quanh phần gauge để card tự căn giữa theo chiều dọc khi các card cùng hàng cao thấp khác nhau.
 */
export function LeaderMemberCard({ member, index, showDailyKpi }: LeaderMemberCardProps) {
  const name = member.full_name || member.email;
  const videoPct = member.kpi_target > 0 ? Math.round((member.kpi_completed / member.kpi_target) * 100) : null;
  const dayPct =
    member.kpi_day_target > 0 ? Math.round((member.kpi_day_completed / member.kpi_day_target) * 100) : null;
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-t-4 border-gray-100 bg-white p-5 shadow-sm",
        statusAccent(videoPct),
      )}
    >
      <div className="mb-2 flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
            avatarColor,
          )}
        >
          {initialsOf(name)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-gray-900">{name}</div>
          <div className="text-xs text-gray-400">Video tháng</div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <LeaderGaugeRing pct={videoPct} size={160} current={member.kpi_completed} target={member.kpi_target} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">KPI ngày</div>
          {showDailyKpi ? (
            <div className="mt-0.5 text-base font-bold text-gray-800">
              {member.kpi_day_completed}
              <span className="text-xs font-normal text-gray-400">
                /{member.kpi_day_target > 0 ? member.kpi_day_target : "—"}
              </span>
              {dayPct != null ? <span className="ml-1 text-xs font-normal text-gray-400">({dayPct}%)</span> : null}
            </div>
          ) : (
            <div className="mt-1 text-xs text-gray-400">Tháng hiện tại</div>
          )}
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Traffic</div>
          <div className="mt-0.5 text-base font-bold text-gray-800">
            {member.traffic_month.toLocaleString("vi-VN")}
          </div>
        </div>
      </div>
    </div>
  );
}
