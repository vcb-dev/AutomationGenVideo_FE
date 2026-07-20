'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export const PAGE_SIZE = 10

interface PaginationProps {
  page: number
  pageSize?: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize = PAGE_SIZE, totalItems, onPageChange }: PaginationProps) {
  if (totalItems <= pageSize) return null

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-slate-50/50">
      <span className="text-sm text-slate-500">
        Hiển thị <span className="font-semibold text-slate-700">{start}–{end}</span> trong{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-slate-600 min-w-[80px] text-center">
          Trang {page}/{totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
