import { pickOwnSapoRows, isChannelOnPlatform, normalizeChannelName, extractNumericChannelId } from '../own-revenue-rows';

describe('normalizeChannelName / extractNumericChannelId', () => {
    it('chuẩn hoá tên: chữ thường, gộp khoảng trắng', () => {
        expect(normalizeChannelName('  HuyK  -  Kim Hoàn ')).toBe('huyk - kim hoàn');
        expect(normalizeChannelName(null)).toBe('');
    });

    it('lấy ID số từ ID thuần, URL Facebook và tag page_id_', () => {
        expect(extractNumericChannelId('148888379055195')).toBe('148888379055195');
        expect(extractNumericChannelId('https://facebook.com/148888379055195')).toBe('148888379055195');
        expect(extractNumericChannelId('page_id_2497800676910664')).toBe('2497800676910664');
        expect(extractNumericChannelId('@huyk.trangsucchetac')).toBe('@huyk.trangsucchetac');
    });
});

describe('pickOwnSapoRows', () => {
    // Dạng dòng breakdown mà /sapo/revenue-preview trả về (doanh thu của CẢ CÔNG TY).
    const companyRows = [
        { channel: 'HuyK - Kim Hoàn', channelId: '2497800676910664', value: '29030000', orderCount: 14 },
        { channel: 'HuyK - Kim Hoàn & Đá Quý', channelId: '148888379055195', value: '24030000', orderCount: 8 },
        { channel: 'Chị Nhạn - Đồ Da Thủ Công', channelId: '1015844401601905', value: '10360000', orderCount: 4 },
    ];

    it('chỉ giữ dòng khớp ID kênh của người dùng', () => {
        const rows = pickOwnSapoRows('fb', companyRows, [{ name: 'Tên khác hẳn', platform: 'FACEBOOK', channel_id: '148888379055195' }]);
        expect(rows.map((r) => r.channel)).toEqual(['HuyK - Kim Hoàn & Đá Quý']);
    });

    it('khớp đúng tên 100%, không nhầm page cùng tiền tố', () => {
        const rows = pickOwnSapoRows('fb', companyRows, [{ name: 'huyk - kim hoàn', platform: 'facebook' }]);
        expect(rows.map((r) => r.channel)).toEqual(['HuyK - Kim Hoàn']);
    });

    it('người dùng không có kênh nào → không điền gì (không lấy doanh thu cả công ty)', () => {
        expect(pickOwnSapoRows('fb', companyRows, [])).toEqual([]);
    });

    it('kênh của người dùng không có đơn trong ngày → không điền gì', () => {
        expect(pickOwnSapoRows('fb', companyRows, [{ name: 'HuyK Silver', platform: 'facebook', channel_id: '2119298598397029' }])).toEqual([]);
    });

    it('bỏ dòng Sapo không có tên lẫn ID kênh', () => {
        expect(pickOwnSapoRows('fb', [{ channel: '', channelId: '', value: '1' }], [{ name: '', platform: 'facebook' }])).toEqual([]);
    });

    it('kênh cùng tên ở nền tảng KHÁC không kéo doanh thu page Facebook về', () => {
        // Dữ liệu thật: page FB "HuyK - Kim Hoàn & Đá Quý" từng bị khớp với kênh YouTube cùng tên.
        const ownedElsewhere = [
            { name: 'HuyK - Kim Hoàn & Đá Quý', platform: 'youtube' },
            { name: 'Chị Nhạn - Đồ Da Thủ Công', platform: 'INSTAGRAM' },
        ];
        expect(pickOwnSapoRows('fb', companyRows, ownedElsewhere)).toEqual([]);
    });

    it('kênh không ghi nền tảng thì không dùng để khớp', () => {
        expect(pickOwnSapoRows('fb', companyRows, [{ name: 'HuyK - Kim Hoàn' }])).toEqual([]);
    });
});

describe('isChannelOnPlatform', () => {
    it('nhận các cách ghi nền tảng khác nhau', () => {
        expect(isChannelOnPlatform('fb', 'FACEBOOK')).toBe(true);
        expect(isChannelOnPlatform('fb', 'Fanpage')).toBe(true);
        expect(isChannelOnPlatform('ig', 'instagram')).toBe(true);
        expect(isChannelOnPlatform('tiktok', 'tiktokshop')).toBe(true);
        expect(isChannelOnPlatform('thread', 'THREADS')).toBe(true);
    });

    it('không nhận nhầm nền tảng khác hoặc giá trị rỗng', () => {
        expect(isChannelOnPlatform('fb', 'instagram')).toBe(false);
        expect(isChannelOnPlatform('fb', 'youtube')).toBe(false);
        expect(isChannelOnPlatform('yt', null)).toBe(false);
    });
});
