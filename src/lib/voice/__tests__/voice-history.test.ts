import { fetchVoiceActionHistory } from '../voice-history';

function reply(body: any, ok = true) {
    return {
        ok,
        status: ok ? 200 : 500,
        json: async () => body,
    } as unknown as Response;
}

// Mock fetchWithAuth
jest.mock('@/lib/api-client', () => ({
    fetchWithAuth: jest.fn(),
}));

import { fetchWithAuth } from '@/lib/api-client';

describe('fetchVoiceActionHistory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('gọi API đúng URL với các tham số tìm kiếm và bộ lọc', async () => {
        (fetchWithAuth as jest.Mock).mockResolvedValueOnce(
            reply({
                success: true,
                data: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            }),
        );

        await fetchVoiceActionHistory({
            apiUrl: 'http://localhost:3000/api',
            page: 2,
            limit: 15,
            action_type: 'TTS',
            status: 'SUCCESS',
            search: 'KOC Lan',
            date_from: '2026-09-01',
            date_to: '2026-09-09',
        });

        expect(fetchWithAuth).toHaveBeenCalledTimes(1);
        const calledUrl = (fetchWithAuth as jest.Mock).mock.calls[0][0];
        expect(calledUrl).toContain('http://localhost:3000/api/ai/voice/history?');
        expect(calledUrl).toContain('page=2');
        expect(calledUrl).toContain('limit=15');
        expect(calledUrl).toContain('action_type=TTS');
        expect(calledUrl).toContain('status=SUCCESS');
        expect(calledUrl).toContain('search=KOC+Lan');
        expect(calledUrl).toContain('date_from=2026-09-01');
        expect(calledUrl).toContain('date_to=2026-09-09');
    });

    it('bỏ qua filter action_type/status khi giá trị là ALL', async () => {
        (fetchWithAuth as jest.Mock).mockResolvedValueOnce(
            reply({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
        );

        await fetchVoiceActionHistory({
            apiUrl: 'http://localhost:3000/api',
            action_type: 'ALL',
            status: 'ALL',
        });

        const calledUrl = (fetchWithAuth as jest.Mock).mock.calls[0][0];
        expect(calledUrl).not.toContain('action_type');
        expect(calledUrl).not.toContain('status');
    });

    it('ném lỗi khi response không thành công', async () => {
        (fetchWithAuth as jest.Mock).mockResolvedValueOnce(
            reply({ message: 'Chỉ ADMIN mới có quyền xem lịch sử' }, false),
        );

        await expect(
            fetchVoiceActionHistory({ apiUrl: 'http://localhost:3000/api' }),
        ).rejects.toThrow('Chỉ ADMIN mới có quyền xem lịch sử');
    });
});
