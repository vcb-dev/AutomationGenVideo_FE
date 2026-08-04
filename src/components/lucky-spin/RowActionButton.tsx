'use client';

import { Check, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpinReadOnly } from '@/components/lucky-spin/ReadOnlyContext';

type RowAction = 'edit' | 'save' | 'cancel' | 'delete';

const ICONS = { edit: Pencil, save: Check, cancel: X, delete: X };

const HOVER_CLASS: Record<RowAction, string> = {
  edit: 'hover:border-[#F4B63D] hover:bg-[#FFF8E7] hover:text-[#B98311]',
  save: 'hover:border-[#22C55E] hover:bg-[#22C55E]/10 hover:text-[#22C55E]',
  cancel: 'hover:border-[#D6DAE1] hover:bg-[#F3F4F6] hover:text-[#111827]',
  delete: 'hover:border-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444]',
};

interface Props {
  action: RowAction;
  title: string;
  onClick: () => void;
}

/** Nút icon trong ô cuối mỗi hàng: viền chìm khi nghỉ, hiện màu theo ý nghĩa khi rê chuột. */
export function RowActionButton({ action, title, onClick }: Props) {
  const Icon = ICONS[action];
  const readOnly = useSpinReadOnly();
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={readOnly}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-transparent',
        'text-[#9CA3AF] transition-all duration-[250ms] ease-out',
        readOnly ? 'cursor-not-allowed opacity-40' : HOVER_CLASS[action],
        'dark:text-gray-500',
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </button>
  );
}
