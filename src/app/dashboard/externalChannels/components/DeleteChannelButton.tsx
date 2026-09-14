'use client';

import { Trash } from '@phosphor-icons/react';

interface Props {
  onDelete: () => void;
  disabled?: boolean;
}

/**
 * Nút xoá cứng kênh trong action bar của thẻ kênh khám phá bên ngoài.
 *
 * Chỉ hiện khi trang truyền `onDelete` xuống — các trang chỉ truyền khi người dùng là
 * ADMIN/LEADER, khớp cách `onToggleTracked`/`onScrape` đang được gate. BE vẫn chặn 403
 * độc lập, nút ẩn chỉ là để đỡ mời gọi bấm nhầm.
 *
 * Hộp xác nhận nằm ở phía trang gọi (buildDeleteChannelConfirm) chứ không ở đây, vì chỉ
 * trang mới biết kênh đó đang có bao nhiêu video.
 */
export default function DeleteChannelButton({ onDelete, disabled }: Props) {
  return (
    <button
      onClick={onDelete}
      disabled={disabled}
      className="flex items-center justify-center px-3 py-2.5 text-xs transition-colors text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
      title="Xoá kênh khỏi hệ thống"
    >
      <Trash size={14} weight="regular" />
    </button>
  );
}
