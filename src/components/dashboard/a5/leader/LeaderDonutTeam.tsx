"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { A5_LINE_COLORS, type A5Key } from "../constants";

const SLICES: { key: A5Key; label: string; pct: string; count: number }[] = [
  { key: "a1", label: "A1", pct: "35%", count: 72 },
  { key: "a2", label: "A2", pct: "27%", count: 57 },
  { key: "a3", label: "A3", pct: "18%", count: 37 },
  { key: "a4", label: "A4", pct: "13%", count: 26 },
  { key: "a5", label: "A5", pct: "7%", count: 16 },
];

export function LeaderDonutTeam() {
  const data = SLICES.map((s) => ({ name: s.label, value: s.count, key: s.key }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-base font-bold">
        <PieChartIcon className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        Phân bổ 5A — Team VN
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative h-[140px] w-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={58}
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
              <div className="text-xl font-extrabold">208</div>
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
