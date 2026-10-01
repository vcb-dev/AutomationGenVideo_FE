import { mapReportItem } from '../hooks/useActivityData';

/**
 * Màn xem báo cáo bỏ hẳn nền tảng Zalo: báo cáo đưa ra thẻ không còn mục checklist Zalo, kể cả khi
 * dữ liệu cũ/phản hồi cũ vẫn mang trường zalo.
 */
describe('mapReportItem — bỏ Zalo khỏi báo cáo hiển thị', () => {
    const baseItem = {
        id: 'r1',
        name: 'Nhân Viên A',
        team: 'Team K1',
        status: 'submitted',
        date: '2026-09-30T05:00:00Z',
        checklist: { fb: true, ig: false, tiktok: true, youtube: false, zalo: true, lark: true, caption: true },
        answers: {},
    };

    it('checklist không còn mục zalo dù dữ liệu gửi lên có', () => {
        const mapped = mapReportItem(baseItem);
        expect(mapped.checklist).not.toHaveProperty('zalo');
    });

    it('các mục checklist còn lại giữ nguyên giá trị', () => {
        const mapped = mapReportItem(baseItem);
        expect(mapped.checklist).toMatchObject({ fb: true, ig: false, tiktok: true, youtube: false, lark: true, captionHashtag: true });
    });
});
