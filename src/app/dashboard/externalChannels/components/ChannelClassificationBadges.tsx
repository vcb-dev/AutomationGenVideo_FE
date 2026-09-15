'use client';

import { ShoppingBag, Sparkle, Tag } from '@phosphor-icons/react';

export const TAG_COLOR_MAP: Record<string, string> = {
  vang: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  da_quy: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  kim_cuong: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  che_tac: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  bac: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  moissanite: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
};

export const TAG_NAME_FALLBACK: Record<string, string> = {
  vang: 'Vàng',
  da_quy: 'Đá quý',
  kim_cuong: 'Kim cương',
  che_tac: 'Chế tác',
  bac: 'Bạc',
  moissanite: 'Moissanite',
};

interface ChannelClassificationBadgesProps {
  channelType?: 'product' | 'content';
  productLines?: string[];
  onEdit?: () => void;
}

export default function ChannelClassificationBadges({
  channelType = 'product',
  productLines = [],
  onEdit,
}: ChannelClassificationBadgesProps) {
  const isContent = channelType === 'content';

  return (
    <div className="px-3.5 pb-1 flex flex-wrap items-center gap-1.5" onClick={(e) => onEdit ? e.stopPropagation() : undefined}>
      {isContent ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
          <Sparkle size={11} weight="bold" />
          Content
        </span>
      ) : (
        <>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            <ShoppingBag size={11} weight="bold" />
            Sản phẩm
          </span>
          {productLines.map((slug) => (
            <span
              key={slug}
              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                TAG_COLOR_MAP[slug] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {TAG_NAME_FALLBACK[slug] || slug}
            </span>
          ))}
        </>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="inline-flex items-center text-[11px] text-slate-400 hover:text-primary transition-colors ml-0.5 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Sửa phân loại kênh"
        >
          <Tag size={12} />
        </button>
      )}
    </div>
  );
}
