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
  /** Số task trong kỳ dùng content được thêm vào kho VÀ gắn vào task cũng trong kỳ này ("content mới"). */
  content_new: number;
  /** Số task còn lại trong kỳ, không gắn với content mới ("content cũ"). */
  content_old: number;
  /** true = row này là content creator — chỉ có ở scope "single_team" (rows theo từng người); scope
   * "all_teams" (rows theo từng team) không set field này vì 1 team có thể gồm cả editor lẫn content
   * creator, không quy về đúng 1 loại. */
  is_content_creator?: boolean;
  content_collected_month?: number;
  content_original_month?: number;
  /** Chỉ có ở scope "single_team", cùng điều kiện với content_collected_month/content_original_month. */
  content_approved_month?: number;
}

export interface AdminTeamReport {
  scope: "single_team" | "all_teams";
  team: { id: string; name: string; member_count: number } | null;
  rows: AdminTeamReportRow[];
  video_by_line: { line: string; count: number }[];
  /** Số video (task đã duyệt) trong kỳ, gộp theo dòng sản phẩm (GMV/Traffic/Profit). */
  product_by_category: { category: string; count: number }[];
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
