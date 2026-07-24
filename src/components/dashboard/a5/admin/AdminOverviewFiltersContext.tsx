"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";
import { UserRole } from "@/types/auth";
import {
  A5_NOT_AVAILABLE_NOTE,
  formatCompactNumber,
  formatRevenueVi,
  formatSyncDateVi,
  isSyncStale,
  useDashboard5A,
  type Dashboard5AChannelRow,
  type Dashboard5ATeamRow,
} from "../shared/dashboard5a-api";

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export interface TeamOption {
  id: string;
  label: string;
}

export interface TeamTotals {
  staffCount: number;
  traffic: number;
  revenue: number;
  videoCount: number;
  kpiTarget: number;
  progressPct: number | null;
}

export interface AdminOverviewFiltersValue {
  /** "all" hoặc tên team thật (Team.name) */
  teamFilter: string;
  setTeamFilter: (v: string) => void;
  /** Danh sách team thật để đổ vào dropdown — nạp động từ API, không hard-code. */
  teamOptions: TeamOption[];

  dateFrom: string;
  dateTo: string;
  setDateRange: (from: string, to: string) => void;

  isLoading: boolean;
  isError: boolean;
  /** admin/manager xem toàn công ty; leader chỉ xem team mình (server ép, không tin query param client). */
  scope: "admin" | "leader";

  teams: Dashboard5ATeamRow[];
  teamTotals: TeamTotals;
  channels: Dashboard5AChannelRow[];

  kpiTrafficLabel: string;
  kpiRevenueLabel: string;
  videoTotal: number;
  kpiProgressPct: number | null;
  /** "Dữ liệu KPI cập nhật đến dd/mm/yyyy" hoặc cảnh báo nếu mốc sync quá cũ / chưa có. */
  kpiSyncNote: string;

  /** Ghi chú dùng chung cho mọi bảng/biểu đồ dựa trên A1-A5 — hệ thống chưa có dữ liệu thật. */
  a5Note: string;
}

const Ctx = createContext<AdminOverviewFiltersValue | null>(null);

export function AdminOverviewFiltersProvider({ children }: { children: ReactNode }) {
  const monthRange = getCurrentMonthRange();
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(monthRange.from);
  const [dateTo, setDateTo] = useState(monthRange.to);

  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const isAdminRole = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER);

  // Query riêng cho dropdown (luôn team=all) — khi teamFilter cũng đang "all" thì trùng cache key
  // với dataQuery bên dưới, react-query tự gộp, không tốn thêm request. Leader không có dropdown
  // (server luôn ép về đúng 1 team của họ) nên tắt hẳn query này để khỏi tốn request thừa.
  const optionsQuery = useDashboard5A(
    { startDate: dateFrom, endDate: dateTo, team: "all" },
    { enabled: isAdminRole },
  );
  const dataQuery = useDashboard5A({ startDate: dateFrom, endDate: dateTo, team: teamFilter });

  const setDateRange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const scope: "admin" | "leader" = dataQuery.data?.scope ?? (isAdminRole ? "admin" : "leader");

  const teamOptions: TeamOption[] = useMemo(() => {
    const src = optionsQuery.data?.teams ?? [];
    return [{ id: "all", label: "Tất cả Team" }, ...src.map((t) => ({ id: t.name, label: t.name }))];
  }, [optionsQuery.data]);

  const teams = dataQuery.data?.teams ?? [];

  const teamTotals: TeamTotals = useMemo(() => {
    const base = teams.reduce(
      (acc, t) => ({
        staffCount: acc.staffCount + t.staffCount,
        traffic: acc.traffic + t.traffic,
        revenue: acc.revenue + t.revenue,
        videoCount: acc.videoCount + t.videoCount,
        kpiTarget: acc.kpiTarget + t.kpiTarget,
      }),
      { staffCount: 0, traffic: 0, revenue: 0, videoCount: 0, kpiTarget: 0 },
    );
    return {
      ...base,
      progressPct: base.kpiTarget > 0 ? Math.round((base.videoCount / base.kpiTarget) * 100) : null,
    };
  }, [teams]);

  const kpi = dataQuery.data?.kpi;

  // Traffic/doanh thu qua Lark KPI thường KHÔNG được điền cho mọi team (đã verify trên DB thật:
  // phần lớn team chỉ báo cáo completed_month, không báo traffic_month/revenue_month) — hiển thị
  // "0" trong trường hợp này dễ bị hiểu nhầm là "thật sự bằng 0" thay vì "chưa có dữ liệu".
  const kpiTrafficLabel = kpi && kpi.totalTraffic > 0 ? formatCompactNumber(kpi.totalTraffic) : "Chưa có dữ liệu";
  const kpiRevenueLabel = kpi && kpi.totalRevenue > 0 ? formatRevenueVi(kpi.totalRevenue) : "Chưa có dữ liệu";

  const syncDateLabel = formatSyncDateVi(kpi?.lastSyncedAt ?? null);
  const kpiSyncNote = !syncDateLabel
    ? "Chưa có lần đồng bộ KPI (Lark) nào."
    : isSyncStale(kpi?.lastSyncedAt ?? null)
      ? `⚠ Dữ liệu KPI đồng bộ lần cuối ${syncDateLabel} — có thể đã cũ, job sync có thể đang tạm dừng.`
      : `Dữ liệu KPI cập nhật đến ${syncDateLabel}.`;

  const value: AdminOverviewFiltersValue = {
    teamFilter,
    setTeamFilter,
    teamOptions,
    dateFrom,
    dateTo,
    setDateRange,
    isLoading: dataQuery.isLoading,
    isError: dataQuery.isError,
    scope,
    teams,
    teamTotals,
    channels: dataQuery.data?.channels ?? [],
    kpiTrafficLabel,
    kpiRevenueLabel,
    videoTotal: kpi?.totalVideos ?? 0,
    kpiProgressPct: kpi?.progressPct ?? null,
    kpiSyncNote,
    a5Note: A5_NOT_AVAILABLE_NOTE,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminOverviewFilters() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useAdminOverviewFilters requires AdminOverviewFiltersProvider");
  }
  return v;
}
