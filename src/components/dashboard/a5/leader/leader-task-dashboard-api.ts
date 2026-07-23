"use client";

import { useQuery } from "@tanstack/react-query";
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
}

/** Task thật (task-auto) của team do leader hiện tại đang lead — BE tự khoá theo JWT, không cần truyền team. */
export function useLeaderTaskDashboard(params: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ["leaderTaskDashboard", params.dateFrom, params.dateTo],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<LeaderTaskDashboard>("/task-auto/dashboard", {
        params: { date_from: params.dateFrom, date_to: params.dateTo },
        signal,
      });
      return data;
    },
    staleTime: 60 * 1000,
  });
}
