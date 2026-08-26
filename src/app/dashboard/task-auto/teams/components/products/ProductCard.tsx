'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Package, Trash2, Pencil, RefreshCw } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { ProductViewModal } from '@/components/task-auto/ProductViewModal'
import { MarketBadge } from '../../../catalog/components/ProductsTab/ProductFormFields'
import { parseMarkets } from '../../../catalog/components/ProductsTab/product-utils'
import { refreshTeamProductFromOms } from '@/lib/api/task-auto'
import type { TeamProduct } from '@/types/task-auto'

function formatPrice(price?: string | number | null): string {
  if (!price) return ''
  return Number(price).toLocaleString('vi-VN') + '₫'
}

interface Props {
  teamProduct: TeamProduct
  canRemove: boolean
  onRemove: () => void
  onEdit?: () => void
}

export function ProductCard({ teamProduct, canRemove, onRemove, onEdit }: Props) {
  const qc = useQueryClient()
  const [showDetail, setShowDetail] = useState(false)
  const [imgError, setImgError] = useState(false)
  const p = teamProduct

  const refreshMut = useMutation({
    mutationFn: () => refreshTeamProductFromOms(p.team_id, p.id),
    onSuccess: () => {
      toast.success('Đã làm mới từ OMS')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', p.team_id] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể làm mới từ OMS'),
  })
  const ep = p.source_editor_product
  // Resolve effective values: own data first, fallback to editor product FK
  const name = p.name ?? ep?.name ?? null
  const sku = p.sku ?? ep?.sku ?? null
  const imageUrls = p.image_urls?.length ? p.image_urls : (ep?.image_urls ?? [])
  const imageUrl = p.image_url ?? ep?.image_url ?? null
  const price = p.price ?? ep?.price ?? null
  const priceSegment = p.price_segment ?? ep?.price_segment ?? null
  const market = p.market ?? ep?.market ?? null
  const productLineName = p.product_line?.name ?? null
  const rawThumb = imageUrls[0] ?? imageUrl ?? null
  const thumb = rawThumb && !imgError ? (driveImageUrl(rawThumb) ?? rawThumb) : null
  const markets = parseMarkets(market)

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
      >
        {/* Image */}
        <div className="relative aspect-square bg-gray-100">
          {thumb ? (
            <img
              src={thumb}
              alt={name ?? ''}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
          )}

          {/* Actions */}
          {(canRemove || onEdit) && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              {p.oms_variant_id && (
                <button
                  onClick={e => { e.stopPropagation(); refreshMut.mutate() }}
                  disabled={refreshMut.isPending}
                  className="p-1.5 rounded-lg bg-white/90 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm transition-colors disabled:opacity-50"
                  title="Làm mới từ OMS"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', refreshMut.isPending && 'animate-spin')} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={e => { e.stopPropagation(); onEdit() }}
                  className="p-1.5 rounded-lg bg-white/90 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm transition-colors"
                  title="Chỉnh sửa sản phẩm"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {canRemove && (
                <button
                  onClick={e => { e.stopPropagation(); onRemove() }}
                  className="p-1.5 rounded-lg bg-white/90 text-slate-400 hover:text-red-500 hover:bg-red-50 shadow-sm transition-colors"
                  title="Xóa khỏi kho team"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-base font-semibold text-slate-800 line-clamp-2 min-h-[2.75rem]" title={name ?? undefined}>
            {name || <span className="text-slate-300 italic font-normal text-sm">Chưa đặt tên</span>}
          </p>
          <p className="text-xs text-slate-400 mt-1 truncate min-h-[1rem]">{priceSegment || ' '}</p>

          <div className="flex items-center gap-2 mt-2.5">
            <span className="inline-block bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0">
              {sku || <span className="text-slate-300">—</span>}
            </span>
            <span className="text-xs text-slate-400 truncate">{productLineName || '—'}</span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            {formatPrice(price)
              ? <span className="text-base font-bold text-slate-800">{formatPrice(price)}</span>
              : <span className="text-slate-300 text-sm">—</span>
            }
            <div className="flex gap-1">
              {markets.map(m => <MarketBadge key={m} market={m} />)}
            </div>
          </div>
        </div>
      </div>

      {showDetail && (
        <ProductViewModal
          open
          item={teamProduct as any}
          catalogType="team"
          teamId={teamProduct.team_id}
          canEdit={!!onEdit}
          canDelete={canRemove}
          onClose={() => setShowDetail(false)}
          onEdit={onEdit ? () => { setShowDetail(false); onEdit() } : undefined}
          onDelete={() => { setShowDetail(false); onRemove() }}
        />
      )}
    </>
  )
}
