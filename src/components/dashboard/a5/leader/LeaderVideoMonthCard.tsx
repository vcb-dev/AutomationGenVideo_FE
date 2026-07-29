"use client";

interface LeaderVideoMonthCardProps {
  current: number;
  target: number;
}

export function LeaderVideoMonthCard({ current, target }: LeaderVideoMonthCardProps) {
  const pct = target > 0 ? Math.round((current / target) * 100) : null;
  const width = pct == null ? 0 : Math.min(100, pct);

  return (
    <div className="h-full rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Số video tháng</div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-extrabold text-gray-900">{pct == null ? "—" : `${pct}%`}</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
        </div>
      </div>
      <div className="mt-2 text-xs">
        <span className="font-semibold text-red-500">Hiện tại {current}</span>
        <span className="text-gray-400"> | Mục tiêu {target > 0 ? target : "—"}</span>
      </div>
    </div>
  );
}
