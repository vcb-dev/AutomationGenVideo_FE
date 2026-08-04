'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useSpinReadOnly } from '@/components/lucky-spin/ReadOnlyContext';

type ActionVariant = 'primary' | 'secondary';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
}

const BASE =
  'inline-flex h-[46px] items-center justify-center gap-2 rounded-[14px] px-5 text-[15px] font-semibold ' +
  'transition-all duration-[250ms] ease-out disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none';

const VARIANTS: Record<ActionVariant, string> = {
  primary:
    'bg-[#F4B63D] text-[#111827] hover:-translate-y-px hover:bg-[#E9A616] ' +
    'hover:shadow-[0_8px_16px_rgba(244,182,61,0.18)] ' +
    'disabled:bg-[#F3E6BF] disabled:text-[#A38B4A] ' +
    'dark:disabled:bg-[#F4B63D]/20 dark:disabled:text-[#F4B63D]/50',
  secondary:
    'border border-[#D6DAE1] bg-white text-[#111827] hover:-translate-y-px hover:border-[#C3C9D2] ' +
    'hover:shadow-[0_8px_16px_rgba(17,24,39,0.06)] disabled:text-[#9CA3AF] ' +
    'dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-gray-200 dark:hover:border-white/20',
};

export function ActionButton({ variant = 'primary', className, disabled, ...props }: Props) {
  // Người khác đang điều khiển thì mọi nút hành động khoá lại, không cần sửa từng chỗ gọi.
  const readOnly = useSpinReadOnly();
  return (
    <button
      type="button"
      disabled={disabled || readOnly}
      {...props}
      className={cn(BASE, VARIANTS[variant], className)}
    />
  );
}
