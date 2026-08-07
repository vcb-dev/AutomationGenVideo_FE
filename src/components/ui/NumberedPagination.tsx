'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NumberedPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Trang 1 ... 4 5 6 ... 20 — giữ tối đa 1 trang liền kề mỗi bên trang hiện tại. */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 1;
  const pages: (number | '...')[] = [];
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);

  if (rangeStart > 2) {
    pages.push(1, '...');
  } else {
    pages.push(1);
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < total - 1) {
    pages.push('...', total);
  } else {
    pages.push(total);
  }

  return pages;
}

export function NumberedPagination({ page, totalPages, onPageChange }: NumberedPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="flex items-center gap-1 px-3 py-2 border border-[#c7c4d7] rounded-xl text-xs font-semibold text-[#464554] hover:bg-[#f6f3f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Trang trước</span>
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-[#464554]/50 select-none">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                p === page
                  ? 'bg-[#4441cc] text-white shadow-sm shadow-[#4441cc]/30'
                  : 'text-[#464554] hover:bg-[#f6f3f5]'
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="flex items-center gap-1 px-3 py-2 border border-[#c7c4d7] rounded-xl text-xs font-semibold text-[#464554] hover:bg-[#f6f3f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="hidden sm:inline">Trang sau</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
