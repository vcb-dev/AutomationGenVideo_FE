"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface LeaderProductCategoryChartProps {
  data: { category: string; count: number }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  GMV: "#4f6ef7",
  TRAFFIC: "#10b981",
  PROFIT: "#8b5cf6",
};
const FALLBACK_COLORS = ["#f59e0b", "#ec4899", "#64748b"];

const CATEGORY_LABELS: Record<string, string> = {
  GMV: "GMV",
  TRAFFIC: "Traffic",
  PROFIT: "Profit",
};

function labelOf(category: string) {
  return CATEGORY_LABELS[category] ?? category.charAt(0) + category.slice(1).toLowerCase();
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

/** Số video (task đã duyệt) trong kỳ của cả team, gộp theo dòng sản phẩm (GMV/Traffic/Profit). */
export function LeaderProductCategoryChart({ data }: LeaderProductCategoryChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d, i) => ({
      name: labelOf(d.category),
      value: d.count,
      color: CATEGORY_COLORS[d.category] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }));

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Sản phẩm</div>
      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="py-8 text-center text-xs text-gray-400">
            Chưa có video được duyệt gắn dòng sản phẩm (GMV/Traffic/Profit) trong kỳ này.
          </p>
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
