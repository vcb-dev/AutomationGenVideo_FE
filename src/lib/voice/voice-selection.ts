/**
 * Luật "giọng nào dùng được" ở trang Tiện ích → Clone Voice, và việc chọn giọng
 * theo luật đó.
 *
 * Để ở một chỗ duy nhất là có lý do: trang này từng tự trả lời câu hỏi đó ở ba
 * nơi bằng ba biểu thức lọc chép tay, và hai trong ba quên loại giọng hệ thống.
 */

export interface Voice {
    voice_id: string;
    name: string;
    gender?: string | null;
    provider?: string | null;
    is_cloned?: boolean;
    is_system?: boolean;
}

/**
 * Giọng dùng được ở trang này: phải là giọng ĐÃ CLONE của Minimax.
 *
 * - Giọng provider khác (HeyGen…) gửi sang endpoint TTS Minimax là lỗi 400.
 * - Giọng hệ thống bị loại vì thư mục bên phải không hiển thị nó: cho phép chọn
 *   ngầm một giọng không nhìn thấy thì người dùng không biết mình đang đọc bằng
 *   giọng gì. Bản ghi cũ trong DB không ghi cột provider nên thiếu = Minimax.
 *
 * Cùng luật này quyết định giọng nào được xoá — thư mục hiện giọng nào thì nút
 * xoá nằm ở đó, mà giọng hệ thống thì AI service từ chối xoá (xem delete_voice_api).
 */
export function isUsableVoice(voice: Voice | undefined | null): boolean {
    if (!voice) return false;
    if (voice.is_system) return false;
    return Boolean(voice.is_cloned) && (voice.provider ?? 'minimax') === 'minimax';
}

/**
 * Giọng nào được chọn sau khi danh sách thay đổi (tải lại, hoặc vừa xoá một giọng).
 *
 * Giữ nguyên lựa chọn cũ nếu nó vẫn dùng được, không thì lấy giọng đầu tiên còn
 * dùng được. Hết sạch thì trả chuỗi rỗng để handleGenerate chặn sớm, thay vì gửi
 * một voice_id đã chết sang MiniMax rồi nhận lỗi khó hiểu.
 */
export function pickDefaultVoice(voices: Voice[], selectedVoiceId: string): string {
    const usable = voices.filter(isUsableVoice);
    if (usable.some((v) => v.voice_id === selectedVoiceId)) return selectedVoiceId;
    return usable.length > 0 ? usable[0].voice_id : '';
}

/** Bỏ giọng vừa xoá khỏi danh sách đang hiển thị — cập nhật lạc quan, không chờ fetch lại. */
export function removeVoiceFromList(voices: Voice[], voiceId: string): Voice[] {
    return voices.filter((v) => v.voice_id !== voiceId);
}
