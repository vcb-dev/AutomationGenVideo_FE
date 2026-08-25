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
 * Format chuỗi số nguyên sang định dạng có dấu chấm phân cách hàng nghìn (VD: "1000000" -> "1.000.000")
 * Dùng cho ô nhập và hiển thị số liệu Traffic và Doanh thu để người dùng dễ đọc.
 */
export function formatNumberWithDots(val: string | number | undefined | null): string {
    if (val === undefined || val === null || val === '') return '';
    const digits = String(val).replace(/\D/g, '');
    if (!digits) return '';
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
