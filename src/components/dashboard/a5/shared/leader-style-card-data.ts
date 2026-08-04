/**
 * Shape dữ liệu tối thiểu để render LeaderMemberCard — dùng chung cho cả "1 người" (leader dashboard)
 * và "1 team" (admin dashboard, chế độ tổng hợp tất cả team) vì cả 2 đều là "1 thực thể + 4 chỉ số".
 */
export interface LeaderStyleCardData {
  id: string;
  name: string;
  kpi_completed: number;
  kpi_target: number;
  kpi_day_completed: number;
  kpi_day_target: number;
  traffic_month: number;
}
