/**
 * Nội dung hộp xác nhận clone / xoá giọng. TTS chạy GPU local, không tính phí MiniMax.
 */

export type VoiceAction =
    | { kind: 'add'; voiceName: string; fileName: string; sizeBytes: number; gender: 'male' | 'female' }
    | { kind: 'delete'; voiceName: string; voiceId: string };

export interface ConfirmContent {
    title: string;
    description: string;
    /** Dòng cảnh báo nền vàng/đỏ — luôn nói rõ khoản tiền hoặc việc không hoàn tác được */
    warning: string;
    confirmLabel: string;
    /** 'danger' → nút đỏ (xoá), 'normal' → nút gradient cyan (thêm) */
    tone: 'danger' | 'normal';
}

const GENDER_LABEL: Record<'male' | 'female', string> = {
    male: 'Nam (Male)',
    female: 'Nữ (Female)',
};

export function buildConfirmContent(action: VoiceAction): ConfirmContent {
    if (action.kind === 'delete') {
        return {
            title: 'Xoá giọng đã clone?',
            description: `Giọng "${action.voiceName}" sẽ bị xoá khỏi thư mục.`,
            warning: 'Không hoàn tác được. Muốn dùng lại phải clone từ file mẫu.',
            confirmLabel: 'Xoá giọng',
            tone: 'danger',
        };
    }

    const mb = (action.sizeBytes / 1024 / 1024).toFixed(2);
    return {
        title: 'Clone giọng mới?',
        description: `Tạo giọng "${action.voiceName}" (${GENDER_LABEL[action.gender]}) từ file ${action.fileName} — ${mb} MB.`,
        warning: 'Kiểm tra tên và file mẫu trước khi xác nhận. Giọng clone cũ (MiniMax) không dùng được trên GPU — hãy clone lại.',
        confirmLabel: 'Clone giọng',
        tone: 'normal',
    };
}
