/**
 * Chức năng: hộp xác nhận trước khi thêm (clone) và trước khi xoá giọng.
 *
 * Cả hai thao tác đều tốn tiền thật (MiniMax tính phí mỗi lần clone) và không hoàn
 * tác được, nên hộp thoại BẮT BUỘC phải nói ra hậu quả — test khoá lại đúng điểm đó,
 * để lần sau ai rút gọn câu chữ là biết ngay.
 */

import { noiDungXacNhan } from '../xac-nhan-thao-tac-giong';

describe('noiDungXacNhan — thêm giọng mới', () => {
    const thaoTac = {
        loai: 'them' as const,
        tenGiong: 'KOC Lan',
        tenFile: 'mau-giong.mp3',
        kichThuocByte: 3 * 1024 * 1024,
        gioiTinh: 'female' as const,
    };

    it('nêu đủ tên giọng, giới tính và file mẫu để người dùng soát lại trước khi mất phí', () => {
        const { moTa } = noiDungXacNhan(thaoTac);
        expect(moTa).toContain('KOC Lan');
        expect(moTa).toContain('Nữ (Female)');
        expect(moTa).toContain('mau-giong.mp3');
    });

    it('quy đổi dung lượng file sang MB 2 chữ số thập phân', () => {
        expect(noiDungXacNhan(thaoTac).moTa).toContain('3.00 MB');
        expect(noiDungXacNhan({ ...thaoTac, kichThuocByte: 1_572_864 }).moTa).toContain('1.50 MB');
    });

    it('cảnh báo nói rõ MỖI LẦN clone đều bị tính phí', () => {
        expect(noiDungXacNhan(thaoTac).canhBao).toMatch(/tính phí/i);
    });

    it('dùng nút thường (không phải nút đỏ) — thêm giọng không phải thao tác phá huỷ', () => {
        const { kieu, nhanNutXacNhan } = noiDungXacNhan(thaoTac);
        expect(kieu).toBe('thuong');
        expect(nhanNutXacNhan).toBe('Clone giọng');
    });

    it('hiển thị đúng nhãn giới tính Nam', () => {
        expect(noiDungXacNhan({ ...thaoTac, gioiTinh: 'male' }).moTa).toContain('Nam (Male)');
    });
});

describe('noiDungXacNhan — xoá giọng', () => {
    const thaoTac = { loai: 'xoa' as const, tenGiong: 'KOC Lan', voiceId: 'KOC_Lan_a1b2c3d4' };

    it('nêu tên giọng sắp xoá — tránh xoá nhầm khi thư mục có nhiều giọng na ná nhau', () => {
        expect(noiDungXacNhan(thaoTac).moTa).toContain('KOC Lan');
    });

    it('nói rõ xoá luôn trên MiniMax, không chỉ ẩn khỏi danh sách', () => {
        expect(noiDungXacNhan(thaoTac).moTa).toMatch(/MiniMax/);
    });

    it('cảnh báo không hoàn tác được và clone lại sẽ mất phí thêm', () => {
        const { canhBao } = noiDungXacNhan(thaoTac);
        expect(canhBao).toMatch(/không hoàn tác/i);
        expect(canhBao).toMatch(/phí/i);
    });

    it('dùng nút đỏ (nguy-hiem) để phân biệt với nút xác nhận thường', () => {
        const { kieu, nhanNutXacNhan } = noiDungXacNhan(thaoTac);
        expect(kieu).toBe('nguy-hiem');
        expect(nhanNutXacNhan).toBe('Xoá giọng');
    });
});
