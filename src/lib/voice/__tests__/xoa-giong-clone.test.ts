/**
 * Chức năng: xoá giọng đã clone ở trang Tiện ích → Clone Voice.
 *
 * Xoá là thao tác KHÔNG hoàn tác được (BE xoá luôn trên MiniMax), nên phần logic
 * đáng khoá lại là: xoá đúng giọng nào, danh sách và giọng đang chọn cập nhật ra sao,
 * và lỗi từ BE/AI phải nổi lên đúng câu chữ thay vì nuốt mất.
 */

import {
    laGiongXoaDuoc,
    boGiongKhoiDanhSach,
    chonGiongThayThe,
    xoaGiongClone,
    type GiongNoi,
} from '../xoa-giong-clone';

const giong = (over: Partial<GiongNoi> & { voice_id: string }): GiongNoi => ({
    name: 'Giọng ' + over.voice_id,
    provider: 'minimax',
    is_cloned: true,
    is_system: false,
    ...over,
});

function traLoi(body: any, ok = true, statusText = '') {
    return {
        ok,
        status: ok ? 200 : 500,
        statusText,
        json: async () => body,
    } as unknown as Response;
}

describe('laGiongXoaDuoc', () => {
    it('cho phép xoá giọng clone của Minimax', () => {
        expect(laGiongXoaDuoc(giong({ voice_id: 'v1' }))).toBe(true);
    });

    it('coi giọng thiếu provider là Minimax — bản ghi cũ trong DB không ghi cột provider', () => {
        expect(laGiongXoaDuoc(giong({ voice_id: 'v1', provider: null }))).toBe(true);
    });

    it('KHÔNG cho xoá giọng hệ thống — AI service từ chối, để lọt sẽ hiện nút xoá bấm vào là lỗi', () => {
        expect(laGiongXoaDuoc(giong({ voice_id: 'huyk', is_system: true }))).toBe(false);
    });

    it('KHÔNG cho xoá giọng của provider khác (HeyGen) — delete_voice là API riêng của MiniMax', () => {
        expect(laGiongXoaDuoc(giong({ voice_id: 'hg1', provider: 'heygen' }))).toBe(false);
    });

    it('KHÔNG cho xoá giọng không phải clone', () => {
        expect(laGiongXoaDuoc(giong({ voice_id: 'v1', is_cloned: false }))).toBe(false);
        expect(laGiongXoaDuoc(undefined)).toBe(false);
    });
});

describe('boGiongKhoiDanhSach', () => {
    it('chỉ bỏ đúng giọng có voice_id trùng, giữ nguyên thứ tự các giọng còn lại', () => {
        const ds = [giong({ voice_id: 'a' }), giong({ voice_id: 'b' }), giong({ voice_id: 'c' })];
        expect(boGiongKhoiDanhSach(ds, 'b').map((v) => v.voice_id)).toEqual(['a', 'c']);
    });
});

describe('chonGiongThayThe', () => {
    it('giữ nguyên lựa chọn khi xoá một giọng KHÁC giọng đang chọn', () => {
        const conLai = [giong({ voice_id: 'a' }), giong({ voice_id: 'c' })];
        expect(chonGiongThayThe(conLai, 'a', 'b')).toBe('a');
    });

    it('nhảy sang giọng đầu tiên còn lại khi xoá đúng giọng đang chọn', () => {
        const conLai = [giong({ voice_id: 'a' }), giong({ voice_id: 'c' })];
        expect(chonGiongThayThe(conLai, 'b', 'b')).toBe('a');
    });

    it('trả chuỗi rỗng khi không còn giọng dùng được — thà chặn còn hơn gửi voice_id đã chết sang MiniMax', () => {
        expect(chonGiongThayThe([], 'b', 'b')).toBe('');
    });

    it('bỏ qua giọng hệ thống khi tìm giọng thay thế', () => {
        const conLai = [giong({ voice_id: 'huyk', is_system: true })];
        expect(chonGiongThayThe(conLai, 'b', 'b')).toBe('');
    });
});

describe('xoaGiongClone', () => {
    it('gọi DELETE đúng đường dẫn kèm header xác thực', async () => {
        const fetchImpl = jest.fn(async () =>
            traLoi({ success: true, voice_id: 'v1', name: 'KOC A', minimax_deleted: true }),
        );

        await xoaGiongClone('v1', {
            apiUrl: 'http://localhost:3000/api',
            authHeaders: { Authorization: 'Bearer t' },
            fetchImpl: fetchImpl as any,
        });

        expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3000/api/ai/voice/v1', {
            method: 'DELETE',
            headers: { Authorization: 'Bearer t' },
        });
    });

    it('mã hoá voice_id trong URL — voice_id do MiniMax sinh có thể chứa ký tự cần escape', async () => {
        const fetchImpl = jest.fn(async () => traLoi({ success: true }));

        await xoaGiongClone('KOC A/1', {
            apiUrl: 'http://localhost:3000/api',
            authHeaders: {},
            fetchImpl: fetchImpl as any,
        });

        expect((fetchImpl.mock.calls[0] as unknown as any[])[0]).toBe('http://localhost:3000/api/ai/voice/KOC%20A%2F1');
    });

    it('trả về minimax_deleted=false khi giọng vốn không còn trên MiniMax', async () => {
        const fetchImpl = jest.fn(async () =>
            traLoi({ success: true, voice_id: 'v1', name: 'KOC A', minimax_deleted: false }),
        );

        const kq = await xoaGiongClone('v1', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any });

        expect(kq).toEqual({ voice_id: 'v1', name: 'KOC A', minimax_deleted: false });
    });

    it('ném lỗi với câu chữ của AI service (field `error`)', async () => {
        const fetchImpl = jest.fn(async () =>
            traLoi({ error: 'Giọng "HuyK" là giọng hệ thống, không thể xoá' }, false),
        );

        await expect(
            xoaGiongClone('huyk', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any }),
        ).rejects.toThrow('Giọng "HuyK" là giọng hệ thống, không thể xoá');
    });

    it('ném lỗi với câu chữ của BE Nest (field `message`)', async () => {
        const fetchImpl = jest.fn(async () => traLoi({ message: 'Unauthorized' }, false));

        await expect(
            xoaGiongClone('v1', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any }),
        ).rejects.toThrow('Unauthorized');
    });

    it('vẫn báo lỗi rõ ràng khi body lỗi không phải JSON', async () => {
        const fetchImpl = jest.fn(async () => ({
            ok: false,
            status: 502,
            json: async () => { throw new Error('not json'); },
        }));

        await expect(
            xoaGiongClone('v1', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any }),
        ).rejects.toThrow('Không thể xoá giọng đã clone');
    });

    it('HTTP 200 nhưng success=false vẫn tính là thất bại — không được xoá giọng khỏi UI', async () => {
        const fetchImpl = jest.fn(async () => traLoi({ success: false, error: 'Minimax API error (1004)' }));

        await expect(
            xoaGiongClone('v1', { apiUrl: '/api', authHeaders: {}, fetchImpl: fetchImpl as any }),
        ).rejects.toThrow('Minimax API error (1004)');
    });
});
