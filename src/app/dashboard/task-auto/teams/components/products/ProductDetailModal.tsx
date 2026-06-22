'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Loader2, X, Star, ExternalLink, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProduct } from '@/lib/api/task-auto'
import type { TeamProduct } from '@/types/task-auto'

interface Props {
  teamProduct: TeamProduct
  canRemove: boolean
  onRemove: () => void
  onClose: () => void
}

export function ProductDetailModal({ teamProduct, canRemove, onRemove, onClose }: Props) {
  const [imgIdx, setImgIdx] = useState(0)

  const { data: product, isLoading } = useQuery({
    queryKey: ['task-auto', 'product', teamProduct.product_id],
    queryFn: () => getProduct(teamProduct.product_id),
  })

  const images = product?.image_urls?.length
    ? product.image_urls
    : product?.image_url
      ? [product.image_url]
      : []

  const p = product ?? teamProduct.product

  return (
    <>
      <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/8">

          <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {p?.market && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
                    p.market === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  )}>
                    {p.market}
                  </span>
                )}
                {p?.product_line && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {p.product_line.name}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-snug truncate">
                {p?.name ?? '—'}
              </h2>
              <p className="text-sm font-mono text-slate-400 mt-0.5">SKU: {p?.sku}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-0">
                <div className="sm:w-64 shrink-0 bg-gray-50 flex flex-col items-center justify-center p-4 gap-3 border-b sm:border-b-0 sm:border-r border-gray-100">
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                    {images.length > 0 ? (
                      <a href={images[imgIdx]} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                        <img src={images[imgIdx]} alt={p?.name ?? ''} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                      </a>
                    ) : (
                      <Package className="w-16 h-16 text-slate-200" />
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-1.5 flex-wrap justify-center">
                      {images.slice(0, 6).map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIdx(i)}
                          className={cn(
                            'w-10 h-10 rounded-lg overflow-hidden border-2 transition-all',
                            imgIdx === i ? 'border-indigo-500' : 'border-transparent opacity-60 hover:opacity-100'
                          )}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 p-6 space-y-5">
                  {p?.price && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Giá bán</p>
                      <p className="text-2xl font-black text-indigo-600">
                        {Number(p.price).toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {product?.material?.name && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Chất liệu</p>
                        <p className="text-sm font-semibold text-slate-800">{product.material.name}</p>
                      </div>
                    )}
                    {product?.price_segment && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Phân khúc</p>
                        <p className="text-sm font-semibold text-slate-800">{product.price_segment}</p>
                      </div>
                    )}
                    {(p?.priority_score ?? 0) > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Độ ưu tiên</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-amber-600">{p?.priority_score}</span>
                        </div>
                      </div>
                    )}
                    {p?.market && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Thị trường</p>
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-bold',
                          p.market === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        )}>
                          {p.market}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 text-xs text-slate-400 space-y-0.5">
                    <p>Thêm bởi <span className="font-semibold text-slate-600">{teamProduct.added_by?.full_name ?? '—'}</span></p>
                    <p>{new Date(teamProduct.added_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
            <div className="flex gap-2">
              {p?.image_url && (
                <a href={p.image_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Xem ảnh gốc
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {canRemove && (
                <button onClick={onRemove}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Xóa khỏi kho
                </button>
              )}
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-gray-200 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
