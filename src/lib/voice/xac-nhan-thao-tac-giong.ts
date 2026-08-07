/**
 * Nội dung hộp xác nhận cho hai thao tác tốn tiền / không hoàn tác được ở trang
 * Clone Voice: thêm giọng mới (mỗi lần clone đều bị MiniMax tính phí) và xoá giọng
 * (xoá luôn trên MiniMax, muốn dùng lại phải clone lại — lại mất phí).
 *
 * Tách khỏi component vì đây là phần dễ sai nhất và cũng dễ test nhất: nút bấm
 * gọi đúng thao tác nào, câu chữ có nêu đúng hậu quả không.
 */

export type ThaoTacGiong =
    | { loai: 'them'; tenGiong: string; tenFile: string; kichThuocByte: number; gioiTinh: 'male' | 'female' }
    | { loai: 'xoa'; tenGiong: string; voiceId: string };

export interface NoiDungXacNhan {
    tieuDe: string;
    moTa: string;
    /** Dòng cảnh báo nền vàng/đỏ — luôn nói rõ khoản tiền hoặc việc không hoàn tác được */
    canhBao: string;
    nhanNutXacNhan: string;
    /** 'nguy-hiem' → nút đỏ (xoá), 'thuong' → nút gradient cyan (thêm) */
    kieu: 'nguy-hiem' | 'thuong';
}

const NHAN_GIOI_TINH: Record<'male' | 'female', string> = {
    male: 'Nam (Male)',
    female: 'Nữ (Female)',
};

export function noiDungXacNhan(thaoTac: ThaoTacGiong): NoiDungXacNhan {
    if (thaoTac.loai === 'xoa') {
        return {
            tieuDe: 'Xoá giọng đã clone?',
            moTa: `Giọng "${thaoTac.tenGiong}" sẽ bị xoá khỏi thư mục và xoá luôn khỏi tài khoản MiniMax.`,
            canhBao: 'Không hoàn tác được. Muốn dùng lại giọng này bạn phải clone lại từ đầu và bị tính phí thêm một lần.',
            nhanNutXacNhan: 'Xoá giọng',
            kieu: 'nguy-hiem',
        };
    }

    const mb = (thaoTac.kichThuocByte / 1024 / 1024).toFixed(2);
    return {
        tieuDe: 'Clone giọng mới?',
        moTa: `Tạo giọng "${thaoTac.tenGiong}" (${NHAN_GIOI_TINH[thaoTac.gioiTinh]}) từ file ${thaoTac.tenFile} — ${mb} MB.`,
        canhBao: 'Mỗi lần clone đều bị MiniMax tính phí, kể cả khi bạn clone trùng giọng cũ. Kiểm tra lại tên và file mẫu trước khi xác nhận.',
        nhanNutXacNhan: 'Clone giọng',
        kieu: 'thuong',
    };
}
