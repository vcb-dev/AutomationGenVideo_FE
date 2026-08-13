/**
 * `fetch` biết tự cứu phiên đăng nhập.
 *
 * Access token sống 15 phút, refresh token sống 7 ngày (cookie HttpOnly `vcbi_rt`). `apiClient`
 * đã bắt 401 → gọi /auth/refresh → gửi lại request, nên các trang dùng axios không bị ảnh hưởng.
 * Nhưng phần lớn ứng dụng gọi `fetch` thô kèm `Bearer` lấy tay từ localStorage — không đi qua
 * interceptor đó, nên cứ quá 15 phút là 401 hàng loạt rồi đứng im (đo trên production 13/08/2026:
 * ai/voice/list, ai/voice/usage/stats, task-auto/teams, scraper/owned/stats cùng chết một lúc).
 *
 * Nhận phụ thuộc từ ngoài để test được mà không phải dựng tầng mạng — đúng quy ước FE của repo.
 */

import { sessionRefresher } from '../api-client';
import { shouldAttemptRefresh, type SessionRefresher } from './refresh-session';

export interface AuthFetchDeps {
    fetchImpl: typeof fetch;
    /**
     * PHẢI là cùng một instance với apiClient đang dùng. Refresh token bị xoay vòng mỗi lần gọi
     * và BE thu hồi cả family khi phát hiện tái sử dụng, nên hai refresher chạy song song sẽ tự
     * giết phiên của chính mình. `createSessionRefresher` gom các lời gọi đồng thời về một.
     */
    refresher: SessionRefresher;
    getToken: () => string | null;
    /** Phiên chết hẳn — bên gọi quyết định dọn localStorage / đá về trang đăng nhập. */
    onSessionDead?: () => void;
}

function withAuth(init: RequestInit | undefined, token: string | null): RequestInit {
    if (!token) return { ...init };
    return { ...init, headers: { ...(init?.headers as Record<string, string>), Authorization: `Bearer ${token}` } };
}

export function createAuthFetch(deps: AuthFetchDeps) {
    const { fetchImpl, refresher, getToken, onSessionDead } = deps;

    return async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = String(input);
        const res = await fetchImpl(input, withAuth(init, getToken()));

        // `shouldAttemptRefresh` dùng chung với interceptor axios: cùng một danh sách đường dẫn
        // không được refresh (/auth/login, /auth/refresh, /auth/logout) và cùng luật "đã thử một
        // lần rồi thì thôi". Chép tay luật đó ra đây là sớm muộn hai bên lệch nhau.
        if (!shouldAttemptRefresh(res.status, url, false)) return res;

        const token = await refresher.refresh().catch(() => null);
        if (!token) {
            onSessionDead?.();
            return res;
        }

        const retried = await fetchImpl(input, withAuth(init, token));
        // Vẫn 401 sau khi đã cầm token mới = phiên chết thật, không phải token vừa hết hạn.
        if (retried.status === 401) onSessionDead?.();
        return retried;
    };
}

/**
 * Bản dùng chung cho cả ứng dụng — chia CHUNG `sessionRefresher` với apiClient (xem chú thích
 * ở AuthFetchDeps.refresher để biết vì sao không được tạo instance riêng).
 */
export const authFetch = createAuthFetch({
    fetchImpl: (input, init) => fetch(input, init),
    refresher: sessionRefresher,
    getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null),
    onSessionDead: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
    },
});
