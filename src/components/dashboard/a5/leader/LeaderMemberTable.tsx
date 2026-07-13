"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Pencil,
  Save,
  Send,
  User,
} from "lucide-react";
import { useMemo } from "react";
import { useAdminOverviewFilters } from "../admin/AdminOverviewFiltersContext";
import { LEADER_MEMBERS, type MemberStatus } from "./leader-demo-data";

const STATUS_ICON: Record<MemberStatus, typeof CheckCircle2> = {
  approved: CheckCircle2,
  pending: Clock,
  editing: Pencil,
};

function barColor(p: number) {
  if (p >= 80) return "bg-blue-500";
  if (p >= 70) return "bg-amber-400";
  return "bg-red-400";
}

function scaleInt(n: number, sf: number) {
  return Math.max(0, Math.round(n * sf));
}

export function LeaderMemberTable() {
  const { teamRegionId, growthChartScaleFactor: sf } = useAdminOverviewFilters();

  const showVnMemberDemo =
    teamRegionId === "all" || teamRegionId === "vietnam";

  const rows = useMemo(() => {
    if (!showVnMemberDemo) return [];
    return LEADER_MEMBERS.map((v) => {
      const a = v.a.map((x) => scaleInt(x, sf)) as [number, number, number, number, number];
      const t = a.reduce((s, x) => s + x, 0);
      return { ...v, a, t };
    });
  }, [showVnMemberDemo, sf]);

  const sum = useMemo(() => {
    return rows.reduce(
      (a, v) => ({
        a1: a.a1 + v.a[0],
        a2: a.a2 + v.a[1],
        a3: a.a3 + v.a[2],
        a4: a.a4 + v.a[3],
        a5: a.a5 + v.a[4],
        t: a.t + v.t,
      }),
      { a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, t: 0 },
    );
  }, [rows]);

  const avgProgress =
    rows.length > 0
      ? Math.round(rows.reduce((s, v) => s + v.p, 0) / rows.length)
      : 0;

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-bold">
            <User className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            Chi tiết theo thành viên — Team Nội dung VN
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Số liệu demo được nhân theo tỉ lệ video trong phạm vi Team + nền tảng + kênh đã chọn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
          >
            <Save className="h-4 w-4 shrink-0" aria-hidden />
            Lưu KPI
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600"
          >
            <Send className="h-4 w-4 shrink-0" aria-hidden />
            Gửi duyệt
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600"
          >
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
            Xuất báo cáo
          </button>
        </div>
      </div>
      {!showVnMemberDemo ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Bảng thành viên demo chỉ áp dụng cho <b>Team Việt Nam</b>. Chọn &quot;Tất cả Team&quot; hoặc
          &quot;Team Việt Nam&quot; ở bộ lọc.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">NHÂN VIÊN</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">NHÓM</th>
                <th className="pb-2 text-center text-xs font-bold text-a1">A1</th>
                <th className="pb-2 text-center text-xs font-bold text-a2">A2</th>
                <th className="pb-2 text-center text-xs font-bold text-a3">A3</th>
                <th className="pb-2 text-center text-xs font-bold text-a4">A4</th>
                <th className="pb-2 text-center text-xs font-bold text-a5">A5</th>
                <th className="pb-2 text-center text-xs font-bold text-gray-700">TỔNG</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">TIẾN ĐỘ</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => {
                const StatusIcon = STATUS_ICON[v.st];
                return (
                  <tr key={v.i} className="border-b border-gray-50">
                    <td className="py-2.5 text-left">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: v.c }}
                        >
                          {v.i}
                        </div>
                        <div>
                          <b>{v.n}</b>
                          <div className="text-xs text-gray-500">{v.r}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">{v.g}</td>
                    <td className="text-center font-semibold text-a1">{v.a[0]}</td>
                    <td className="text-center font-semibold text-a2">{v.a[1]}</td>
                    <td className="text-center font-semibold text-a3">{v.a[2]}</td>
                    <td className="text-center font-semibold text-a4">{v.a[3]}</td>
                    <td className="text-center font-semibold text-a5">{v.a[4]}</td>
                    <td className="text-center font-bold">{v.t}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div className={cn(barColor(v.p), "h-full rounded-full")} style={{ width: `${v.p}%` }} />
                        </div>
                        {v.p}%
                      </div>
                    </td>
                    <td className="text-right">
                      <span className={cn("inline-flex items-center justify-end gap-1 font-semibold", v.sc)}>
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {v.s}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-blue-50 font-bold">
                <td className="py-2.5 text-left" colSpan={2}>
                  TỔNG
                </td>
                <td className="text-center">{sum.a1}</td>
                <td className="text-center">{sum.a2}</td>
                <td className="text-center">{sum.a3}</td>
                <td className="text-center">{sum.a4}</td>
                <td className="text-center">{sum.a5}</td>
                <td className="text-center">{sum.t}</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${avgProgress}%` }}
                      />
                    </div>
                    {avgProgress}%
                  </div>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
