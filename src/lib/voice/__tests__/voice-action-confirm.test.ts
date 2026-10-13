/**
 * Chức năng: hộp xác nhận trước khi thêm (clone) và trước khi xoá giọng.
 *
 * Cả hai thao tác đều tốn tiền thật (MiniMax tính phí mỗi lần clone) và không hoàn
 * tác được, nên hộp thoại BẮT BUỘC phải nói ra hậu quả — test khoá lại đúng điểm đó,
 * để lần sau ai rút gọn câu chữ là biết ngay.
 */

import { buildConfirmContent } from '../voice-action-confirm';

describe('buildConfirmContent — thêm giọng mới', () => {
    const action = {
        kind: 'add' as const,
        voiceName: 'KOC Lan',
        fileName: 'mau-giong.mp3',
        sizeBytes: 3 * 1024 * 1024,
        gender: 'female' as const,
    };

    it('nêu đủ tên giọng, giới tính và file mẫu để người dùng soát lại trước khi mất phí', () => {
        const { description } = buildConfirmContent(action);
        expect(description).toContain('KOC Lan');
        expect(description).toContain('Nữ (Female)');
        expect(description).toContain('mau-giong.mp3');
    });

    it('quy đổi dung lượng file sang MB 2 chữ số thập phân', () => {
        expect(buildConfirmContent(action).description).toContain('3.00 MB');
        expect(buildConfirmContent({ ...action, sizeBytes: 1_572_864 }).description).toContain('1.50 MB');
    });

    it('cảnh báo nói rõ MỖI LẦN clone đều bị tính phí', () => {
        expect(buildConfirmContent(action).warning).toMatch(/tính phí/i);
    });

    it('dùng nút thường (không phải nút đỏ) — thêm giọng không phải thao tác phá huỷ', () => {
        const { tone, confirmLabel } = buildConfirmContent(action);
        expect(tone).toBe('normal');
        expect(confirmLabel).toBe('Clone giọng');
    });

    it('hiển thị đúng nhãn giới tính Nam', () => {
        expect(buildConfirmContent({ ...action, gender: 'male' }).description).toContain('Nam (Male)');
    });
});

describe('buildConfirmContent — xoá giọng', () => {
    const action = { kind: 'delete' as const, voiceName: 'KOC Lan', voiceId: 'KOC_Lan_a1b2c3d4' };

    it('nêu tên giọng sắp xoá — tránh xoá nhầm khi thư mục có nhiều giọng na ná nhau', () => {
        expect(buildConfirmContent(action).description).toContain('KOC Lan');
    });

    it('nói rõ xoá luôn trên MiniMax, không chỉ ẩn khỏi danh sách', () => {
        expect(buildConfirmContent(action).description).toMatch(/MiniMax/);
    });

    it('cảnh báo không hoàn tác được và clone lại sẽ mất phí thêm', () => {
        const { warning } = buildConfirmContent(action);
        expect(warning).toMatch(/không hoàn tác/i);
        expect(warning).toMatch(/phí/i);
    });

    it('dùng nút đỏ (danger) để phân biệt với nút xác nhận thường', () => {
        const { tone, confirmLabel } = buildConfirmContent(action);
        expect(tone).toBe('danger');
        expect(confirmLabel).toBe('Xoá giọng');
    });
});
