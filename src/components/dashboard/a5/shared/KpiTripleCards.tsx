import { CircleDollarSign, Eye, Info, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiTripleCardsProps {
  trafficLabel: string;
  revenueLabel: string;
  videoTotal: number;
  /** % hoàn thành so với chỉ tiêu KPI (Lark) — null nếu chưa có chỉ tiêu trong kỳ đã chọn. */
  progressPct?: number | null;
  /** "Dữ liệu KPI cập nhật đến dd/mm/yyyy" hoặc cảnh báo mốc sync cũ. */
  syncNote?: string;
  /** true trong lúc query đang chạy — tránh nháy "Chưa có dữ liệu" trước khi data thật về. */
  isLoading?: boolean;
}

function BigValue({ value }: { value: string | number }) {
  const isPlaceholder = typeof value === "string" && !/\d/.test(value);
  return (
    <div
      className={cn(
        "mt-1 font-extrabold leading-tight",
        isPlaceholder ? "text-lg text-gray-400" : "text-4xl",
      )}
    >
      {value}
    </div>
  );
}

export function KpiTripleCards({
  trafficLabel,
  revenueLabel,
  videoTotal,
  progressPct,
  syncNote,
  isLoading,
}: KpiTripleCardsProps) {
  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
            <Eye className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            Tổng Traffic
          </div>
          <BigValue value={isLoading ? "Đang tải…" : trafficLabel} />
          <div className="mt-1 text-xs text-gray-400">trong khoảng thời gian đã chọn</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            Tổng Doanh Thu
          </div>
          <BigValue value={isLoading ? "Đang tải…" : revenueLabel} />
          <div className="mt-1 text-xs text-gray-400">trong khoảng thời gian đã chọn</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
            <Video className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            Tổng Video
          </div>
          <BigValue value={isLoading ? "Đang tải…" : videoTotal} />
          <div className="mt-1 text-xs text-gray-400">
            {isLoading
              ? " "
              : progressPct == null
                ? "Chưa có chỉ tiêu KPI trong kỳ này"
                : `Đạt ${progressPct}% chỉ tiêu KPI`}
          </div>
        </div>
      </div>
      {!isLoading && syncNote ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {syncNote}
        </div>
      ) : null}
    </div>
  );
}
