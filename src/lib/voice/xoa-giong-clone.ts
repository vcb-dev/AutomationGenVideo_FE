/**
 * Xoá một giọng đã clone (Minimax) — tách khỏi component để test được phần logic
 * thuần: chỉ giọng clone mới được xoá, và lỗi từ BE/AI phải hiện ra đúng câu chữ.
 */

export interface GiongNoi {
    voice_id: string;
    name: string;
    gender?: string | null;
    provider?: string | null;
    is_cloned?: boolean;
    is_system?: boolean;
}

export interface KetQuaXoaGiong {
    voice_id: string;
    name: string;
    /** true = MiniMax đã xoá; false = giọng vốn không còn bên MiniMax; null = provider khác */
    minimax_deleted: boolean | null;
}

/**
 * Chỉ giọng clone của Minimax mới dùng được với endpoint TTS này — giọng hệ thống
 * (HuyK mặc định) và giọng provider khác không hiện trong thư mục, nên cũng không
 * được phép xoá qua đây.
 */
export function laGiongXoaDuoc(voice: GiongNoi | undefined | null): boolean {
    if (!voice) return false;
    if (voice.is_system) return false;
    return Boolean(voice.is_cloned) && (voice.provider ?? 'minimax') === 'minimax';
}

/** Bỏ giọng vừa xoá khỏi danh sách đang hiển thị — cập nhật lạc quan, không chờ fetch lại. */
export function boGiongKhoiDanhSach(voices: GiongNoi[], voiceId: string): GiongNoi[] {
    return voices.filter((v) => v.voice_id !== voiceId);
}

/**
 * Chọn giọng thay thế sau khi xoá giọng đang được chọn. Không còn giọng nào thì
 * trả về chuỗi rỗng — để handleGenerate chặn sớm thay vì gửi voice_id đã chết
 * sang MiniMax và nhận lỗi khó hiểu.
 */
export function chonGiongThayThe(voicesConLai: GiongNoi[], voiceIdDangChon: string, voiceIdVuaXoa: string): string {
    if (voiceIdDangChon !== voiceIdVuaXoa) return voiceIdDangChon;
    const conDung = voicesConLai.filter((v) => laGiongXoaDuoc(v));
    return conDung.length > 0 ? conDung[0].voice_id : '';
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
