import { digitsOnly, formatNumberWithDots, sumEntryValues } from './report-total';

/**
 * Lỗi thật ngoài production: người dùng nhập 0 vào ô Doanh thu FB/IG/TikTok rồi bấm
 * "Gửi báo cáo" thì bị chặn với thông báo "Vui lòng nhập số liệu ... (nếu không có hãy
 * nhập số 0)" — đúng cái họ vừa làm. Nguyên nhân: hàm cộng dồn chỉ trả tổng khi tổng > 0,
 * nên nhập 0 bị quy về chuỗi rỗng và bước kiểm tra coi như chưa nhập gì.
 *
 * Ranh giới cần giữ: '' = CHƯA NHẬP,  '0' = ĐÃ NHẬP SỐ 0.
 */
describe('sumEntryValues — phân biệt "chưa nhập" với "nhập số 0"', () => {
    it('nhập số 0 → trả "0", KHÔNG phải chuỗi rỗng (lỗi khiến không nộp được báo cáo)', () => {
        expect(sumEntryValues(['0'])).toBe('0');
    });

    it('chưa nhập gì → trả chuỗi rỗng', () => {
        expect(sumEntryValues([''])).toBe('');
        expect(sumEntryValues([])).toBe('');
        expect(sumEntryValues([undefined, null, ''])).toBe('');
    });

    it('nhiều dòng đều là 0 → vẫn là "0" (đã nhập, giá trị bằng 0)', () => {
        expect(sumEntryValues(['0', '0', '0'])).toBe('0');
    });

    it('trộn dòng có nhập và dòng bỏ trống → chỉ cộng dòng có nhập', () => {
        expect(sumEntryValues(['1000', '', '500'])).toBe('1500');
        expect(sumEntryValues(['', '0', ''])).toBe('0');
    });

    it('bỏ qua ký tự phân cách người dùng gõ vào (1.000.000, 1,000,000)', () => {
        expect(sumEntryValues(['1.000.000'])).toBe('1000000');
        expect(sumEntryValues(['1,000,000', '500.000'])).toBe('1500000');
    });

    it('chuỗi không có chữ số nào → coi như chưa nhập', () => {
        expect(sumEntryValues(['abc'])).toBe('');
        expect(sumEntryValues(['-'])).toBe('');
        expect(sumEntryValues(['   '])).toBe('');
    });

    it('doanh thu rất lớn không bị mất chính xác (lý do dùng BigInt)', () => {
        // Vượt Number.MAX_SAFE_INTEGER (9.007.199.254.740.991)
        expect(sumEntryValues(['9007199254740993', '1'])).toBe('9007199254740994');
    });

    it('kết quả luôn là chuỗi số thuần, dùng thẳng cho bước kiểm tra val !== ""', () => {
        const total = sumEntryValues(['0']);
        expect(typeof total).toBe('string');
        expect(total !== '').toBe(true); // chính là điều kiện ChecklistContainer dùng để cho nộp
    });
});

describe('digitsOnly', () => {
    it('giữ lại đúng chữ số', () => {
        expect(digitsOnly('1.234.567 VNĐ')).toBe('1234567');
        expect(digitsOnly('0')).toBe('0');
        expect(digitsOnly('')).toBe('');
        expect(digitsOnly(undefined as unknown as string)).toBe('');
    });
});

describe('formatNumberWithDots', () => {
    it('định dạng số có dấu chấm phân cách hàng nghìn', () => {
        expect(formatNumberWithDots('1000000')).toBe('1.000.000');
        expect(formatNumberWithDots('50000')).toBe('50.000');
        expect(formatNumberWithDots('123')).toBe('123');
        expect(formatNumberWithDots('0')).toBe('0');
        expect(formatNumberWithDots('')).toBe('');
        expect(formatNumberWithDots(null)).toBe('');
        expect(formatNumberWithDots(undefined)).toBe('');
    });

    it('loại bỏ ký tự lạ trước khi format', () => {
        expect(formatNumberWithDots('1.000.000 views')).toBe('1.000.000');
        expect(formatNumberWithDots('100,000')).toBe('100.000');
    });
});
