import { pickOwnSapoRows, normalizeChannelName, extractNumericChannelId } from '../own-revenue-rows';

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
        const rows = pickOwnSapoRows(companyRows, [{ name: 'Tên khác hẳn', channel_id: '148888379055195' }]);
        expect(rows.map((r) => r.channel)).toEqual(['HuyK - Kim Hoàn & Đá Quý']);
    });

    it('khớp đúng tên 100%, không nhầm page cùng tiền tố', () => {
        const rows = pickOwnSapoRows(companyRows, [{ name: 'huyk - kim hoàn' }]);
        expect(rows.map((r) => r.channel)).toEqual(['HuyK - Kim Hoàn']);
    });

    it('người dùng không có kênh nào → không điền gì (không lấy doanh thu cả công ty)', () => {
        expect(pickOwnSapoRows(companyRows, [])).toEqual([]);
    });

    it('kênh của người dùng không có đơn trong ngày → không điền gì', () => {
        expect(pickOwnSapoRows(companyRows, [{ name: 'HuyK Silver', channel_id: '2119298598397029' }])).toEqual([]);
    });

    it('bỏ dòng Sapo không có tên lẫn ID kênh', () => {
        expect(pickOwnSapoRows([{ channel: '', channelId: '', value: '1' }], [{ name: '' }])).toEqual([]);
    });
});
