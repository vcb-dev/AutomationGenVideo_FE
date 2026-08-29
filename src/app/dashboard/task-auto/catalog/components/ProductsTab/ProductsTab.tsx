'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Package, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { searchOmsProducts } from '@/lib/api/task-auto'
import { OmsProductSummary } from '@/types/task-auto'
import { OmsProductViewModal } from '@/components/task-auto/OmsProductViewModal'
import { formatPrice } from './product-utils'

type BrandType = 'DO_DA' | 'TRANG_SUC'

const PAGE_SIZE = 24

// Kho tổng đọc trực tiếp (proxy) từ OMS — không còn tạo/sửa/xoá sản phẩm thủ công ở đây, và
// không có khái niệm dòng sản phẩm/chất liệu/phân loại/brand/tháng như trước (OMS là 1 danh mục
// dùng chung, không tách theo team/tháng). Xem module oms-integration ở BE.
export function ProductsTab({ brandType: _brandType, month: _month, onMonthChange: _onMonthChange }: { brandType: BrandType; month: string; onMonthChange: (month: string) => void }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewProductId, setViewProductId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'oms-products', search, page],
    queryFn: () => searchOmsProducts({ q: search || undefined, page, page_size: PAGE_SIZE }),
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const items: OmsProductSummary[] = data?.data ?? []

  return (
    <div className="space-y-5">

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm kiếm SKU, tên sản phẩm (từ OMS)..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Kho tổng hiển thị trực tiếp danh mục từ OMS (chỉ đọc). Muốn dùng sản phẩm, hãy kéo về kho team.
        </p>
      </div>

      {/* Summary */}
      {total > 0 && (
        <p className="text-sm text-slate-500 px-1">
          Tổng <span className="font-bold text-slate-700">{total}</span> sản phẩm
          {search && <span> · kết quả cho "<span className="font-semibold text-indigo-600">{search}</span>"</span>}
        </p>
      )}

      {/* Grid */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-square bg-gray-100 animate-pulse" />
              <div className="p-2.5 space-y-1.5">
                <div className="h-3.5 bg-gray-100 rounded animate-pulse w-4/5" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-2/3" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <EmptyState icon={Package} title="Không có sản phẩm nào" />
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map(p => (
            <div
              key={p.id}
              onClick={() => setViewProductId(p.id)}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
            >
              {/* Image */}
              <div className="relative aspect-square bg-gray-100">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5">
                <p className="text-sm font-semibold text-slate-800 line-clamp-2 min-h-[2.25rem]" title={p.name}>
                  {p.name || <span className="text-slate-300 italic font-normal text-xs">Chưa đặt tên</span>}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate min-h-[0.9rem]">
                  {p.tags.length > 0 ? p.tags.join(', ') : ' '}
                </p>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-block bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0">
                    {p.default_sku || <span className="text-slate-300">—</span>}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">{p.vendor || '—'}</span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  {formatPrice(String(p.price_from))
                    ? <span className="text-sm font-bold text-slate-800">{formatPrice(String(p.price_from))}</span>
                    : <span className="text-slate-300 text-xs">—</span>
                  }
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{p.variant_count} biến thể</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border border-gray-200 rounded-2xl bg-white shadow-sm">
          <span className="text-sm text-slate-500">
            Trang <span className="font-semibold text-slate-700">{page}</span> / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7
                ? i + 1
                : page <= 4
                  ? i + 1
                  : page >= totalPages - 3
                    ? totalPages - 6 + i
                    : page - 3 + i
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={cn('w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                    pg === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 text-slate-600'
                  )}>
                  {pg}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewProductId && (
        <OmsProductViewModal
          open
          omsProductId={viewProductId}
          onClose={() => setViewProductId(null)}
        />
      )}
    </div>
  )
}
