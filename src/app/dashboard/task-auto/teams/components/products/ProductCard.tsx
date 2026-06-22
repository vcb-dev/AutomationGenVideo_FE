'use client'

import { useState } from 'react'
import { Package, Star, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductDetailModal } from './ProductDetailModal'
import type { TeamProduct } from '@/types/task-auto'

interface Props {
  teamProduct: TeamProduct
  canRemove: boolean
  onRemove: () => void
}

export function ProductCard({ teamProduct, canRemove, onRemove }: Props) {
  const [showDetail, setShowDetail] = useState(false)
  const [imgError, setImgError] = useState(false)
  const p = teamProduct.product
  const rawThumb = p?.image_urls?.[0] ?? p?.image_url ?? null
  const thumb = rawThumb && !imgError ? rawThumb : null

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
      >
        {/* Image */}
        <div className="relative h-44 bg-gray-50 overflow-hidden">
          {thumb ? (
            <img
              src={thumb}
              alt={p?.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-slate-200" />
            </div>
          )}

          {/* Market badge */}
          {p?.market && (
            <span className={cn(
              'absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm',
              p.market === 'VIETNAM' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
            )}>
              {p.market === 'VIETNAM' ? 'VN' : 'GL'}
            </span>
          )}

          {/* Delete */}
          {canRemove && (
            <button
              onClick={e => { e.stopPropagation(); onRemove() }}
              className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
              title="Xóa khỏi kho team"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Product line overlay */}
          {p?.product_line && (
            <div className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
              <span className="text-[11px] font-semibold text-white leading-none">{p.product_line.name}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3 py-2.5">
          <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
            {p?.name ?? '—'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{p?.sku}</p>
          <div className="flex items-center justify-between mt-2">
            {p?.price ? (
              <p className="text-sm font-black text-indigo-600">
                {Number(p.price).toLocaleString('vi-VN')}₫
              </p>
            ) : (
              <span className="text-xs text-slate-300">—</span>
            )}
            {(p?.priority_score ?? 0) > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-amber-500">{p?.priority_score}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetail && (
        <ProductDetailModal
          teamProduct={teamProduct}
          canRemove={canRemove}
          onRemove={() => { onRemove(); setShowDetail(false) }}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}
