"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

function statusColor(pct: number) {
  if (pct >= 100) return { ring: "#10b981", text: "text-emerald-600" };
  if (pct >= 70) return { ring: "#6366f1", text: "text-indigo-600" };
  if (pct >= 40) return { ring: "#f59e0b", text: "text-amber-500" };
  return { ring: "#f87171", text: "text-red-500" };
}

interface LeaderGaugeRingProps {
  pct: number | null;
  size?: number;
  /** Khi có, hiển thị "Hiện tại"/"Mục tiêu" ngay dưới 2 chân của nửa vòng tròn (trái/phải). */
  current?: number;
  target?: number;
}

/** Gauge nửa hình tròn (kiểu đồng hồ tốc độ) dùng chung cho các card KPI của leader dashboard. */
export function LeaderGaugeRing({ pct, size = 120, current, target }: LeaderGaugeRingProps) {
  const ringPct = pct == null ? 0 : Math.min(100, Math.max(0, pct));
  const { ring, text } = statusColor(pct ?? 0);
  const data = [{ value: ringPct, fill: ring }];

  const barThickness = Math.max(10, Math.round(size / 11));
  const outerRadius = size / 2 - 4;
  const innerRadius = Math.max(outerRadius - barThickness, 8);
  const height = outerRadius + 12;
  const fontSizeClass = size >= 130 ? "text-xl" : size >= 100 ? "text-lg" : "text-sm";

  return (
    <div className="shrink-0" style={{ width: size }}>
      <div className="relative" style={{ width: size, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx={size / 2}
            cy={height - 6}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={180}
            endAngle={0}
            data={data}
            barSize={barThickness}
          >
            {/* Ép domain [0,100] — nếu không RadialBarChart tự lấy domain theo giá trị dữ liệu, khiến
                thanh luôn vẽ đầy 100% cung bất kể % thật là bao nhiêu. */}
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={barThickness / 2} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
          <span className={cn(fontSizeClass, "font-extrabold leading-none", pct == null ? "text-gray-300" : text)}>
            {pct == null ? "—" : `${pct}%`}
          </span>
        </div>
      </div>
      {current != null ? (
        <div className="mt-2 flex items-baseline justify-between gap-2 text-xs">
          <span className="whitespace-nowrap font-semibold text-red-500">
            Hiện tại <span className="font-bold">{current}</span>
          </span>
          <span className="whitespace-nowrap font-medium text-gray-500">
            Mục tiêu <span className="font-bold text-gray-700">{target && target > 0 ? target : "—"}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
