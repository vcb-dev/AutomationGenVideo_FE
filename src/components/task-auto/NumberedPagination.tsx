'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  page: number
  totalPages: number
  total: number
  itemLabel: string
  onPageChange: (page: number) => void
  className?: string
}

// Danh sách trang hiển thị trong thanh phân trang, rút gọn bằng dấu "..." khi
// quá nhiều trang: luôn giữ trang đầu/cuối + 1 trang lân cận quanh trang hiện tại.
function getPageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total, current - 1, current, current + 1])
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p))

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const items: (number | 'ellipsis')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push('ellipsis')
    items.push(p)
  })
  return items
}

// Thanh phân trang đánh số (dùng chung giữa TasksTable và SubmittedVideosGrid) —
// cho phép nhảy thẳng tới một trang bất kỳ thay vì chỉ prev/next từng bước.
export function NumberedPagination({ page, totalPages, total, itemLabel, onPageChange, className }: Props) {
  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-between flex-wrap gap-3', className)}>
      <span className="text-sm text-slate-500">
        Trang <span className="font-semibold text-slate-700">{page}</span>/{totalPages}
        {' '}·{' '}
        <span className="font-semibold text-slate-700">{total}</span> {itemLabel}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-500 hover:bg-gray-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="sm:hidden px-2.5 text-sm font-semibold text-slate-600 whitespace-nowrap">
          {page} / {totalPages}
        </span>

        <div className="hidden sm:flex items-center gap-1">
          {getPageItems(page, totalPages).map((item, i) =>
            item === 'ellipsis' ? (
              <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-slate-300 select-none">
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                  item === page
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'text-slate-600 border border-transparent hover:border-gray-200 hover:bg-white'
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Trang sau"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-500 hover:bg-gray-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
