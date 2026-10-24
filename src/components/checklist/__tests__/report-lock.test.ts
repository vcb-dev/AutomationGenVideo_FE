import { isTeamReportLocked } from '../report-lock';

/**
 * Lỗi thật: người phụ trách nhiều team nộp báo cáo team A (chưa nộp team B) thì form team A bị
 * khoá nhưng KHÔNG có nút "Sửa báo cáo" — vì nút đó chỉ dựa vào isReadOnly chung, cờ chỉ bật khi
 * đã nộp hết mọi team. Khoá phải tính theo TEAM ĐANG CHỌN, cả traffic lẫn doanh thu.
 */
describe('isTeamReportLocked — khoá form theo team đang chọn', () => {
    const base = {
        isReadOnly: false,
        showOnlyWork: false,
        selectedTeam: 'Team A',
        reportedTeams: [] as string[],
        reportedRevenueTeams: [] as string[],
    };

    it('chưa nộp gì → không khoá', () => {
        expect(isTeamReportLocked(base)).toBe(false);
    });

    it('khoá chung (đã nộp hết) → luôn khoá', () => {
        expect(isTeamReportLocked({ ...base, isReadOnly: true })).toBe(true);
    });

    it('người nhiều team: đã nộp traffic team A, chưa nộp team B → team A khoá (để hiện nút Sửa)', () => {
        expect(isTeamReportLocked({ ...base, reportedTeams: ['Team A'] })).toBe(true);
        expect(isTeamReportLocked({ ...base, selectedTeam: 'Team B', reportedTeams: ['Team A'] })).toBe(false);
    });

    it('chỉ có doanh thu đã nộp cũng tính là đã nộp', () => {
        expect(isTeamReportLocked({ ...base, reportedRevenueTeams: ['Team A'] })).toBe(true);
    });

    it('sau khi bấm Sửa (team bị gỡ khỏi cả 2 danh sách) → mở khoá', () => {
        const afterEdit = { ...base, reportedTeams: ['Team B'], reportedRevenueTeams: ['Team B'] };
        expect(isTeamReportLocked(afterEdit)).toBe(false);
    });

    it('tab chỉ báo cáo công việc không xét traffic/doanh thu', () => {
        expect(isTeamReportLocked({ ...base, showOnlyWork: true, reportedTeams: ['Team A'] })).toBe(false);
    });

    it('người một team (selectedTeam rỗng) chỉ theo khoá chung', () => {
        expect(isTeamReportLocked({ ...base, selectedTeam: '', reportedTeams: ['Team A'] })).toBe(false);
    });
});
