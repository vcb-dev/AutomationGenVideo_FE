import {
    SAPO_UNTRACKED_PLATFORM_IDS,
    isSapoTrackedPlatform,
    hasSelectedSapoTrackedChannel,
} from '../revenue-platforms';

describe('Sapo revenue platforms', () => {
    describe('isSapoTrackedPlatform', () => {
        it('Zalo không được kéo từ Sapo', () => {
            expect(SAPO_UNTRACKED_PLATFORM_IDS).toContain('zalo');
            expect(isSapoTrackedPlatform('zalo')).toBe(false);
        });

        it('các nền tảng gắn page/kênh vẫn được kéo từ Sapo', () => {
            for (const id of ['fb', 'ig', 'tiktok', 'yt', 'thread']) {
                expect(isSapoTrackedPlatform(id)).toBe(true);
            }
        });
    });

    describe('hasSelectedSapoTrackedChannel', () => {
        it('false khi chưa chọn kênh nào', () => {
            expect(
                hasSelectedSapoTrackedChannel({
                    fb: [{ channel: '' }],
                    zalo: [{ channel: '' }],
                }),
            ).toBe(false);
        });

        it('false khi chỉ chọn kênh Zalo — form vẫn được tự nạp kênh từ Sapo', () => {
            expect(
                hasSelectedSapoTrackedChannel({
                    fb: [{ channel: '' }],
                    zalo: [{ channel: 'Zalo - Viễn Chí Bảo' }],
                }),
            ).toBe(false);
        });

        it('true khi đã chọn một kênh Facebook', () => {
            expect(
                hasSelectedSapoTrackedChannel({
                    fb: [{ channel: 'HuyK - Kim Hoàn' }],
                    zalo: [{ channel: '' }],
                }),
            ).toBe(true);
        });

        it('bỏ qua tên kênh chỉ có khoảng trắng và danh sách undefined', () => {
            expect(
                hasSelectedSapoTrackedChannel({
                    tiktok: [{ channel: '   ' }],
                    ig: undefined,
                }),
            ).toBe(false);
        });
    });
});
