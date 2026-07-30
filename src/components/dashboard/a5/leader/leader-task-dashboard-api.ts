"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface LeaderDashboardMember {
  user_id: string;
  full_name: string;
  email: string;
  pending: number;
  in_progress: number;
  submitted: number;
  approved: number;
  kpi_completed: number;
  kpi_target: number;
  kpi_video_win: number;
  kpi_content_new: number;
  kpi_product_planned: number;
  /** Số task được giao (assigned_at) hôm nay — "mục tiêu" của KPI ngày. */
  kpi_day_target: number;
  /** Số task đã duyệt hôm nay — "hiện tại" của KPI ngày. */
  kpi_day_completed: number;
  /** Tổng traffic tự báo cáo hằng ngày, cộng dồn trong tháng hiện tại. Chưa có KPI/mục tiêu traffic. */
  traffic_month: number;
}

export interface LeaderTaskDashboard {
  scope: "team" | "global" | "personal";
  team: { id: string; name: string; member_count: number } | null;
  tasks: Record<string, number>;
  members: LeaderDashboardMember[];
  kpi: {
    month: string;
    total_target: number;
    completed: number;
    video_win: number;
    content_new: number;
    product_planned: number;
  } | null;
  /** Số video (task đã duyệt) trong tháng của cả team, gộp theo tuyến nội dung A1-A5. */
  video_by_line: { line: string; count: number }[];
}

/**
 * Task thật (task-auto) của team do leader hiện tại đang lead — BE tự khoá theo JWT, không cần truyền team.
 * `month` ("YYYY-MM") lọc báo cáo theo tháng — bỏ trống thì BE mặc định về tháng hiện tại.
 */
export function useLeaderTaskDashboard(params: { month?: string }) {
  return useQuery({
    queryKey: ["leaderTaskDashboard", params.month],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<LeaderTaskDashboard>("/task-auto/dashboard", {
        params: { month: params.month },
        signal,
      });
      return data;
    },
    staleTime: 60 * 1000,
    // Giữ data tháng cũ trên màn hình khi đổi tháng, tránh nháy về spinner/màn hình trống.
    placeholderData: keepPreviousData,
  });
}
