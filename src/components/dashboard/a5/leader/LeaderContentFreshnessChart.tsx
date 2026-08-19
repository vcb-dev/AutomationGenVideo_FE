"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface LeaderContentFreshnessChartProps {
  data: { new: number; old: number };
}

const COLORS = { new: "#f59e0b", old: "#64748b" };

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

/**
 * "Content mới" (content được thêm vào kho VÀ gắn vào task cũng trong kỳ đang xem) vs "Content cũ"
 * (số task còn lại trong kỳ, không gắn với content mới) của cả team.
 */
export function LeaderContentFreshnessChart({ data }: LeaderContentFreshnessChartProps) {
  const total = data.new + data.old;
  const chartData = [
    { name: "Mới", value: data.new, color: COLORS.new },
    { name: "Cũ", value: data.old, color: COLORS.old },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Content mới</div>
      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="py-8 text-center text-xs text-gray-400">Chưa có task dùng content trong kỳ này.</p>
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={0}
                outerRadius={78}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value} (${pct(value, total)}%)`}
                labelLine={{ stroke: "#d1d5db" }}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} (${pct(Number(value), total)}%)`, name]} />
              <Legend
                verticalAlign="bottom"
                height={24}
                formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
