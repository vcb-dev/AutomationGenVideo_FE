"use client";

import { CalendarDays, CalendarRange, Filter, ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { PlatformId } from "../admin/admin-platform-channel-data";
import type { AdminTeamRegionId } from "../admin/admin-team-perf-data";

type Accent = "indigo" | "amber";

/** Lọc team khu vực (tab Tổng quan admin) */
export interface AdminTeamRegionFilters {
  teamRegionId: AdminTeamRegionId | "all";
  onTeamRegionIdChange: (v: AdminTeamRegionId | "all") => void;
  options: { id: AdminTeamRegionId | "all"; label: string }[];
}

/** Lọc nền tảng + kênh chi tiết (tab Tổng quan admin) */
export interface AdminPlatformChannelFilters {
  platformId: PlatformId | "all";
  onPlatformIdChange: (v: PlatformId | "all") => void;
  channelKey: string | "all";
  onChannelKeyChange: (v: string | "all") => void;
  platformOptions: { id: PlatformId | "all"; label: string }[];
  channelOptions: { value: string; label: string }[];
}

export interface DashboardDateRange {
  from: string;
  to: string;
}

export interface DashboardMonthPicker {
  value: string;
  onChange: (month: string) => void;
}

interface DashboardFiltersProps {
  accent?: Accent;
  className?: string;
  showDateRange?: boolean;
  defaultDateFrom?: string;
  defaultDateTo?: string;
  onDateRangeChange?: (range: DashboardDateRange) => void;
  monthPicker?: DashboardMonthPicker;
  adminTeamRegion?: AdminTeamRegionFilters;
  adminPlatformChannel?: AdminPlatformChannelFilters;
  showPlatformChannelFallback?: boolean;
  showTeamFallback?: boolean;
}

// Lấy ngày đầu và cuối tháng hiện tại
function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

const accentStyles: Record<Accent, { ring: string; focus: string; badge: string }> = {
  indigo: {
    ring: "focus:ring-indigo-400/30 focus:border-indigo-400",
    focus: "focus:ring-indigo-400/30",
    badge: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  amber: {
    ring: "focus:ring-amber-400/30 focus:border-amber-400",
    focus: "focus:ring-amber-400/30",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
  },
};

const selectBase =
  "appearance-none cursor-pointer rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-medium text-gray-700 outline-none transition-all duration-150 hover:border-gray-300 hover:bg-gray-50 focus:ring-2 shadow-sm";

const inputBase =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-all duration-150 hover:border-gray-300 focus:ring-2 shadow-sm";

function SelectWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {children}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
    </div>
  );
}

function Divider() {
  return <span className="hidden h-6 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />;
}

export function DashboardFilters({
  accent = "indigo",
  className,
  showDateRange = false,
  defaultDateFrom,
  defaultDateTo,
  onDateRangeChange,
  monthPicker,
  adminTeamRegion,
  adminPlatformChannel,
  showPlatformChannelFallback = true,
  showTeamFallback = true,
}: DashboardFiltersProps) {
  const { ring, badge } = accentStyles[accent];

  const monthRange = getCurrentMonthRange();
  const [from, setFrom] = useState(defaultDateFrom ?? monthRange.from);
  const [to, setTo] = useState(defaultDateTo ?? monthRange.to);

  const emitRange = useCallback(
    (nextFrom: string, nextTo: string) => {
      onDateRangeChange?.({ from: nextFrom, to: nextTo });
    },
    [onDateRangeChange],
  );

  const onFromChange = (v: string) => {
    setFrom(v);
    const end = v > to ? v : to;
    if (v > to) setTo(v);
    emitRange(v, end);
  };

  const onToChange = (v: string) => {
    const start = v < from ? v : from;
    if (v < from) setFrom(v);
    setTo(v);
    emitRange(start, v);
  };

  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {/* Label */}
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold tracking-wide",
          badge,
        )}
      >
        <Filter className="h-3 w-3 shrink-0" aria-hidden />
        Bộ lọc
      </span>

      <Divider />

      {/* Team filter */}
      {adminTeamRegion ? (
        <SelectWrapper>
          <select
            value={adminTeamRegion.teamRegionId}
            onChange={(e) =>
              adminTeamRegion.onTeamRegionIdChange(e.target.value as AdminTeamRegionId | "all")
            }
            className={cn(selectBase, ring)}
            aria-label="Lọc team"
          >
            {adminTeamRegion.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </SelectWrapper>
      ) : showTeamFallback ? (
        <SelectWrapper>
          <select className={cn(selectBase, ring)}>
            <option>Tất cả Team</option>
            <option>Nội dung VN</option>
            <option>Toàn cầu</option>
          </select>
        </SelectWrapper>
      ) : null}

      {/* Platform + Channel filter */}
      {adminPlatformChannel ? (
        <>
          <SelectWrapper>
            <select
              value={adminPlatformChannel.platformId}
              onChange={(e) =>
                adminPlatformChannel.onPlatformIdChange(e.target.value as PlatformId | "all")
              }
              className={cn(selectBase, ring)}
              aria-label="Lọc nền tảng"
            >
              {adminPlatformChannel.platformOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </SelectWrapper>
          <SelectWrapper>
            <select
              value={adminPlatformChannel.channelKey}
              onChange={(e) =>
                adminPlatformChannel.onChannelKeyChange(
                  e.target.value === "all" ? "all" : e.target.value,
                )
              }
              className={cn(selectBase, ring)}
              aria-label="Lọc kênh trong nền tảng"
            >
              {adminPlatformChannel.channelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </SelectWrapper>
        </>
      ) : showPlatformChannelFallback ? (
        <SelectWrapper>
          <select className={cn(selectBase, ring)}>
            <option>Tất cả nền tảng</option>
            <option>Facebook</option>
            <option>TikTok</option>
            <option>Instagram</option>
            <option>YouTube</option>
            <option>Khác (Zalo, Twitter...)</option>
          </select>
        </SelectWrapper>
      ) : null}

      {/* Month picker */}
      {monthPicker ? (
        <>
          <Divider />
          <label className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Tháng
            </span>
            <input
              type="month"
              value={monthPicker.value}
              onChange={(e) => monthPicker.onChange(e.target.value)}
              className={cn(inputBase, ring)}
            />
          </label>
        </>
      ) : null}

      {/* Date range */}
      {showDateRange ? (
        <>
          <Divider />
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Thời gian
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Từ</span>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => onFromChange(e.target.value)}
                className={cn(inputBase, ring)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Đến</span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => onToChange(e.target.value)}
                className={cn(inputBase, ring)}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}