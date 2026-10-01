import { TRAFFIC_PLATFORMS, initialTrafficData, initialTrafficChannels } from '../TrafficReportSection';
import { REVENUE_PLATFORMS, initialRevenueData, initialRevenueChannels } from '../RevenueReportSection';
import { CHECKLIST_ITEMS } from '../ChecklistSection';
import { isChannelOnPlatform } from '@/lib/sapo/own-revenue-rows';

/**
 * Hệ thống báo cáo bỏ hẳn nền tảng Zalo: form traffic, form doanh thu và checklist công việc
 * không còn ô/câu Zalo. Dữ liệu cũ trong DB giữ nguyên, chỉ là form không nhập được nữa.
 */
describe('Form báo cáo không còn nền tảng Zalo', () => {
    const FIVE = ['fb', 'ig', 'tiktok', 'yt', 'thread'];

    it('form traffic chỉ còn 5 nền tảng, không có Zalo', () => {
        expect(TRAFFIC_PLATFORMS.map((p) => p.id)).toEqual(FIVE);
        expect(Object.keys(initialTrafficData())).toEqual(FIVE);
        expect(Object.keys(initialTrafficChannels())).toEqual(FIVE);
    });

    it('form doanh thu chỉ còn 5 nền tảng, không có Zalo', () => {
        expect(REVENUE_PLATFORMS.map((p) => p.id)).toEqual(FIVE);
        expect(Object.keys(initialRevenueData())).toEqual(FIVE);
        expect(Object.keys(initialRevenueChannels())).toEqual(FIVE);
    });

    it('checklist công việc không còn câu hỏi đăng video lên Zalo', () => {
        expect(CHECKLIST_ITEMS.some((q) => /zalo/i.test(q))).toBe(false);
        // Các câu BE dùng để chấm điểm checklist (x/6) vẫn còn nguyên
        expect(CHECKLIST_ITEMS).toEqual(expect.arrayContaining([
            'Bạn đã đăng video lên FB chưa?',
            'Bạn đã đăng video lên IG chưa?',
            'Bạn đã đăng video lên Tiktok chưa?',
            'Bạn đã đăng video lên Youtube chưa?',
            'Bạn đã check lại caption và hagtag video chưa?',
            'Bạn đã báo cáo đầy đủ thông tin công việc trên lark chưa?',
        ]));
    });

    it('kênh Zalo không thuộc nền tảng nào của form', () => {
        for (const id of FIVE) {
            expect(isChannelOnPlatform(id, 'zalo')).toBe(false);
            expect(isChannelOnPlatform(id, 'Zalo OA')).toBe(false);
        }
    });
});
