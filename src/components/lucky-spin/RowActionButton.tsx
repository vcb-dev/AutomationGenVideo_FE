'use client';

import { Check, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type RowAction = 'edit' | 'save' | 'cancel' | 'delete';

const ICONS = { edit: Pencil, save: Check, cancel: X, delete: X };

const HOVER_CLASS: Record<RowAction, string> = {
  edit: 'hover:text-amber-500',
  save: 'hover:text-emerald-500',
  cancel: 'hover:text-red-500',
  delete: 'hover:text-red-500',
};

interface Props {
  action: RowAction;
  title: string;
  onClick: () => void;
}

/** Nút icon nhỏ trong ô cuối mỗi hàng bảng: sửa / lưu / hủy / xóa. */
export function RowActionButton({ action, title, onClick }: Props) {
  const Icon = ICONS[action];
  return (
    <button type="button" onClick={onClick} title={title} className={cn('p-1 text-gray-400', HOVER_CLASS[action])}>
      <Icon className="h-4 w-4" />
    </button>
  );
}
