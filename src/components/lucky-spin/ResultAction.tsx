'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useSpinReadOnly } from '@/components/lucky-spin/ReadOnlyContext';

type ResultVariant = 'confirm' | 'continue' | 'cancel';

const VARIANTS: Record<ResultVariant, string> = {
  confirm:
    'bg-[#F4B63D] text-[#111827] hover:-translate-y-px hover:bg-[#E9A616] hover:shadow-[0_8px_16px_rgba(244,182,61,0.18)]',
  continue:
    'border border-[#D6DAE1] bg-white text-[#111827] hover:-translate-y-px hover:border-[#C3C9D2] ' +
    'hover:shadow-[0_8px_16px_rgba(17,24,39,0.06)] dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-gray-200',
  cancel: 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] dark:hover:bg-white/[0.06] dark:hover:text-gray-100',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ResultVariant;
}

export function ResultAction({ variant, className, disabled, ...props }: Props) {
  const readOnly = useSpinReadOnly();
  return (
    <button
      type="button"
      disabled={disabled || readOnly}
      {...props}
      className={cn(
        'h-[46px] w-full rounded-[14px] text-[15px] font-semibold transition-all duration-[250ms] ease-out disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        className,
      )}
    />
  );
}
