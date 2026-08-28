'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WorkflowStepId, workflowSteps } from '@/lib/equipment/workflow-steps';

/**
 * Thanh bốn bước của luồng mượn, dùng chung cho cả bốn màn.
 *
 * Hai thứ đổi so với bản cũ:
 *   - BẤM ĐƯỢC. Bản cũ chỉ là hình trang trí, muốn sang bước khác phải đi vòng qua thanh menu
 *     hoặc tìm một dòng chữ gạch chân nhỏ ở cuối trang.
 *   - Màn tự khai mảng bước → chỉ khai MÌNH ĐANG Ở ĐÂU. Bản cũ để mỗi màn chép lại danh sách,
 *     và chúng đã lệch nhau thật.
 *
 * Bước chưa tới vẫn bấm được — xem `workflow-steps.ts`.
 */
export function StepBar({ current }: { current: WorkflowStepId }) {
  const steps = workflowSteps(current);

  return (
    <nav
      aria-label="Các bước của luồng mượn thiết bị"
      className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/40"
    >
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.id} className="relative">
            <Link
              href={step.href}
              aria-current={step.state === 'current' ? 'step' : undefined}
              className={cn(
                'group flex h-full items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200',
                step.state === 'current' &&
                  'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500',
                step.state === 'done' &&
                  'border border-emerald-200/80 bg-emerald-50/60 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100/70 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15',
                step.state === 'todo' &&
                  'border border-slate-200/60 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-900 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200',
              )}
            >
              {/* Badge số / Dấu tích */}
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-transform group-hover:scale-105',
                  step.state === 'current' && 'bg-white text-blue-600 shadow-sm',
                  step.state === 'done' &&
                    'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500',
                  step.state === 'todo' &&
                    'bg-slate-200 text-slate-600 dark:bg-white/[0.1] dark:text-slate-300',
                )}
              >
                {step.state === 'done' ? '✓' : i + 1}
              </span>

              {/* Tên bước & Chú thích */}
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-center justify-between gap-1">
                  <span className="truncate text-sm font-semibold leading-tight">{step.label}</span>
                  {step.state === 'current' && (
                    <span className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase xl:inline-block">
                      Đang ở đây
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block truncate text-[11px] leading-tight',
                    step.state === 'current'
                      ? 'text-blue-100'
                      : step.state === 'done'
                        ? 'text-emerald-600/90 dark:text-emerald-400/90'
                        : 'text-slate-400 dark:text-slate-500',
                  )}
                >
                  {step.hint}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
