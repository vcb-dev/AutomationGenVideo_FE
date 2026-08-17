/**
 * Gọi BE xoá một giọng đã clone (Minimax) — tách khỏi component để test được phần
 * logic thuần: lỗi từ BE/AI phải hiện ra đúng câu chữ thay vì bị nuốt thành "500".
 *
 * Luật giọng nào được phép xoá nằm ở `isUsableVoice` (voice-selection.ts) — cùng
 * luật với giọng nào hiện trong thư mục.
 */

import type { Voice } from './voice-selection';

export type { Voice };

export interface DeleteVoiceResult {
    voice_id: string;
    name: string;
    /** true = MiniMax đã xoá; false = giọng vốn không còn bên MiniMax; null = provider khác */
    minimax_deleted: boolean | null;
}

/**
 * Gọi BE xoá giọng. apiUrl/authHeaders được truyền vào (không đọc thẳng
 * process.env/localStorage) để test chạy được ngoài trình duyệt.
 */
export async function deleteClonedVoice(
    voiceId: string,
    opts: { apiUrl: string; authHeaders?: Record<string, string>; fetchImpl?: typeof fetch },
): Promise<DeleteVoiceResult> {
    const doFetch = opts.fetchImpl ?? fetch;
    const res = await doFetch(`${opts.apiUrl}/ai/voice/${encodeURIComponent(voiceId)}`, {
        method: 'DELETE',
        headers: opts.authHeaders || {},
        credentials: 'include',
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
