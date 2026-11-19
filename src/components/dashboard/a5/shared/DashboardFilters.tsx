"use client";

import { CalendarDays, CalendarRange, Filter, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { PlatformId } from "../admin/admin-platform-channel-data";
import type { AdminTeamRegionId } from "../admin/admin-team-perf-data";
import { addDays, addMonths, lastWeekRange, thisWeekRange, weeksOfMonth, ymd } from "./date-range-presets";

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

export interface DashboardSingleDatePicker {
  value: string;
  onChange: (date: string) => void;
  max?: string;
}

/** Khoảng ngày có kiểm soát + nút chọn nhanh (Hôm nay/Hôm qua/Tuần này/Tuần trước/Tuần N của tháng). */
export interface DashboardDayRangePicker {
  value: DashboardDateRange;
  onChange: (range: DashboardDateRange) => void;
}

interface DashboardFiltersProps {
  accent?: Accent;
  className?: string;
  showDateRange?: boolean;
  defaultDateFrom?: string;
  defaultDateTo?: string;
  onDateRangeChange?: (range: DashboardDateRange) => void;
  monthPicker?: DashboardMonthPicker;
  singleDate?: DashboardSingleDatePicker;
  dayRange?: DashboardDayRangePicker;
  adminTeamRegion?: AdminTeamRegionFilters;
  adminPlatformChannel?: AdminPlatformChannelFilters;
  showPlatformChannelFallback?: boolean;
  showTeamFallback?: boolean;
}

function isoDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function quickBtnClass(accent: Accent, active: boolean) {
  return cn(
    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    active
      ? accent === "amber"
        ? "border-amber-300 bg-amber-100 text-amber-800"
        : "border-indigo-300 bg-indigo-100 text-indigo-800"
      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:hover:bg-white",
  );
}

function DayRangeControls({ accent, value, onChange }: { accent: Accent } & DashboardDayRangePicker) {
  const { ring } = accentStyles[accent];
  const { from, to } = value;
  const today = ymd(new Date());
  const currentMonth = today.slice(0, 7);

  // Tháng của hàng "Tuần trong tháng" — tự nhảy theo ngày cuối khi khoảng đổi từ chỗ khác (ô ngày,
  // nút Tuần này...), còn mũi tên ‹ › chỉ đổi tháng để chọn tuần, chưa đổi khoảng.
  const [weekMonth, setWeekMonth] = useState(to.slice(0, 7));
  const [syncedTo, setSyncedTo] = useState(to);
  if (to !== syncedTo) {
    setSyncedTo(to);
    setWeekMonth(to.slice(0, 7));
  }

  const yesterday = addDays(today, -1);
  const isRange = (r: DashboardDateRange) => r.from === from && r.to === to;
  const presets: { label: string; range: DashboardDateRange }[] = [
    { label: "Hôm nay", range: { from: today, to: today } },
    { label: "Hôm qua", range: { from: yesterday, to: yesterday } },
    { label: "Tuần này", range: thisWeekRange(today) },
    { label: "Tuần trước", range: lastWeekRange(today) },
  ];
  const [, wm] = weekMonth.split("-");

  return (
    <>
      <Divider />
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
          <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Khoảng ngày
        </span>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Từ</span>
          <input
            type="date"
            value={from}
            max={today}
            onChange={(e) => {
              const v = e.target.value;
              if (v) onChange({ from: v, to: v > to ? v : to });
            }}
            className={cn(inputBase, ring)}
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Đến</span>
          <input
            type="date"
            value={to}
            max={today}
            onChange={(e) => {
              const v = e.target.value;
              if (v) onChange({ from: v < from ? v : from, to: v });
            }}
            className={cn(inputBase, ring)}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn nhanh khoảng ngày">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={isRange(p.range)}
            onClick={() => onChange(p.range)}
            className={quickBtnClass(accent, isRange(p.range))}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        className="flex basis-full flex-wrap items-center justify-center gap-1.5"
        role="group"
        aria-label={`Chọn tuần trong tháng ${Number(wm)}`}
      >
        <span className="text-xs font-medium text-gray-400">Tuần trong tháng</span>
        <button
          type="button"
          onClick={() => setWeekMonth(addMonths(weekMonth, -1))}
          aria-label="Tháng trước"
          className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="min-w-[4.5rem] text-center text-xs font-semibold text-gray-700">
          Tháng {Number(wm)}/{weekMonth.slice(0, 4)}
        </span>
        <button
          type="button"
          onClick={() => setWeekMonth(addMonths(weekMonth, 1))}
          disabled={weekMonth >= currentMonth}
          aria-label="Tháng sau"
          className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        {weeksOfMonth(weekMonth).map((w) => {
          // Tuần đang chạy chỉ tính tới hôm nay; tuần chưa tới thì khoá.
          const range = { from: w.from, to: w.to > today ? today : w.to };
          const active = isRange(range);
          const days =
            range.from === range.to
              ? `${Number(range.from.slice(8))}`
              : `${Number(range.from.slice(8))}–${Number(range.to.slice(8))}`;
          return (
            <button
              key={w.index}
              type="button"
              disabled={w.from > today}
              aria-pressed={active}
              aria-label={`Tuần ${w.index}, ngày ${days} tháng ${Number(wm)}`}
              onClick={() => onChange(range)}
              className={quickBtnClass(accent, active)}
            >
              Tuần {w.index}
              <span className={cn("ml-1 font-normal", active ? "text-current" : "text-gray-400")}>{days}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function DashboardFilters({
  accent = "indigo",
  className,
  showDateRange = false,
  defaultDateFrom,
  defaultDateTo,
  onDateRangeChange,
  monthPicker,
  singleDate,
  dayRange,
  adminTeamRegion,
  adminPlatformChannel,
  showPlatformChannelFallback = true,
  showTeamFallback = true,
}: DashboardFiltersProps) {
  const { ring, badge } = accentStyles[accent];

  const today = isoDay(0);
  const yesterday = isoDay(-1);
  const quickBtn = (active: boolean) => quickBtnClass(accent, active);

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

      {/* Single date */}
      {singleDate ? (
        <>
          <Divider />
          <label className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Ngày
            </span>
            <input
              type="date"
              value={singleDate.value}
              max={singleDate.max ?? today}
              onChange={(e) => singleDate.onChange(e.target.value)}
              className={cn(inputBase, ring)}
            />
          </label>
          <button type="button" onClick={() => singleDate.onChange(today)} className={quickBtn(singleDate.value === today)}>
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => singleDate.onChange(yesterday)}
            className={quickBtn(singleDate.value === yesterday)}
          >
            Hôm qua
          </button>
        </>
      ) : null}

      {dayRange ? <DayRangeControls accent={accent} {...dayRange} /> : null}

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