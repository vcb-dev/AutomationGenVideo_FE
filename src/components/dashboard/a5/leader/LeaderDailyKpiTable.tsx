import { Target } from "lucide-react";
import { A5NotAvailable } from "../shared/A5NotAvailable";

export function LeaderDailyKpiTable() {
  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-base font-bold">
        <Target className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        Giao KPI video ngày
      </div>
      <A5NotAvailable note="Hệ thống KPI thật (task-auto) hiện chỉ theo dõi chỉ tiêu theo THÁNG cho mỗi thành viên, chưa hỗ trợ chia nhỏ theo ngày hay theo mô hình 5A (A1-A5). Xem chỉ tiêu tháng thật ở bảng phía trên." />
    </div>
  );
}
