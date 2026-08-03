'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SpinAccent } from '@/types/lucky-spin';

interface Props {
  open: boolean;
  accent: SpinAccent;
  eyebrow: string;
  name: string;
  subtitle: string;
  children: ReactNode;
}

const BORDER_CLASS: Record<SpinAccent, string> = {
  gold: 'border-[#F0B93C]',
  teal: 'border-[#3FB893]',
};

const EYEBROW_CLASS: Record<SpinAccent, string> = {
  gold: 'text-[#C68F1E]',
  teal: 'text-[#2A8768]',
};

export function ResultDialog({ open, accent, eyebrow, name, subtitle, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
      <div className={cn('w-full max-w-sm rounded-2xl border bg-white p-8 text-center dark:bg-gray-900', BORDER_CLASS[accent])}>
        <div className={cn('mb-2.5 text-xs uppercase tracking-widest', EYEBROW_CLASS[accent])}>{eyebrow}</div>
        <p className="mb-1 text-3xl font-bold">{name}</p>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        <div className="flex flex-col gap-2.5">{children}</div>
      </div>
    </div>
  );
}
