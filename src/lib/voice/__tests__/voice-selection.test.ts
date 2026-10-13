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
    isUsableVoice,
    pickDefaultVoice,
    removeVoiceFromList,
    type Voice,
} from '../voice-selection';

const voice = (over: Partial<Voice> & { voice_id: string }): Voice => ({
    name: 'Giọng ' + over.voice_id,
    provider: 'minimax',
    is_cloned: true,
    is_system: false,
    ...over,
});

describe('isUsableVoice', () => {
    it('cho phép giọng clone của Minimax', () => {
        expect(isUsableVoice(voice({ voice_id: 'v1' }))).toBe(true);
    });

    it('coi giọng thiếu provider là Minimax — bản ghi cũ trong DB không ghi cột provider', () => {
        expect(isUsableVoice(voice({ voice_id: 'v1', provider: null }))).toBe(true);
    });

    it('loại giọng hệ thống — không hiện trong danh sách thì cũng không được chọn ngầm', () => {
        expect(isUsableVoice(voice({ voice_id: 'huyk', is_system: true }))).toBe(false);
    });

    it('loại giọng của provider khác (HeyGen) — endpoint TTS ở đây chỉ nói chuyện với Minimax', () => {
        expect(isUsableVoice(voice({ voice_id: 'hg1', provider: 'heygen' }))).toBe(false);
    });

    it('loại giọng không phải clone', () => {
        expect(isUsableVoice(voice({ voice_id: 'v1', is_cloned: false }))).toBe(false);
        expect(isUsableVoice(undefined)).toBe(false);
    });
});

describe('pickDefaultVoice', () => {
    it('giữ nguyên giọng đang chọn khi giọng đó vẫn dùng được', () => {
        const list = [voice({ voice_id: 'a' }), voice({ voice_id: 'b' })];
        expect(pickDefaultVoice(list, 'b')).toBe('b');
    });

    it('nhảy sang giọng đầu tiên khi giọng đang chọn không còn trong danh sách', () => {
        const list = [voice({ voice_id: 'a' }), voice({ voice_id: 'c' })];
        expect(pickDefaultVoice(list, 'b')).toBe('a');
    });

    it('tự chọn giọng đầu tiên khi chưa chọn gì — trạng thái khởi tạo của trang', () => {
        expect(pickDefaultVoice([voice({ voice_id: 'a' })], '')).toBe('a');
    });

    it('KHÔNG giữ giọng hệ thống dù nó có trong danh sách trả về', () => {
        const list = [voice({ voice_id: 'huyk', is_system: true }), voice({ voice_id: 'a' })];
        expect(pickDefaultVoice(list, 'huyk')).toBe('a');
    });

    it('trả chuỗi rỗng khi không còn giọng nào dùng được — thà chặn còn hơn gửi voice_id đã chết sang MiniMax', () => {
        expect(pickDefaultVoice([], 'b')).toBe('');
        expect(pickDefaultVoice([voice({ voice_id: 'huyk', is_system: true })], 'b')).toBe('');
    });
});

describe('removeVoiceFromList', () => {
    it('chỉ bỏ đúng giọng có voice_id trùng, giữ nguyên thứ tự các giọng còn lại', () => {
        const list = [voice({ voice_id: 'a' }), voice({ voice_id: 'b' }), voice({ voice_id: 'c' })];
        expect(removeVoiceFromList(list, 'b').map((v) => v.voice_id)).toEqual(['a', 'c']);
    });
});
