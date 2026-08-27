'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WorkflowSuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  nextHref: string;
  nextLabel: string;
  stayLabel?: string;
}

/**
 * Modal thông báo thành công và điều hướng sau khi hoàn tất một bước trong luồng thiết bị.
 * Thay vì chèn ô xanh cồng kềnh dưới chân form, modal popup này mang lại trải nghiệm
 * chuyên nghiệp, rõ ràng và cho phép người dùng chọn tiếp tục sang bước sau hoặc ở lại xử lý tiếp.
 */
export function WorkflowSuccessModal({
  open,
  onClose,
  title,
  message,
  nextHref,
  nextLabel,
  stayLabel = 'Ở lại trang này',
}: WorkflowSuccessModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200 dark:border-white/[0.1] dark:bg-slate-900',
          'animate-in zoom-in-95',
        )}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.08] dark:hover:text-slate-300"
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* Icon tích xanh nổi bật */}
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 dark:bg-emerald-500/20 dark:ring-emerald-500/10">
          <svg
            className="h-7 w-7 text-emerald-600 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        {/* Tiêu đề & Nội dung */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {message}
          </p>
        </div>

        {/* Nút hành động */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
          <Link
            href={nextHref}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            {nextLabel}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
          >
            {stayLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
