'use client';

import { cn } from '@/lib/utils';
import { SpinAccent } from '@/types/lucky-spin';

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  accent?: SpinAccent;
  className?: string;
}

const ACTIVE_CLASS: Record<SpinAccent, string> = {
  gold: 'bg-[#F0B93C] text-[#2A2000]',
  teal: 'bg-[#3FB893] text-[#0E2B21]',
};

export function SegToggle<T extends string>({ value, onChange, options, accent = 'gold', className }: Props<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-1 rounded-full border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-sm transition-colors',
            value === opt.value
              ? ACTIVE_CLASS[accent]
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
