"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Dashboard5ATeamRow {
  id: string;
  name: string;
  market: string;
  leaderName: string | null;
  staffCount: number;
  videoCount: number;
  traffic: number;
  revenue: number;
  kpiTarget: number;
  progressPct: number | null;
}

export interface Dashboard5AChannelRow {
  id: string;
  name: string;
  platform: string | null;
  team: string | null;
  status: string | null;
}

export interface Dashboard5AKpi {
  totalVideos: number;
  prevVideos: number;
  totalTraffic: number;
  totalRevenue: number;
  totalKpiTarget: number;
  progressPct: number | null;
  /** Ngày report_date mới nhất trong lark_kpi (không lọc theo khoảng ngày đã chọn) — null nếu chưa có. */
  lastSyncedAt: string | null;
}

export interface Dashboard5AResponse {
  scope: "admin" | "leader";
  kpi: Dashboard5AKpi | null;
  teams: Dashboard5ATeamRow[];
  channels: Dashboard5AChannelRow[];
  a5: { available: false; note: string };
}

export interface Dashboard5AParams {
  startDate?: string;
  endDate?: string;
  /** "all" hoặc tên team thật (Team.name) */
  team?: string;
}

/** Ghi chú chuẩn cho mọi phần chưa có dữ liệu thật theo mô hình 5A (A1-A5). */
export const A5_NOT_AVAILABLE_NOTE =
  "Hệ thống chưa phân loại video theo mô hình 5A (A1-A5) — chưa có dữ liệu thật để hiển thị.";

export function useDashboard5A(params: Dashboard5AParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["dashboard5A", params.startDate, params.endDate, params.team],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Dashboard5AResponse>("/lark/dashboard-5a", {
        params: {
          startDate: params.startDate,
          endDate: params.endDate,
          team: params.team && params.team !== "all" ? params.team : undefined,
        },
        signal,
      });
      return data;
    },
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/** Số nguyên thô (view/traffic) → dạng rút gọn "1.85M" / "420K". */
export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? Math.round(m) : Number(m.toFixed(2))}M`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : Number(k.toFixed(1))}K`;
  }
  return `${Math.round(n)}`;
}

/** VNĐ thô → dạng rút gọn "2.8 Tỷ" / "150 Triệu" / "500,000 đ". */
export function formatRevenueVi(vnd: number): string {
  if (!Number.isFinite(vnd) || vnd <= 0) return "0 đ";
  if (vnd >= 1_000_000_000) return `${(vnd / 1_000_000_000).toFixed(1)} Tỷ`;
  if (vnd >= 1_000_000) return `${(vnd / 1_000_000).toFixed(1)} Triệu`;
  return `${Math.round(vnd).toLocaleString("vi-VN")} đ`;
}

/** report_date ISO → "05/07/2026", hoặc null nếu không có mốc nào. */
export function formatSyncDateVi(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Cảnh báo khi mốc đồng bộ Lark cách hiện tại quá xa (job sync có thể đã dừng/trễ). */
export function isSyncStale(iso: string | null | undefined, thresholdDays = 3): boolean {
  if (!iso) return true;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return true;
  return Date.now() - d > thresholdDays * 24 * 60 * 60 * 1000;
}
