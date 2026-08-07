/**
 * Gọi BE xoá một giọng đã clone (Minimax) — tách khỏi component để test được phần
 * logic thuần: lỗi từ BE/AI phải hiện ra đúng câu chữ thay vì bị nuốt thành "500".
 *
 * Luật giọng nào được phép xoá nằm ở `laGiongDungDuoc` (chon-giong-clone.ts) —
 * cùng luật với giọng nào hiện trong thư mục.
 */

import type { GiongNoi } from './chon-giong-clone';

export type { GiongNoi };

export interface KetQuaXoaGiong {
    voice_id: string;
    name: string;
    /** true = MiniMax đã xoá; false = giọng vốn không còn bên MiniMax; null = provider khác */
    minimax_deleted: boolean | null;
}

/**
 * Gọi BE xoá giọng. apiUrl/authHeaders được truyền vào (không đọc thẳng
 * process.env/localStorage) để test chạy được ngoài trình duyệt.
 */
export async function xoaGiongClone(
    voiceId: string,
    opts: { apiUrl: string; authHeaders: Record<string, string>; fetchImpl?: typeof fetch },
): Promise<KetQuaXoaGiong> {
    const doFetch = opts.fetchImpl ?? fetch;
    const res = await doFetch(`${opts.apiUrl}/ai/voice/${encodeURIComponent(voiceId)}`, {
        method: 'DELETE',
        headers: opts.authHeaders,
    });

    if (!res.ok) {
        // BE Nest trả { message }, AI service (Django) trả { error } — đọc cả hai
        const errMessage = await res.json().then((d: any) => d?.error || d?.message).catch(() => null);
        throw new Error(errMessage || 'Không thể xoá giọng đã clone');
    }

    const data = await res.json();
    if (!data?.success) {
        throw new Error(data?.error || data?.message || 'Xoá giọng thất bại');
    }

    return {
        voice_id: data.voice_id ?? voiceId,
        name: data.name ?? '',
        minimax_deleted: data.minimax_deleted ?? null,
    };
}
