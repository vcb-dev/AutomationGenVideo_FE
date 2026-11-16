/**
 * Chức năng: menu "Ngôn ngữ đọc (TTS)" — mỗi giọng nước nào thì đọc bằng ngôn ngữ nước đó.
 */

import {
    TTS_LANGUAGES,
    TTS_LANGUAGE_TO_MINIMAX,
    inferTtsLanguageFromVoiceName,
} from '../tts-languages';

describe('TTS_LANGUAGES', () => {
    it('có tiếng Mã Lai và gửi đúng mã Malay cho Minimax', () => {
        expect(TTS_LANGUAGES).toContain('Bahasa Melayu');
        expect(TTS_LANGUAGE_TO_MINIMAX['Bahasa Melayu']).toBe('Malay');
    });

    it('mọi nhãn trong menu đều có mã Minimax', () => {
        for (const label of TTS_LANGUAGES) {
            expect(TTS_LANGUAGE_TO_MINIMAX[label]).toBeTruthy();
        }
    });
});

describe('inferTtsLanguageFromVoiceName', () => {
    it.each([
        ['HuyK VN', 'Tiếng Việt'],
        ['HuyK USA', 'English'],
        ['HuyK TH', 'ภาษาไทย'],
        ['HuyK TBN', 'Español'],
        ['Huyk JP', '日本語'],
        ['HuyK Malay', 'Bahasa Melayu'],
    ])('giọng production "%s" → %s', (name, expected) => {
        expect(inferTtsLanguageFromVoiceName(name)).toBe(expected);
    });

    it('mọi ngôn ngữ đoán ra đều có trong menu', () => {
        for (const name of ['HuyK VN', 'HuyK USA', 'HuyK TH', 'HuyK TBN', 'Huyk JP', 'HuyK Malay', 'A KR', 'A CN', 'A FR', 'A Germany', 'A Portugal', 'A UK']) {
            expect(TTS_LANGUAGES).toContain(inferTtsLanguageFromVoiceName(name));
        }
    });

    it('chỉ khớp nguyên từ, không khớp chữ nằm giữa tên', () => {
        expect(inferTtsLanguageFromVoiceName('Thanh')).toBeNull();
        expect(inferTtsLanguageFromVoiceName('Myla')).toBeNull();
        expect(inferTtsLanguageFromVoiceName('Jessica')).toBeNull();
    });

    it.each(['Giọng Thảo', 'Chị Thư', 'Anh Thắng', 'Phương Thủy', 'Đức Thành', 'Đen', 'My voice'])(
        'tên tiếng Việt có dấu / từ thường "%s" không bị đoán nhầm nước',
        (name) => {
            expect(inferTtsLanguageFromVoiceName(name)).toBeNull();
        },
    );

    it('nhận tên nước viết đầy đủ', () => {
        expect(inferTtsLanguageFromVoiceName('HuyK Thailand')).toBe('ภาษาไทย');
        expect(inferTtsLanguageFromVoiceName('HuyK Japan')).toBe('日本語');
        expect(inferTtsLanguageFromVoiceName('HuyK Malaysia')).toBe('Bahasa Melayu');
    });

    it('không có ký hiệu nước hoặc tên rỗng thì trả null', () => {
        expect(inferTtsLanguageFromVoiceName('HuyK')).toBeNull();
        expect(inferTtsLanguageFromVoiceName('')).toBeNull();
        expect(inferTtsLanguageFromVoiceName(undefined)).toBeNull();
    });
});
