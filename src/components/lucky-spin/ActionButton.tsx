'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ActionAccent = 'gold' | 'teal' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  accent?: ActionAccent;
}

const ACCENTS: Record<ActionAccent, string> = {
  gold: 'bg-[#F0B93C] text-[#2A2000] hover:bg-[#C68F1E] hover:text-white font-semibold',
  teal: 'bg-[#3FB893] text-[#0E2B21] hover:bg-[#2A8768] hover:text-white font-semibold',
  ghost:
    'border border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100',
};

export function ActionButton({ accent = 'gold', className, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'rounded-lg px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        ACCENTS[accent],
        className,
      )}
    />
  );
}
