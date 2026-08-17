/**
 * Chức năng: `fetchWithAuth` — `fetch` tự đính kèm credentials (HttpOnly cookie) và tự làm mới phiên khi ăn 401.
 */

const mockRefresh = jest.fn();

jest.mock('axios', () => ({
    __esModule: true,
    default: {
        create: () => ({
            interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
            get: jest.fn(),
        }),
        post: jest.fn(),
    },
}));

jest.mock('../refresh-session', () => ({
    ...jest.requireActual('../refresh-session'),
    createSessionRefresher: () => ({ refresh: (...args: unknown[]) => mockRefresh(...args) }),
}));

import { fetchWithAuth } from '../../api-client';

function response(status: number): Response {
    return { status, ok: status >= 200 && status < 300 } as Response;
}

describe('fetchWithAuth', () => {
    let calls: { url: string; credentials: string | undefined }[];

    beforeEach(() => {
        calls = [];
        mockRefresh.mockReset();
    });

    function stubFetch(...statuses: number[]) {
        let i = 0;
        global.fetch = jest.fn(async (input: any, init: any) => {
            calls.push({ url: String(input), credentials: init?.credentials });
            return response(statuses[Math.min(i++, statuses.length - 1)]);
        }) as any;
    }

    it('tự động gắn credentials: include để gửi HttpOnly cookie', async () => {
        stubFetch(200);

        await fetchWithAuth('/api/ai/voice/list');

        expect(calls[0].credentials).toBe('include');
    });

    it('gặp 401 thì làm mới phiên rồi gửi lại bằng cookie mới', async () => {
        stubFetch(401, 200);
        mockRefresh.mockResolvedValue('valid');

        const res = await fetchWithAuth('/api/ai/voice/list');

        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(calls[1].credentials).toBe('include');
        expect(res.status).toBe(200);
    });

    it('làm mới không được thì trả nguyên 401, không gửi lại vô ích', async () => {
        stubFetch(401);
        mockRefresh.mockResolvedValue(null);

        const res = await fetchWithAuth('/api/ai/voice/list');

        expect(calls).toHaveLength(1);
        expect(res.status).toBe(401);
    });

    it('request thành công thì không đụng tới phiên', async () => {
        stubFetch(200);

        await fetchWithAuth('/api/ai/voice/list');

        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('giữ nguyên method và body khi gửi lại', async () => {
        const seen: any[] = [];
        global.fetch = jest.fn(async (_i: any, init: any) => {
            seen.push(init);
            return response(seen.length === 1 ? 401 : 200);
        }) as any;
        mockRefresh.mockResolvedValue('valid');

        await fetchWithAuth('/api/ai/voice/tts', {
            method: 'POST',
            body: JSON.stringify({ text: 'xin chào' }),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(seen[1].method).toBe('POST');
        expect(seen[1].body).toBe(JSON.stringify({ text: 'xin chào' }));
        expect((seen[1].headers as any)['Content-Type']).toBe('application/json');
        expect(seen[1].credentials).toBe('include');
    });

    it('401 ở /auth/login là sai mật khẩu — không được đi làm mới phiên', async () => {
        stubFetch(401);
        mockRefresh.mockResolvedValue('valid');

        await fetchWithAuth('/api/auth/login', { method: 'POST' });

        expect(mockRefresh).not.toHaveBeenCalled();
    });
});
