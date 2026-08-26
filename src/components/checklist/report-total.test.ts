import { digitsOnly, sumEntryValues, formatThousands } from './report-total';

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

describe('formatThousands', () => {
    it('chèn dấu chấm mỗi 3 chữ số theo cách viết số của tiếng Việt', () => {
        expect(formatThousands('5821696')).toBe('5.821.696');
    });

    it('số ngắn hơn 4 chữ số thì giữ nguyên', () => {
        expect(formatThousands('0')).toBe('0');
        expect(formatThousands('999')).toBe('999');
    });

    it('đúng ở mốc 4 chữ số', () => {
        expect(formatThousands('1000')).toBe('1.000');
    });

    it('chuỗi rỗng trả rỗng — ô nhập chưa gõ gì không được hiện "0"', () => {
        // Phân biệt "chưa gõ" với "gõ số 0" là ràng buộc sẵn có của sumEntryValues:
        // hiện '0' ở ô trống sẽ khiến bước kiểm tra trước khi nộp hiểu nhầm là đã có dữ liệu.
        expect(formatThousands('')).toBe('');
    });

    it('bỏ ký tự không phải số trước khi chèn dấu — chịu được giá trị dán vào', () => {
        expect(formatThousands('1.234.567 VNĐ')).toBe('1.234.567');
    });

    it('đi cùng digitsOnly thành vòng khép kín: hiển thị có dấu, lưu vẫn là số thuần', () => {
        // Ô nhập hiện formatThousands(...) còn onChange chạy digitsOnly(...), nên người dùng
        // gõ hay dán đều quay về đúng chuỗi số ban đầu.
        expect(digitsOnly(formatThousands('5821696'))).toBe('5821696');
    });
});
