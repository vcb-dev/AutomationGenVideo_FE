"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface LeaderVideoByLineChartProps {
  data: { line: string; count: number }[];
}

const BAR_COLOR = "#4f6ef7";

/** Số video (task đã duyệt) trong tháng của cả team, gộp theo tuyến nội dung A1-A5. */
export function LeaderVideoByLineChart({ data }: LeaderVideoByLineChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.count > 0);

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Team - Số video theo tuyến
      </div>
      <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BAR_COLOR }} aria-hidden />
        Số lượng
      </div>
      {!hasData ? (
        <p className="py-8 text-center text-xs text-gray-400">
          Chưa có video được duyệt theo tuyến (A1-A5) trong tháng này.
        </p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="line" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[6, 6, 0, 0]} maxBarSize={56}>
                <LabelList dataKey="count" position="top" style={{ fill: "#1f2937", fontSize: 12, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
