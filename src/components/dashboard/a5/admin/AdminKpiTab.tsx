"use client";

import { ClipboardList, MapPin, Target } from "lucide-react";
import { useMemo } from "react";
import { A5NotAvailable } from "../shared/A5NotAvailable";
import { DashboardFilters } from "../shared/DashboardFilters";
import { useAdminOverviewFilters } from "./AdminOverviewFiltersContext";

function formatMonthVi(ym: string) {
  const [y, m] = ym.split("-");
  return `tháng ${Number(m)}/${y}`;
}

function monthRangeFromKey(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${String(lastDay).padStart(2, "0")}` };
}

export function AdminKpiTab() {
  const f = useAdminOverviewFilters();
  // Tab "Tổng quan" dùng date-range, tab này dùng month-picker — cả 2 cùng ghi vào 1 context dùng
  // chung (AdminOverviewFiltersProvider bọc cả 2 tab). Suy ra thẳng từ f.dateFrom thay vì giữ state
  // cục bộ riêng để tránh lệch hiển thị khi đổi ngày ở tab kia rồi quay lại tab này.
  const kpiMonth = f.dateFrom.slice(0, 7);
  const monthLabel = useMemo(() => formatMonthVi(kpiMonth), [kpiMonth]);

  // Đổi tháng ở đây phải lọc lại đúng dữ liệu (không chỉ đổi chữ).
  const onMonthChange = (ym: string) => {
    const range = monthRangeFromKey(ym);
    f.setDateRange(range.from, range.to);
  };

  return (
    <div>
      <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center gap-2 text-base font-bold text-indigo-900">
          <ClipboardList className="h-5 w-5 shrink-0 text-indigo-700" aria-hidden />
          Admin giao KPI {monthLabel} cho từng Team
        </div>
        <div className="mt-1 text-sm text-indigo-700">
          Phân bổ tổng video theo mô hình 5A → Leader sẽ chia nhỏ cho từng thành viên theo ngày
        </div>
      </div>

      <A5NotAvailable note="Chưa hỗ trợ nhập/lưu chỉ tiêu KPI theo mô hình 5A (A1-A5) — hệ thống hiện không có bảng lưu chỉ tiêu theo tier này. Bảng dưới đây chỉ hiển thị roster team thật (tên, leader, số người) để tham khảo." />

      <DashboardFilters
        accent="indigo"
        className="mb-4 mt-4"
        showPlatformChannelFallback={false}
        monthPicker={{ value: kpiMonth, onChange: onMonthChange }}
        adminTeamRegion={{
          teamRegionId: f.teamFilter,
          onTeamRegionIdChange: f.setTeamFilter,
          options: f.teamOptions,
        }}
      />

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-base font-bold">
          <Target className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
          Team &amp; Leader
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">TEAM</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">LEADER</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">SỐ NGƯỜI</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">VIDEO (kỳ đã chọn)</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">CHỈ TIÊU A1-A5</th>
              </tr>
            </thead>
            <tbody>
              {f.isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Đang tải dữ liệu…
                  </td>
                </tr>
              ) : f.teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Không có team khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                f.teams.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2 font-semibold">
                        <MapPin className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                        {t.name}
                      </div>
                    </td>
                    <td className="text-left text-gray-600">{t.leaderName ?? "—"}</td>
                    <td className="text-center">{t.staffCount}</td>
                    <td className="text-center font-semibold">{t.videoCount}</td>
                    <td className="text-right text-gray-400">—</td>
                  </tr>
                ))
              )}
              {f.teams.length > 0 ? (
                <tr className="bg-blue-50 font-bold">
                  <td className="py-2.5">TỔNG CÔNG TY</td>
                  <td />
                  <td className="text-center">{f.teamTotals.staffCount}</td>
                  <td className="text-center">{f.teamTotals.videoCount}</td>
                  <td className="text-right text-gray-400">—</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
