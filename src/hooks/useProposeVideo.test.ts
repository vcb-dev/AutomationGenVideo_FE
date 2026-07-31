import { useSubmitVideoToLibrary } from './useProposeVideo';
import { useAuthStore } from '@/store/auth-store';
import { videoLibraryService } from '@/services/videoLibraryService';
import { UserRole } from '@/types/auth';

jest.mock('@/store/auth-store');
jest.mock('@/services/videoLibraryService', () => ({
    videoLibraryService: {
        proposeVideo: jest.fn(async () => ({ status: 'ok', message: 'cho duyet', proposal: {} })),
        addVideoDirectly: jest.fn(async () => ({
            status: 'ok', message: 'da them', videoLibraryId: 'lib1', approvedContentId: null,
        })),
    },
}));

/**
 * Lỗi thật người dùng báo: "tại sao admin và leader tự đề xuất video rồi lại tự phải duyệt
 * video mình đề xuất".
 *
 * Nguyên nhân: 15 nút "Đề xuất" ở trang Khám phá Video gọi thẳng proposeVideo cho MỌI vai
 * trò, nên leader/admin bấm xong lại phải vào tab Chờ duyệt duyệt chính mình — trong khi
 * form ở Bộ Sưu Tập đã phân luồng đúng từ trước. Hook này gom quy tắc về một chỗ.
 *
 * Ranh giới phải giữ:
 *   ADMIN, LEADER → addVideoDirectly (vào thẳng Bộ Sưu Tập)
 *   MEMBER, MANAGER, không vai trò → proposeVideo (hàng chờ duyệt)
 *
 * MANAGER nằm ở nhóm chờ duyệt là CÓ CHỦ Ý: BE mở /video-library/direct cho ADMIN/LEADER,
 * gọi bằng MANAGER sẽ ăn 403.
 */
function mockUser(roles: UserRole[] | undefined, token: string | null = 'tok') {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
        token,
        user: roles ? { roles } : null,
    });
}

const payload = {
    video_id: 'v1',
    platform: 'tiktok',
    video_url: 'https://tiktok.com/@a/video/1',
    source: 'SCRAPED' as const,
};

describe('useSubmitVideoToLibrary — phân luồng theo vai trò', () => {
    afterEach(() => jest.clearAllMocks());

    it.each([
        [UserRole.ADMIN],
        [UserRole.LEADER],
    ])('%s → thêm THẲNG vào Bộ Sưu Tập, không tạo đề xuất chờ duyệt', async (role) => {
        mockUser([role]);
        const { submit, canReview } = useSubmitVideoToLibrary();

        await submit(payload);

        expect(canReview).toBe(true);
        expect(videoLibraryService.addVideoDirectly).toHaveBeenCalledTimes(1);
        expect(videoLibraryService.proposeVideo).not.toHaveBeenCalled();
    });

    it.each([
        [UserRole.MEMBER],
        [UserRole.MANAGER],
    ])('%s → vào hàng chờ duyệt', async (role) => {
        mockUser([role]);
        const { submit, canReview } = useSubmitVideoToLibrary();

        await submit(payload);

        expect(canReview).toBe(false);
        expect(videoLibraryService.proposeVideo).toHaveBeenCalledTimes(1);
        expect(videoLibraryService.addVideoDirectly).not.toHaveBeenCalled();
    });

    it('không có thông tin vai trò → mặc định an toàn là chờ duyệt', async () => {
        mockUser(undefined);
        const { submit, canReview } = useSubmitVideoToLibrary();

        await submit(payload);

        expect(canReview).toBe(false);
        expect(videoLibraryService.proposeVideo).toHaveBeenCalledTimes(1);
    });

    it('người có nhiều vai trò, trong đó có LEADER → vẫn vào thẳng', async () => {
        mockUser([UserRole.MEMBER, UserRole.LEADER]);
        const { submit } = useSubmitVideoToLibrary();

        await submit(payload);

        expect(videoLibraryService.addVideoDirectly).toHaveBeenCalledTimes(1);
    });

    it('chưa đăng nhập → báo lỗi, không gọi API nào', async () => {
        mockUser([UserRole.LEADER], null);
        const { submit } = useSubmitVideoToLibrary();

        await expect(submit(payload)).rejects.toThrow('Chưa đăng nhập');
        expect(videoLibraryService.addVideoDirectly).not.toHaveBeenCalled();
        expect(videoLibraryService.proposeVideo).not.toHaveBeenCalled();
    });

    it('nhãn nút và thông báo nói ĐÚNG việc sẽ xảy ra', () => {
        mockUser([UserRole.LEADER]);
        const leader = useSubmitVideoToLibrary();
        expect(leader.actionLabel).toBe('Thêm vào BST');
        expect(leader.doneLabel).toBe('Đã thêm');
        expect(leader.successMessage).toContain('Bộ Sưu Tập');
        expect(leader.successMessage).not.toContain('chờ');

        mockUser([UserRole.MEMBER]);
        const member = useSubmitVideoToLibrary();
        expect(member.actionLabel).toBe('Đề xuất');
        expect(member.doneLabel).toBe('Đã đề xuất');
        expect(member.successMessage).toContain('chờ');
    });

    it('trả về cùng một kiểu dù đi đường nào (để useMutation suy được kiểu)', async () => {
        mockUser([UserRole.LEADER]);
        const asLeader = await useSubmitVideoToLibrary().submit(payload);

        mockUser([UserRole.MEMBER]);
        const asMember = await useSubmitVideoToLibrary().submit(payload);

        expect(Object.keys(asLeader).sort()).toEqual(['message', 'status']);
        expect(Object.keys(asMember).sort()).toEqual(['message', 'status']);
    });
});
