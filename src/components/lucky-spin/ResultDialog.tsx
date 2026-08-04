'use client';

import { ReactNode } from 'react';

interface Props {
  open: boolean;
  eyebrow: string;
  name: string;
  subtitle: string;
  children: ReactNode;
}

/** Hộp kết quả: nền mờ tối, card trắng bo lớn, chỉ một vệt màu nhấn ở nhãn phía trên. */
export function ResultDialog({ open, eyebrow, name, subtitle, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#111827]/60 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[22px] border border-[#E8EBEF] bg-white p-8 text-center shadow-[0_24px_48px_rgba(17,24,39,0.18)] dark:border-white/[0.08] dark:bg-[#141821]">
        <div className="mb-4 inline-flex items-center rounded-full bg-[#FFF8E7] px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#B98311] dark:bg-[#F4B63D]/12">
          {eyebrow}
        </div>
        <p className="mb-1.5 text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#111827] dark:text-white">
          {name}
        </p>
        <p className="mb-7 text-[15px] text-[#6B7280] dark:text-gray-400">{subtitle}</p>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}
