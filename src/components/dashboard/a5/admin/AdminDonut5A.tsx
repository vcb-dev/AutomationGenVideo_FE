"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { A5_LINE_COLORS, type A5Key } from "../constants";

const DEFAULT_SLICES: { key: A5Key; label: string; pct: string; count: number }[] = [
  { key: "a1", label: "A1", pct: "32%", count: 245 },
  { key: "a2", label: "A2", pct: "26%", count: 198 },
  { key: "a3", label: "A3", pct: "21%", count: 156 },
  { key: "a4", label: "A4", pct: "12%", count: 89 },
  { key: "a5", label: "A5", pct: "9%", count: 67 },
];

interface AdminDonut5AProps {
  slices?: typeof DEFAULT_SLICES;
  centerTotal?: number;
  accent?: "indigo" | "amber";
}

export function AdminDonut5A({
  slices = DEFAULT_SLICES,
  centerTotal,
  accent = "indigo",
}: AdminDonut5AProps) {
  const SLICES = slices;
  const total = centerTotal ?? SLICES.reduce((s, x) => s + x.count, 0);
  const data = SLICES.map((s) => ({ name: s.label, value: s.count, key: s.key }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-base font-bold">
        <PieChartIcon
          className={
            accent === "amber" ? "h-5 w-5 shrink-0 text-amber-600" : "h-5 w-5 shrink-0 text-gray-600"
          }
          aria-hidden
        />
        Phân bổ 5A
        <span className="text-xs font-normal text-gray-500"> (theo Team &amp; kênh)</span>
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative h-[150px] w-[150px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={64}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={A5_LINE_COLORS[entry.key as A5Key]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-extrabold">{total}</div>
              <div className="text-xs text-gray-500">video</div>
            </div>
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          {SLICES.map((s) => (
            <div key={s.key}>
              <span
                className="mr-2 inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: A5_LINE_COLORS[s.key] }}
              />
              {s.label}: {s.pct} ({s.count})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
