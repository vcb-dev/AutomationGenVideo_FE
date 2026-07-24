/** Team thật (task-auto Team/TeamMember) — không còn mock. Dữ liệu lấy từ GET /lark/dashboard-5a. */

/** ID lọc team trên UI: "all" hoặc TÊN team thật (Team.name — dùng trực tiếp làm query param `team`). */
export type AdminTeamRegionId = string;

export interface TeamOption {
  id: AdminTeamRegionId | "all";
  label: string;
}

export const ALL_TEAMS_OPTION: TeamOption = { id: "all", label: "Tất cả Team" };

/** Giữ export này để các import cũ không vỡ — chỉ còn option "Tất cả Team", danh sách team thật
 * phải lấy từ `useAdminOverviewFilters().teamOptions` (nạp động từ API, không hard-code ở đây nữa). */
export const TEAM_REGION_OPTIONS: TeamOption[] = [ALL_TEAMS_OPTION];
