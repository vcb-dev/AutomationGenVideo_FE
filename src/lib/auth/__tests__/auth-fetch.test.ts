/**
 * Chức năng: `fetch` có tự cứu phiên — hết hạn thì làm mới rồi gửi lại, thay vì ném 401 ra màn hình.
 *
 * Lỗi thật trên production ngày 13/08/2026: mở tab quá 15 phút là hàng loạt trang chết cùng lúc
 * với 401 — `ai/voice/list`, `ai/voice/usage/stats`, `task-auto/teams`, `scraper/owned/stats`.
 * Bốn tính năng không liên quan gì nhau, nên gốc nằm ở xác thực.
 *
 * Access token sống 15 phút, refresh token sống 7 ngày. `apiClient` (axios) đã có interceptor
 * bắt 401 → gọi /auth/refresh → gửi lại request, nên các trang dùng nó vẫn chạy. Nhưng 30 file
 * gọi `fetch` thô kèm `Bearer` lấy tay từ localStorage thì không đi qua interceptor đó — không
 * refresh, không gửi lại, chỉ hiện toast đỏ rồi nằm im tới khi người dùng tự F5.
 *
 * PHẢI dùng chung đúng một `SessionRefresher` với apiClient, không được tạo cái mới: refresh
 * token bị XOAY VÒNG mỗi lần gọi và BE thu hồi cả family khi phát hiện tái sử dụng
 * (refresh-token.service.ts). Hai refresher chạy song song là tự bắn vào chân mình.
 */

import { createAuthFetch } from '../auth-fetch';
import type { SessionRefresher } from '../refresh-session';

function response(status: number): Response {
    return { status, ok: status >= 200 && status < 300 } as Response;
}

function build({
    statuses,
    newToken = 'token-moi',
    token = 'token-cu',
}: {
    statuses: number[];
    newToken?: string | null;
    token?: string | null;
}) {
    const calls: { url: string; auth: string | undefined }[] = [];
    let i = 0;
    const fetchImpl = jest.fn(async (input: any, init: any) => {
        calls.push({ url: String(input), auth: init?.headers?.Authorization });
        return response(statuses[Math.min(i++, statuses.length - 1)]);
    }) as unknown as typeof fetch;

    const refresh = jest.fn(async () => newToken);
    const refresher: SessionRefresher = { refresh };
    const onSessionDead = jest.fn();

    const authFetch = createAuthFetch({
        fetchImpl,
        refresher,
        getToken: () => token,
        onSessionDead,
    });
    return { authFetch, calls, refresh, onSessionDead };
}

describe('createAuthFetch', () => {
    it('gắn Bearer từ token đang lưu', async () => {
        const { authFetch, calls } = build({ statuses: [200] });

        await authFetch('/api/ai/voice/list');

        expect(calls[0].auth).toBe('Bearer token-cu');
    });

    it('không có token thì không gắn header rỗng', async () => {
        const { authFetch, calls } = build({ statuses: [200], token: null });

        await authFetch('/api/ai/voice/list');

        expect(calls[0].auth).toBeUndefined();
    });

    it('gặp 401 thì làm mới phiên rồi gửi lại bằng token mới', async () => {
        const { authFetch, calls, refresh } = build({ statuses: [401, 200] });

        const res = await authFetch('/api/ai/voice/list');

        expect(refresh).toHaveBeenCalledTimes(1);
        expect(calls).toHaveLength(2);
        expect(calls[1].auth).toBe('Bearer token-moi');
        expect(res.status).toBe(200);
    });

    it('chỉ thử lại MỘT lần — 401 lần nữa là phiên chết thật', async () => {
        const { authFetch, calls, refresh, onSessionDead } = build({ statuses: [401, 401] });

        const res = await authFetch('/api/ai/voice/list');

        expect(refresh).toHaveBeenCalledTimes(1);
        expect(calls).toHaveLength(2);
        expect(res.status).toBe(401);
        expect(onSessionDead).toHaveBeenCalled();
    });

    it('làm mới không được thì trả nguyên 401, không gửi lại vô ích', async () => {
        const { authFetch, calls, onSessionDead } = build({ statuses: [401], newToken: null });

        const res = await authFetch('/api/ai/voice/list');

        expect(calls).toHaveLength(1);
        expect(res.status).toBe(401);
        expect(onSessionDead).toHaveBeenCalled();
    });

    it('request thành công thì không đụng gì tới phiên', async () => {
        const { authFetch, refresh, onSessionDead } = build({ statuses: [200] });

        await authFetch('/api/ai/voice/list');

        expect(refresh).not.toHaveBeenCalled();
        expect(onSessionDead).not.toHaveBeenCalled();
    });

    it('401 ở /auth/login là sai mật khẩu, không được làm mới phiên', async () => {
        const { authFetch, refresh } = build({ statuses: [401] });

        await authFetch('/api/auth/login', { method: 'POST' });

        // Refresh ở đây sẽ nuốt mất thông báo "sai mật khẩu" đáng ra phải hiện cho người dùng.
        expect(refresh).not.toHaveBeenCalled();
    });

    it('giữ nguyên method và body khi gửi lại', async () => {
        const seen: any[] = [];
        const fetchImpl = jest.fn(async (_i: any, init: any) => {
            seen.push(init);
            return response(seen.length === 1 ? 401 : 200);
        }) as unknown as typeof fetch;

        const authFetch = createAuthFetch({
            fetchImpl,
            refresher: { refresh: async () => 'token-moi' },
            getToken: () => 'token-cu',
        });

        await authFetch('/api/ai/voice/tts', {
            method: 'POST',
            body: JSON.stringify({ text: 'xin chào' }),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(seen[1].method).toBe('POST');
        expect(seen[1].body).toBe(JSON.stringify({ text: 'xin chào' }));
        expect(seen[1].headers['Content-Type']).toBe('application/json');
    });
});
