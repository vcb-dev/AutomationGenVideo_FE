import { CircleDollarSign, Eye, TrendingDown, TrendingUp, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_TRAFFIC = "1.85M";
const DEFAULT_REVENUE = "2.8 Tỷ";
const DEFAULT_VIDEO = 755;
const DEFAULT_VS = 22;
const DEFAULT_NEW_VIDEOS = 141;

export interface KpiTripleCardsProps {
  trafficLabel?: string;
  trafficVsPrevPct?: number;
  revenueLabel?: string;
  revenueVsPrevPct?: number;
  videoTotal?: number;
  newVideosEst?: number;
}

export function KpiTripleCards({
  trafficLabel = DEFAULT_TRAFFIC,
  trafficVsPrevPct = DEFAULT_VS,
  revenueLabel = DEFAULT_REVENUE,
  revenueVsPrevPct = 18,
  videoTotal = DEFAULT_VIDEO,
  newVideosEst = DEFAULT_NEW_VIDEOS,
}: KpiTripleCardsProps) {
  const trafficUp = trafficVsPrevPct >= 0;
  const revenueUp = revenueVsPrevPct >= 0;

  const trendClass = (up: boolean) =>
    cn(up ? "text-emerald-600" : "text-red-500");

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
          <Eye className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          Tổng Traffic
        </div>
        <div className="mt-1 text-4xl font-extrabold leading-tight">{trafficLabel}</div>
        <div className={cn("mt-1 flex items-center gap-1 text-sm", trendClass(trafficUp))}>
          {trafficUp ? (
            <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <TrendingDown className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {trafficUp ? "+" : ""}
          {Math.round(trafficVsPrevPct)}% vs tháng trước
        </div>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
          <CircleDollarSign className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          Tổng Doanh Thu
        </div>
        <div className="mt-1 text-4xl font-extrabold leading-tight">{revenueLabel}</div>
        <div className={cn("mt-1 flex items-center gap-1 text-sm", trendClass(revenueUp))}>
          {revenueUp ? (
            <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <TrendingDown className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {revenueUp ? "+" : ""}
          {Math.round(revenueVsPrevPct)}% vs tháng trước
        </div>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
          <Video className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          Tổng Video
        </div>
        <div className="mt-1 text-4xl font-extrabold leading-tight">{videoTotal}</div>
        <div className="mt-1 flex items-center gap-1 text-sm text-emerald-600">
          <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
          {newVideosEst} video mới
        </div>
      </div>
    </div>
  );
}
