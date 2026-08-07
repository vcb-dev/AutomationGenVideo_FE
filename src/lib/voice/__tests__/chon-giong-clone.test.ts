/**
 * Chức năng: chọn giọng nào đang được dùng ở trang Tiện ích → Clone Voice.
 *
 * Trang này từng có BA nơi tự trả lời câu hỏi "giọng nào dùng được": danh sách bên
 * phải lọc một kiểu, chỗ tự chọn giọng sau khi tải danh sách lọc kiểu khác, nút
 * "Tạo giọng nói" lại lọc kiểu khác nữa. Hai chỗ sau quên loại giọng hệ thống —
 * hậu quả: giọng hệ thống của Minimax được tự chọn ngầm và cho phép bấm tạo,
 * trong khi nó KHÔNG hề hiện trong danh sách, người dùng không thấy mình đang
 * chọn cái gì. Test này khoá lại một luật duy nhất cho cả ba nơi.
 */

import {
    laGiongDungDuoc,
    chonGiongMacDinh,
    boGiongKhoiDanhSach,
    type GiongNoi,
} from '../chon-giong-clone';

const giong = (over: Partial<GiongNoi> & { voice_id: string }): GiongNoi => ({
    name: 'Giọng ' + over.voice_id,
    provider: 'minimax',
    is_cloned: true,
    is_system: false,
    ...over,
});

describe('laGiongDungDuoc', () => {
    it('cho phép giọng clone của Minimax', () => {
        expect(laGiongDungDuoc(giong({ voice_id: 'v1' }))).toBe(true);
    });

    it('coi giọng thiếu provider là Minimax — bản ghi cũ trong DB không ghi cột provider', () => {
        expect(laGiongDungDuoc(giong({ voice_id: 'v1', provider: null }))).toBe(true);
    });

    it('loại giọng hệ thống — không hiện trong danh sách thì cũng không được chọn ngầm', () => {
        expect(laGiongDungDuoc(giong({ voice_id: 'huyk', is_system: true }))).toBe(false);
    });

    it('loại giọng của provider khác (HeyGen) — endpoint TTS ở đây chỉ nói chuyện với Minimax', () => {
        expect(laGiongDungDuoc(giong({ voice_id: 'hg1', provider: 'heygen' }))).toBe(false);
    });

    it('loại giọng không phải clone', () => {
        expect(laGiongDungDuoc(giong({ voice_id: 'v1', is_cloned: false }))).toBe(false);
        expect(laGiongDungDuoc(undefined)).toBe(false);
    });
});

describe('chonGiongMacDinh', () => {
    it('giữ nguyên giọng đang chọn khi giọng đó vẫn dùng được', () => {
        const ds = [giong({ voice_id: 'a' }), giong({ voice_id: 'b' })];
        expect(chonGiongMacDinh(ds, 'b')).toBe('b');
    });

    it('nhảy sang giọng đầu tiên khi giọng đang chọn không còn trong danh sách', () => {
        const ds = [giong({ voice_id: 'a' }), giong({ voice_id: 'c' })];
        expect(chonGiongMacDinh(ds, 'b')).toBe('a');
    });

    it('tự chọn giọng đầu tiên khi chưa chọn gì — trạng thái khởi tạo của trang', () => {
        expect(chonGiongMacDinh([giong({ voice_id: 'a' })], '')).toBe('a');
    });

    it('KHÔNG giữ giọng hệ thống dù nó có trong danh sách trả về', () => {
        const ds = [giong({ voice_id: 'huyk', is_system: true }), giong({ voice_id: 'a' })];
        expect(chonGiongMacDinh(ds, 'huyk')).toBe('a');
    });

    it('trả chuỗi rỗng khi không còn giọng nào dùng được — thà chặn còn hơn gửi voice_id đã chết sang MiniMax', () => {
        expect(chonGiongMacDinh([], 'b')).toBe('');
        expect(chonGiongMacDinh([giong({ voice_id: 'huyk', is_system: true })], 'b')).toBe('');
    });
});

describe('boGiongKhoiDanhSach', () => {
    it('chỉ bỏ đúng giọng có voice_id trùng, giữ nguyên thứ tự các giọng còn lại', () => {
        const ds = [giong({ voice_id: 'a' }), giong({ voice_id: 'b' }), giong({ voice_id: 'c' })];
        expect(boGiongKhoiDanhSach(ds, 'b').map((v) => v.voice_id)).toEqual(['a', 'c']);
    });
});
