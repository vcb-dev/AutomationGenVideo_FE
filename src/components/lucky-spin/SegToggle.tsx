'use client';

import { cn } from '@/lib/utils';

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

/** Segmented control kiểu Linear: rãnh xám bo tròn, viên đang chọn nổi lên bằng màu nhấn. */
export function SegToggle<T extends string>({ value, onChange, options, className }: Props<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-1 rounded-full bg-[#F3F4F6] p-1 dark:bg-white/[0.05]',
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full px-4 py-2 text-[14px] transition-all duration-[250ms] ease-out',
              active
                ? 'bg-[#F4B63D] font-semibold text-[#111827] shadow-[0_2px_8px_rgba(244,182,61,0.25)]'
                : 'font-medium text-[#6B7280] hover:bg-[#ECEFF3] hover:text-[#111827] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
