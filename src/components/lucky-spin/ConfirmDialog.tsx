'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Thao tác xoá dữ liệu tô đỏ để người bấm dừng lại một nhịp. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hỏi lại trước các thao tác không hoàn tác được — giữa buổi sự kiện thì bấm nhầm là mất luôn. */
export function ConfirmDialog({ open, title, description, confirmLabel, danger, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111827]/50 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[22px] border border-[#E8EBEF] bg-white p-7 shadow-[0_24px_48px_rgba(17,24,39,0.18)] dark:border-white/[0.08] dark:bg-[#141821]">
        <span
          className={cn(
            'mb-4 flex h-11 w-11 items-center justify-center rounded-[14px]',
            danger ? 'bg-[#EF4444]/10' : 'bg-[#FFF8E7]',
          )}
        >
          <AlertTriangle className={cn('h-5 w-5', danger ? 'text-[#EF4444]' : 'text-[#F4B63D]')} strokeWidth={2} />
        </span>

        <h3 className="mb-2 text-[20px] font-semibold tracking-[-0.01em] text-[#111827] dark:text-white">{title}</h3>
        <p className="mb-7 text-[15px] leading-relaxed text-[#6B7280] dark:text-gray-400">{description}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-[46px] flex-1 rounded-[14px] border border-[#D6DAE1] bg-white text-[15px] font-semibold text-[#111827] transition-all duration-[250ms] hover:border-[#C3C9D2] dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-gray-200"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'h-[46px] flex-1 rounded-[14px] text-[15px] font-semibold transition-all duration-[250ms] hover:-translate-y-px',
              danger
                ? 'bg-[#EF4444] text-white hover:bg-[#DC2626] hover:shadow-[0_8px_16px_rgba(239,68,68,0.22)]'
                : 'bg-[#F4B63D] text-[#111827] hover:bg-[#E9A616] hover:shadow-[0_8px_16px_rgba(244,182,61,0.18)]',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
