/**
 * Chức năng: gọi BE xoá giọng đã clone ở trang Tiện ích → Clone Voice.
 *
 * Xoá là thao tác KHÔNG hoàn tác được (BE xoá luôn trên MiniMax), nên phần đáng
 * khoá lại là: gọi đúng đường dẫn, và lỗi từ BE/AI phải nổi lên đúng câu chữ thay
 * vì nuốt mất. Luật giọng nào được xoá và danh sách cập nhật ra sao nằm ở
 * __tests__/voice-selection.test.ts.
 */

import { deleteClonedVoice } from '../delete-voice';

function reply(body: any, ok = true, statusText = '') {
    return {
        ok,
        status: ok ? 200 : 500,
        statusText,
        json: async () => body,
    } as unknown as Response;
}

describe('deleteClonedVoice', () => {
    it('gọi DELETE đúng đường dẫn kèm header xác thực', async () => {
        const fetchImpl = jest.fn(async () =>
            reply({ success: true, voice_id: 'v1', name: 'KOC A', minimax_deleted: true }),
        );

        await deleteClonedVoice('v1', {
            apiUrl: 'http://localhost:3000/api',
            authHeaders: { Authorization: 'Bearer t' },
            fetchImpl: fetchImpl as any,
        });

        expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3000/api/ai/voice/v1', {
            method: 'DELETE',
            headers: { Authorization: 'Bearer t' },
            credentials: 'include',
        });
    });

    it('mã hoá voice_id trong URL — voice_id do MiniMax sinh có thể chứa ký tự cần escape', async () => {
        const fetchImpl = jest.fn(async () => reply({ success: true }));

        await deleteClonedVoice('KOC A/1', {
            apiUrl: 'http://localhost:3000/api',
            authHeaders: {},
            fetchImpl: fetchImpl as any,
        });

        expect((fetchImpl.mock.calls[0] as unknown as any[])[0]).toBe('http://localhost:3000/api/ai/voice/KOC%20A%2F1');
    });

    it('trả về minimax_deleted=false khi giọng vốn không còn trên MiniMax', async () => {
        const fetchImpl = jest.fn(async () =>
            reply({ success: true, voice_id: 'v1', name: 'KOC A', minimax_deleted: false }),
        );

        const result = await deleteClonedVoice('v1', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any });

        expect(result).toEqual({ voice_id: 'v1', name: 'KOC A', minimax_deleted: false });
    });

    it('ném lỗi với câu chữ của AI service (field `error`)', async () => {
        const fetchImpl = jest.fn(async () =>
            reply({ error: 'Giọng "HuyK" là giọng hệ thống, không thể xoá' }, false),
        );

        await expect(
            deleteClonedVoice('huyk', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any }),
        ).rejects.toThrow('Giọng "HuyK" là giọng hệ thống, không thể xoá');
    });

    it('ném lỗi với câu chữ của BE Nest (field `message`)', async () => {
        const fetchImpl = jest.fn(async () => reply({ message: 'Unauthorized' }, false));

        await expect(
            deleteClonedVoice('v1', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any }),
        ).rejects.toThrow('Unauthorized');
    });

    it('vẫn báo lỗi rõ ràng khi body lỗi không phải JSON', async () => {
        const fetchImpl = jest.fn(async () => ({
            ok: false,
            status: 502,
            json: async () => { throw new Error('not json'); },
        }));

        await expect(
            deleteClonedVoice('v1', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any }),
        ).rejects.toThrow('Không thể xoá giọng đã clone');
    });

    it('HTTP 200 nhưng success=false vẫn tính là thất bại — không được xoá giọng khỏi UI', async () => {
        const fetchImpl = jest.fn(async () => reply({ success: false, error: 'Minimax API error (1004)' }));

        await expect(
            deleteClonedVoice('v1', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any }),
        ).rejects.toThrow('Minimax API error (1004)');
    });
});
