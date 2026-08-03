'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ResultVariant = 'confirm' | 'continue' | 'cancel';

const VARIANTS: Record<ResultVariant, string> = {
  confirm: 'bg-[#5FBE8C] text-[#123324] hover:bg-[#4CA877]',
  continue: 'border border-[#F0B93C] text-[#C68F1E] hover:bg-[#F0B93C]/10',
  cancel: 'border border-[#E9614F] text-[#E9614F] hover:bg-[#E9614F]/10',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ResultVariant;
}

export function ResultAction({ variant, className, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={cn('w-full rounded-lg px-3 py-3 text-sm font-semibold transition-colors', VARIANTS[variant], className)}
    />
  );
}
