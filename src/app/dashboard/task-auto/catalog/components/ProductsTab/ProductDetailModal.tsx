'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Edit2, Package, Database, Loader2, ExternalLink, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSources } from '@/lib/api/task-auto'
import { SOURCE_TYPE_COLORS, parseMarkets, formatPrice } from './product-utils'
import { MarketBadge } from './ProductFormFields'
import { Product, SOURCE_TYPE_LABELS } from '@/types/task-auto'

export function ProductDetailModal({ product, onClose, onEdit }: {
  product: Product
  onClose: () => void
  onEdit: () => void
}) {
  const [imgIdx, setImgIdx] = useState(0)

  const images = product.image_urls?.length
    ? product.image_urls
    : product.image_url ? [product.image_url] : []

  const { data: sourcesData, isLoading: loadingSources } = useQuery({
    queryKey: ['task-auto', 'sources', 'by-product', product.id],
    queryFn: () => getSources({ product_id: product.id, limit: 100 }),
  })
  const sources = sourcesData?.data ?? []

  return (
    <div className="fixed inset-0 z-[1003] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-black/8">

        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                {product.sku}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', product.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                {product.is_active ? 'Hoạt động' : 'Ẩn'}
              </span>
            </div>
            <h2 className="font-bold text-slate-900 text-lg leading-snug">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Image + Price row */}
          <div className="flex gap-5 items-start">
            {/* Image block */}
            <div className="shrink-0">
              <div className="w-36 h-36 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                {images.length > 0 ? (
                  <img
                    src={images[imgIdx]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package className="w-10 h-10 text-slate-200" />
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-1.5 mt-2 overflow-x-auto" style={{ maxWidth: 144 }}>
                  {images.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={cn(
                        'shrink-0 w-9 h-9 rounded-lg overflow-hidden border-2 transition-all',
                        i === imgIdx ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'
                      )}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price + market */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-xs text-slate-400 mb-1">Giá bán</p>
              <p className="text-3xl font-bold text-red-600 mb-3 leading-none">
                {formatPrice(product.price) ?? (
                  <span className="text-slate-300 text-base font-normal italic">Chưa có giá</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {parseMarkets(product.market).map(m => <MarketBadge key={m} market={m} />)}
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div className="grid grid-cols-2 gap-2.5">
            {product.product_line && (
              <div className="bg-gray-50 rounded-xl px-3.5 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Dòng sản phẩm</p>
                <p className="text-sm font-semibold text-slate-800">{product.product_line.name}</p>
              </div>
            )}
            {product.material && (
              <div className="bg-gray-50 rounded-xl px-3.5 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Chất liệu</p>
                <p className="text-sm font-semibold text-slate-800">{product.material.name}</p>
              </div>
            )}
            {product.price_segment && (
              <div className="bg-gray-50 rounded-xl px-3.5 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Phân khúc giá</p>
                <p className="text-sm font-semibold text-slate-800">{product.price_segment}</p>
              </div>
            )}
            {(product.priority_score ?? 0) > 0 && (
              <div className="bg-amber-50 rounded-xl px-3.5 py-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <div>
                  <p className="text-xs text-amber-600 mb-0.5">Điểm ưu tiên</p>
                  <p className="text-sm font-bold text-amber-700">{product.priority_score}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sources */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">
                Sources {!loadingSources && `(${sources.length})`}
              </p>
            </div>

            {loadingSources ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            ) : sources.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Chưa có source nào gắn với sản phẩm này</p>
            ) : (
              <div className="space-y-1.5">
                {sources.map(s => (
                  <a
                    key={s.id}
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
                  >
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold shrink-0',
                      SOURCE_TYPE_COLORS[s.type] ?? 'bg-gray-100 text-gray-500'
                    )}>
                      {SOURCE_TYPE_LABELS[s.type]}
                    </span>
                    <span className="text-sm font-medium text-slate-700 truncate flex-1">{s.name}</span>
                    {s.code && (
                      <span className="font-mono text-xs text-slate-400 shrink-0">{s.code}</span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Meta */}
          {(product.added_by || product.created_at) && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 pt-3 border-t border-gray-100">
              {product.added_by && (
                <span>
                  Thêm bởi{' '}
                  <span className="font-medium text-slate-600">{product.added_by.full_name}</span>
                </span>
              )}
              {product.created_at && (
                <span>{new Date(product.created_at).toLocaleDateString('vi-VN')}</span>
              )}
              {product._count?.tasks != null && (
                <span>{product._count.tasks} tasks</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={onEdit}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
          </button>
        </div>

      </div>
    </div>
  )
}
