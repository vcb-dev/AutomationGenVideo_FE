/**
 * Câu chữ hộp thoại xác nhận trước khi nhập Excel.
 *
 * Nhập Excel nay THAY danh sách chứ không cộng dồn (xem bulkCreateMembers bên BE), nên chọn
 * nhầm file giữa buổi sự kiện là mất sạch danh sách đang chạy.
 *
 * Hộp thoại nêu CON SỐ cụ thể chứ không hỏi chung chung: "Bạn có chắc không?" thì ai cũng
 * bấm đồng ý mà không đọc, còn "sẽ xoá 120 thành viên" mới làm người ta khựng lại. Và phải
 * nói luôn là lịch sử trúng thưởng vẫn còn — thiếu câu đó thì người dùng không dám bấm, dù
 * việc xoá hoàn toàn an toàn với biên bản đã quay.
 *
 * Tách khỏi component để test thẳng, không phải render cả cây React.
 */

export interface ImportConfirmOptions {
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
}

/** Lịch sử nằm ở bảng riêng và đã chụp sẵn tên, xoá danh sách không đụng tới nó. */
const GIU_LICH_SU = 'Lịch sử trúng thưởng đã quay vẫn được giữ nguyên.';

/** Trả null khi chưa có gì để mất — lần nhập đầu tiên không cần chặn người dùng lại. */
export function memberImportConfirm(
  current: { members: number; teams: number },
  incoming: number,
): ImportConfirmOptions | null {
  if (current.members === 0 && current.teams === 0) return null;

  const mat = [`${current.members} thành viên`];
  if (current.teams > 0) mat.push(`${current.teams} team`);

  return {
    title: 'Thay toàn bộ danh sách thành viên?',
    description:
      `Sẽ xoá ${mat.join(' và ')} hiện có, thay bằng ${incoming} dòng trong file vừa chọn. ` +
      GIU_LICH_SU,
    confirmLabel: 'Xoá và nhập mới',
    danger: true,
  };
}

export function giftImportConfirm(currentGifts: number, incoming: number): ImportConfirmOptions | null {
  if (currentGifts === 0) return null;

  return {
    title: 'Thay toàn bộ danh sách quà?',
    description:
      `Sẽ xoá ${currentGifts} quà hiện có, thay bằng ${incoming} dòng trong file vừa chọn. ` +
      'Lịch sử trao quà vẫn được giữ nguyên.',
    confirmLabel: 'Xoá và nhập mới',
    danger: true,
  };
}
