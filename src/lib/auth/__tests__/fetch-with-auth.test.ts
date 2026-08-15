/**
 * Chức năng: `fetchWithAuth` — `fetch` tự gắn token và tự làm mới phiên khi ăn 401.
 *
 * Vì sao đáng một file test riêng: hàm này là lối thoát cho ~24 trang gọi `fetch` thẳng, không đi
 * qua interceptor của axios. Nó đang KHÔNG có test nào, trong khi lỗi ở đây làm hỏng phiên đăng
 * nhập của cả ứng dụng — quan sát trên production ngày 13/08/2026: quá 15 phút là hàng loạt trang
 * cùng ăn 401 rồi đứng im.
 *
 * Test cuối chốt một lỗ hổng còn lại: 401 ở `/auth/login` nghĩa là SAI MẬT KHẨU, không phải phiên
 * hết hạn. Đi làm mới phiên ở đó vừa vô nghĩa (chưa có phiên nào để mới), vừa nuốt mất thông báo
 * "sai mật khẩu" đáng ra phải hiện cho người dùng. `apiClient` đã tránh bằng `shouldAttemptRefresh`;
 * `fetchWithAuth` thì chưa.
 */

// Tên phải bắt đầu bằng "mock" và chỉ được gọi TRỄ bên trong factory: jest kéo `jest.mock` lên
// trên mọi khai báo, tham chiếu thẳng ở đây là chạm biến chưa khởi tạo.
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
    let calls: { url: string; auth: string | undefined }[];

    beforeEach(() => {
        calls = [];
        mockRefresh.mockReset();
        localStorage.setItem('auth_token', 'token-cu');
    });

    function stubFetch(...statuses: number[]) {
        let i = 0;
        global.fetch = jest.fn(async (input: any, init: any) => {
            calls.push({ url: String(input), auth: (init?.headers || {}).Authorization });
            return response(statuses[Math.min(i++, statuses.length - 1)]);
        }) as any;
    }

    it('gắn Bearer từ token đang lưu', async () => {
        stubFetch(200);

        await fetchWithAuth('/api/ai/voice/list');

        expect(calls[0].auth).toBe('Bearer token-cu');
    });

    it('gặp 401 thì làm mới phiên rồi gửi lại bằng token mới', async () => {
        stubFetch(401, 200);
        mockRefresh.mockResolvedValue('token-moi');

        const res = await fetchWithAuth('/api/ai/voice/list');

        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(calls[1].auth).toBe('Bearer token-moi');
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
        mockRefresh.mockResolvedValue('token-moi');

        await fetchWithAuth('/api/ai/voice/tts', {
            method: 'POST',
            body: JSON.stringify({ text: 'xin chào' }),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(seen[1].method).toBe('POST');
        expect(seen[1].body).toBe(JSON.stringify({ text: 'xin chào' }));
        expect((seen[1].headers as any)['Content-Type']).toBe('application/json');
    });

    it('401 ở /auth/login là sai mật khẩu — không được đi làm mới phiên', async () => {
        stubFetch(401);
        mockRefresh.mockResolvedValue('token-moi');

        await fetchWithAuth('/api/auth/login', { method: 'POST' });

        expect(mockRefresh).not.toHaveBeenCalled();
    });
});
