"use client";

import { BarChart3, User } from "lucide-react";
import { A5NotAvailable } from "../shared/A5NotAvailable";
import { useAdminOverviewFilters } from "../admin/AdminOverviewFiltersContext";
import { useLeaderTaskDashboard } from "./leader-task-dashboard-api";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

export function LeaderMemberTable() {
  const { dateFrom, dateTo } = useAdminOverviewFilters();
  const { data, isLoading } = useLeaderTaskDashboard({ dateFrom, dateTo });

  const members = data?.members ?? [];
  const teamName = data?.team?.name;

  const sum = members.reduce(
    (a, m) => ({
      pending: a.pending + m.pending,
      in_progress: a.in_progress + m.in_progress,
      submitted: a.submitted + m.submitted,
      approved: a.approved + m.approved,
      kpi_target: a.kpi_target + m.kpi_target,
      kpi_completed: a.kpi_completed + m.kpi_completed,
    }),
    { pending: 0, in_progress: 0, submitted: 0, approved: 0, kpi_target: 0, kpi_completed: 0 },
  );

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-bold">
            <User className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            Chi tiết theo thành viên{teamName ? ` — ${teamName}` : ""}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Số task theo trạng thái và KPI (task-auto) lấy từ dữ liệu thật, theo khoảng thời gian đã chọn.
          </p>
        </div>
        <BarChart3 className="h-5 w-5 shrink-0 text-gray-300" aria-hidden />
      </div>

      <div className="mb-3">
        <A5NotAvailable note="Phân loại video theo A1-A5 chưa có dữ liệu thật — bảng dưới đây hiển thị số task theo trạng thái duyệt thay thế." />
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-400">Đang tải dữ liệu…</p>
      ) : !data?.team ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Bạn chưa được gán làm leader của team nào, hoặc chưa có dữ liệu task trong kỳ đã chọn.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">NHÂN VIÊN</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">CHỜ DUYỆT</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">ĐANG LÀM</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">ĐÃ GỬI</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">ĐÃ DUYỆT</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">KPI THÁNG</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TIẾN ĐỘ</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Team chưa có thành viên hoặc chưa có task trong kỳ đã chọn.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const pct = m.kpi_target > 0 ? Math.round((m.kpi_completed / m.kpi_target) * 100) : null;
                  return (
                    <tr key={m.user_id} className="border-b border-gray-50">
                      <td className="py-2.5 text-left">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                            {initialsOf(m.full_name || m.email)}
                          </div>
                          <div>
                            <b>{m.full_name || m.email}</b>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">{m.pending}</td>
                      <td className="text-center">{m.in_progress}</td>
                      <td className="text-center">{m.submitted}</td>
                      <td className="text-center font-semibold text-emerald-600">{m.approved}</td>
                      <td className="text-center">
                        {m.kpi_target > 0 ? `${m.kpi_completed}/${m.kpi_target}` : "—"}
                      </td>
                      <td className="text-center">
                        {pct == null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-amber-400"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            {pct}%
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {members.length > 0 ? (
                <tr className="bg-amber-50 font-bold">
                  <td className="py-2.5">TỔNG</td>
                  <td className="text-center">{sum.pending}</td>
                  <td className="text-center">{sum.in_progress}</td>
                  <td className="text-center">{sum.submitted}</td>
                  <td className="text-center">{sum.approved}</td>
                  <td className="text-center">{sum.kpi_target > 0 ? `${sum.kpi_completed}/${sum.kpi_target}` : "—"}</td>
                  <td className="text-center">
                    {sum.kpi_target > 0 ? `${Math.round((sum.kpi_completed / sum.kpi_target) * 100)}%` : "—"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
