"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  A5_KEYS,
  A5_LINE_COLORS,
  DATA_2025,
  DATA_2026,
  type A5Key,
  type YearKey,
} from "../constants";

interface AdminGrowthBars5AMonthlyProps {
  /**
   * Nhân chuỗi mock theo tỉ lệ: video (Team + nền tảng + kênh) / video (cùng Team, mọi kênh).
   * Khi đủ bộ lọc = 1; thu hẹp nền tảng/kênh thì nhỏ hơn 1.
   */
  scaleFactor?: number;
  /** Mô tả bộ lọc Team · nền tảng · kênh */
  filterSummary?: string;
  className?: string;
  accent?: "indigo" | "amber";
}

function getSrc(y: YearKey) {
  return y === "2026" ? DATA_2026 : DATA_2025;
}

export function AdminGrowthBars5AMonthly({
  scaleFactor = 1,
  filterSummary,
  className,
  accent = "indigo",
}: AdminGrowthBars5AMonthlyProps) {
  const [year, setYear] = useState<YearKey>("2026");
  const [monthCount, setMonthCount] = useState(12);

  const data = useMemo(() => {
    const src = getSrc(year);
    const si = Math.max(0, 12 - monthCount);
    return src.labels.slice(si, si + monthCount).map((lab, idx) => {
      const i = si + idx;
      const row: Record<string, string | number> = { month: lab };
      for (const k of A5_KEYS) {
        const raw = src[k][i];
        row[k] =
          raw == null ? 0 : Math.max(0, Math.round(Number(raw) * scaleFactor));
      }
      return row;
    });
  }, [year, monthCount, scaleFactor]);

  const activeBtn =
    accent === "amber"
      ? "border-amber-500 bg-amber-500 text-white"
      : "border-indigo-600 bg-indigo-600 text-white";
  const inactiveBtn = "border-gray-200 bg-white text-gray-500";
  const iconAccent = accent === "amber" ? "text-amber-600" : "text-indigo-600";

  return (
    <div className={cn("rounded-xl border border-gray-100 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-base font-bold">
          <LineChartIcon className={cn("h-5 w-5 shrink-0", iconAccent)} aria-hidden />
          Tăng trưởng 5A theo tháng
          <span className="text-xs font-normal text-gray-500">(đường)</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {[3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMonthCount(n)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium",
                monthCount === n ? activeBtn : inactiveBtn,
              )}
            >
              {n} tháng
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-gray-200 sm:inline-block" />
          <select
            value={year}
            onChange={(e) => setYear(e.target.value as YearKey)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>
      {filterSummary ? (
        <p className="mb-3 text-xs leading-relaxed text-gray-600">
          <span className="font-semibold text-gray-700">Theo bộ lọc:</span> {filterSummary}
        </p>
      ) : null}
      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v as string).toUpperCase()} />
            {A5_KEYS.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={k}
                stroke={A5_LINE_COLORS[k as A5Key]}
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, stroke: "#fff", fill: A5_LINE_COLORS[k as A5Key] }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
