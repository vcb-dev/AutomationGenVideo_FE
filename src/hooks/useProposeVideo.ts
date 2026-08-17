'use client';

import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { videoLibraryService, type ProposeVideoPayload } from '@/services/videoLibraryService';

/**
 * Gửi một video vào Bộ Sưu Tập, tự chọn đường đi theo vai trò người bấm.
 *
 * Vì sao cần: 15 nút "Đề xuất" ở trang Khám phá Video đều gọi thẳng proposeVideo, nên
 * leader/admin bấm xong lại phải vào tab "Chờ duyệt" để duyệt chính đề xuất của mình —
 * vô nghĩa vì họ vốn có quyền duyệt. Trong khi form ở Bộ Sưu Tập đã phân biệt đúng từ trước,
 * thành ra hai nơi hành xử lệch nhau. Gom quy tắc về một chỗ để không lệch lại.
 *
 *   ADMIN / LEADER → thêm thẳng vào Bộ Sưu Tập (BE: POST /video-library/direct)
 *   còn lại        → vào hàng chờ duyệt        (BE: POST /video-proposals)
 *
 * MANAGER cố ý KHÔNG nằm trong nhóm duyệt: /video-library/direct chỉ mở cho ADMIN/LEADER
 * (RolesGuard), gọi bằng MANAGER sẽ ăn 403.
 */
export function useSubmitVideoToLibrary() {
    const { token, user } = useAuthStore();

    const canReview = user?.roles?.some((r) =>
        [UserRole.ADMIN, UserRole.LEADER].includes(r),
    ) ?? false;

    /**
     * Gọi trong mutationFn của từng thẻ video — payload giữ nguyên như cũ.
     * Trả về một kiểu DUY NHẤT (hai API bên dưới trả shape khác nhau) để useMutation ở
     * chỗ gọi suy được kiểu; các thẻ video chỉ cần biết thành công hay không.
     */
    const submit = async (
        payload: ProposeVideoPayload,
    ): Promise<{ status: string; message: string }> => {
        if (!token) throw new Error('Chưa đăng nhập');
        const res = canReview
            ? await videoLibraryService.addVideoDirectly(token, payload)
            : await videoLibraryService.proposeVideo(token, payload);
        return { status: res.status, message: res.message };
    };

    return {
        submit,
        canReview,
        /** Nhãn nút phải nói đúng việc thực sự xảy ra khi bấm. */
        actionLabel: canReview ? 'Thêm vào BST' : 'Đề xuất',
        doneLabel: canReview ? 'Đã thêm' : 'Đã đề xuất',
        successMessage: canReview
            ? 'Đã thêm vào Bộ Sưu Tập.'
            : 'Đã gửi đề xuất, chờ leader/admin duyệt.',
    };
}
