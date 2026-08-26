/**
 * Cộng dồn số liệu các dòng nhập của một nền tảng trong báo cáo Traffic / Doanh thu.
 *
 * Dùng chung cho TrafficReportSection và RevenueReportSection vì cả hai từng dính CÙNG một lỗi:
 * chỉ gửi tổng lên khi tổng > 0, nên người dùng gõ số 0 thì component cha vẫn nhận chuỗi rỗng
 * → bước kiểm tra trước khi nộp báo "hãy nhập số 0" đúng lúc họ VỪA nhập 0, và không nộp nổi
 * báo cáo. Vì vậy ở đây phải phân biệt rạch ròi:
 *
 *   - chưa gõ gì vào ô nào  → ''   (thật sự không có dữ liệu)
 *   - có gõ, dù là 0        → '0'  (có dữ liệu, giá trị bằng 0)
 *
 * Dùng BigInt để doanh thu lớn không bị mất chính xác như số thực.
 */
export function digitsOnly(text: string): string {
    return (text || '').replace(/\D/g, '');
}

/**
 * Chèn dấu chấm ngăn cách hàng nghìn để đọc số cho dễ: 5821696 → 5.821.696.
 *
 * Chỉ dùng để HIỂN THỊ. Giá trị lưu trong state vẫn là chuỗi số thuần, vì `onChange` của ô
 * nhập chạy `digitsOnly` — nên người dùng gõ hay dán "1.234.567 VNĐ" đều quay về "1234567".
 *
 * Chuỗi rỗng phải trả về rỗng, không được thành '0': `sumEntryValues` phân biệt "chưa gõ gì"
 * (chuỗi rỗng) với "gõ số 0" ('0'), và hiện '0' ở ô trống sẽ khiến bước kiểm tra trước khi
 * nộp tưởng đã có dữ liệu.
 */
export function formatThousands(text: string): string {
    const digits = digitsOnly(text);
    if (digits === '') return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function sumEntryValues(values: Array<string | undefined | null>): string {
    let hasAnyValue = false;
    let total = BigInt(0);

    for (const raw of values) {
        const digits = digitsOnly(raw || '');
        if (digits === '') continue;
        hasAnyValue = true;
        total += BigInt(digits);
    }

    return hasAnyValue ? total.toString() : '';
}
