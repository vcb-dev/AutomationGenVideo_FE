/**
 * Nội dung hộp xác nhận cho hai thao tác tốn tiền / không hoàn tác được ở trang
 * Clone Voice: thêm giọng mới (mỗi lần clone đều bị MiniMax tính phí) và xoá giọng
 * (xoá luôn trên MiniMax, muốn dùng lại phải clone lại — lại mất phí).
 *
 * Tách khỏi component vì đây là phần dễ sai nhất và cũng dễ test nhất: nút bấm
 * gọi đúng thao tác nào, câu chữ có nêu đúng hậu quả không.
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
            description: `Giọng "${action.voiceName}" sẽ bị xoá khỏi thư mục và xoá luôn khỏi tài khoản MiniMax.`,
            warning: 'Không hoàn tác được. Muốn dùng lại giọng này bạn phải clone lại từ đầu và bị tính phí thêm một lần.',
            confirmLabel: 'Xoá giọng',
            tone: 'danger',
        };
    }

    const mb = (action.sizeBytes / 1024 / 1024).toFixed(2);
    return {
        title: 'Clone giọng mới?',
        description: `Tạo giọng "${action.voiceName}" (${GENDER_LABEL[action.gender]}) từ file ${action.fileName} — ${mb} MB.`,
        warning: 'Mỗi lần clone đều bị MiniMax tính phí, kể cả khi bạn clone trùng giọng cũ. Kiểm tra lại tên và file mẫu trước khi xác nhận.',
        confirmLabel: 'Clone giọng',
        tone: 'normal',
    };
}
