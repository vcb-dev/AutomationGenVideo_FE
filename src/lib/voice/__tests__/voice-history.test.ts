import { fetchVoiceActionHistory, resolveAudioUrl } from '../voice-history';
import { checkDuplicateVoice } from '@/lib/api/voice-tts';

function reply(body: any, ok = true) {
    return {
        ok,
        status: ok ? 200 : 500,
        json: async () => body,
    } as unknown as Response;
}

// Mock fetchWithAuth
jest.mock('@/lib/api-client', () => {
    const mockApiClient = {
        post: jest.fn(),
        get: jest.fn(),
    };
    return {
        fetchWithAuth: jest.fn(),
        apiClient: mockApiClient,
        default: mockApiClient,
    };
});

import { fetchWithAuth, apiClient } from '@/lib/api-client';

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
            reply({ message: 'Không thể tải lịch sử thao tác' }, false),
        );

        await expect(
            fetchVoiceActionHistory({ apiUrl: 'http://localhost:3000/api' }),
        ).rejects.toThrow('Không thể tải lịch sử thao tác');
    });
});

describe('resolveAudioUrl', () => {
    it('chuẩn hóa relative path thành URL API đầy đủ', () => {
        const url = resolveAudioUrl('/api/ai/voice/tts/audio/file123');
        expect(url).toContain('/ai/voice/tts/audio/file123');
        expect(url).not.toContain('/api/api/');
    });

    it('giữ nguyên URL tuyệt đối (http/https/data/blob)', () => {
        expect(resolveAudioUrl('https://example.com/voice.mp3')).toBe('https://example.com/voice.mp3');
        expect(resolveAudioUrl('data:audio/mpeg;base64,123')).toBe('data:audio/mpeg;base64,123');
        expect(resolveAudioUrl('blob:http://localhost/test')).toBe('blob:http://localhost/test');
    });

    it('trả về chuỗi rỗng khi url null/undefined', () => {
        expect(resolveAudioUrl(null)).toBe('');
        expect(resolveAudioUrl(undefined)).toBe('');
        expect(resolveAudioUrl('')).toBe('');
    });
});

describe('checkDuplicateVoice', () => {
    it('gọi apiClient.post /ai/voice/check-duplicate với payload text và voice_id', async () => {
        (apiClient.post as jest.Mock).mockResolvedValueOnce({
            data: {
                is_duplicate: true,
                existing_item: {
                    id: 'hist-1',
                    voice_name: 'Giọng Nữ',
                    created_at: '2026-09-18T10:00:00Z',
                },
            },
        });

        const res = await checkDuplicateVoice('Kịch bản test thử', 'voice_123');
        expect(apiClient.post).toHaveBeenCalledWith('/ai/voice/check-duplicate', {
            text: 'Kịch bản test thử',
            voice_id: 'voice_123',
        });
        expect(res.is_duplicate).toBe(true);
        expect(res.existing_item?.voice_name).toBe('Giọng Nữ');
    });
});
