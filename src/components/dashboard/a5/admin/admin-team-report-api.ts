"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AdminTeamReportRow {
  id: string;
  team_id: string;
  name: string;
  kpi_completed: number;
  kpi_target: number;
  kpi_day_completed: number;
  kpi_day_target: number;
  traffic_month: number;
  revenue_month: number;
}

export interface AdminTeamReport {
  scope: "single_team" | "all_teams";
  team: { id: string; name: string; member_count: number } | null;
  rows: AdminTeamReportRow[];
  video_by_line: { line: string; count: number }[];
}

/**
 * Báo cáo kiểu leader dashboard cho admin — theo 1 team cụ thể (rows = từng thành viên) hoặc
 * tổng hợp tất cả team (rows = từng team) khi `team` là "all"/bỏ trống. `team` khớp theo Team.name,
 * cùng quy ước với AdminOverviewFiltersContext (dropdown chọn team hiện có).
 */
export function useAdminTeamReport(params: { team: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ["adminTeamReport", params.team, params.dateFrom, params.dateTo],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<AdminTeamReport>("/task-auto/team-report", {
        params: { team: params.team, date_from: params.dateFrom, date_to: params.dateTo },
        signal,
      });
      return data;
    },
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
