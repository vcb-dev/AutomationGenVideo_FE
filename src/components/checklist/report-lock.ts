/**
 * Báo cáo của team đang chọn có đang ở trạng thái "đã nộp — chỉ xem" không.
 *
 * Quyết định cả hai việc: khoá nút Gửi và hiện nút "Sửa báo cáo" (hôm nay). Trước đây nút Sửa chỉ
 * dựa vào `isReadOnly` chung — mà với người nhiều team, cờ đó chỉ bật khi đã nộp HẾT các team, nên
 * team đã nộp bị khoá form nhưng không có nút Sửa, còn nút Gửi vẫn bấm được và BE bỏ qua âm thầm.
 *
 * Tab chỉ báo cáo công việc (showOnlyWork) không có traffic/doanh thu nên chỉ theo `isReadOnly`.
 */
export function isTeamReportLocked(params: {
    isReadOnly: boolean;
    showOnlyWork: boolean;
    selectedTeam: string;
    reportedTeams: string[];
    reportedRevenueTeams: string[];
}): boolean {
    const { isReadOnly, showOnlyWork, selectedTeam, reportedTeams, reportedRevenueTeams } = params;
    if (isReadOnly) return true;
    if (showOnlyWork || !selectedTeam) return false;
    return reportedTeams.includes(selectedTeam) || reportedRevenueTeams.includes(selectedTeam);
}
