'use client'

import { useEffect, useMemo, useState } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useQuery } from '@tanstack/react-query'
import { X, ImageIcon, Loader2, Store, Tag, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOmsProductDetail } from '@/lib/api/task-auto'

interface Props {
  open: boolean
  omsProductId: string
  onClose: () => void
}

function formatPrice(price: number | null | undefined) {
  if (!price) return null
  return price.toLocaleString('vi-VN') + '₫'
}

/** Lightbox xem ảnh phóng to — điều hướng trái/phải bằng nút hoặc phím mũi tên, đóng bằng Esc/backdrop. */
function ImageLightbox({ images, index, onIndexChange, onClose }: {
  images: string[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && images.length > 1) onIndexChange((index + 1) % images.length)
      if (e.key === 'ArrowLeft' && images.length > 1) onIndexChange((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, images.length, onIndexChange, onClose])

  return (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4 sm:p-10" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85" />

      <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
        <X className="w-5 h-5" />
      </button>

      {images.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onIndexChange((index - 1 + images.length) % images.length) }}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <img
        src={images[index]}
        alt=""
        onClick={e => e.stopPropagation()}
        className="relative max-w-full max-h-full object-contain rounded-lg shadow-2xl"
      />

      {images.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onIndexChange((index + 1) % images.length) }}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {images.length > 1 && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
          {index + 1} / {images.length}
        </span>
      )}
    </div>
  )
}

/** Chi tiết 1 sản phẩm OMS (kho tổng) — hiển thị danh sách biến thể (SKU thật, mỗi biến thể có
 *  giá/ảnh riêng). Tách riêng khỏi ProductViewModal (dùng cho Product/TeamProduct/EditorProduct)
 *  vì OMS trả dữ liệu dạng "product có nhiều variant", khác hẳn cấu trúc phẳng 1-sku-1-record. */
export function OmsProductViewModal({ open, omsProductId, onClose }: Props) {
  useScrollLock()

  const [activeImage, setActiveImage] = useState(0)
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

  const { data: product, isLoading } = useQuery({
    queryKey: ['task-auto', 'oms-products', 'detail', omsProductId],
    queryFn: () => getOmsProductDetail(omsProductId),
    enabled: open,
  })

  const gallery = useMemo(() => {
    if (!product) return []
    const sorted = [...product.images].sort((a, b) => a.position - b.position).map(img => img.url)
    if (sorted.length > 0) return sorted
    return product.image_url ? [product.image_url] : []
  }, [product])

  useEffect(() => { setActiveImage(0) }, [omsProductId])

  const priceRange = useMemo(() => {
    if (!product || product.variants.length === 0) return null
    const prices = product.variants.map(v => v.price).filter((p): p is number => !!p)
    if (prices.length === 0) return null
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`
  }, [product])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1003] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-3xl max-h-[94vh] sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-8 pt-7 pb-5 shrink-0 flex items-start justify-between gap-4 border-b border-gray-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Sản phẩm OMS</p>
              {product && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold',
                  product.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400'
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', product.is_published ? 'bg-emerald-500' : 'bg-slate-300')} />
                  {product.is_published ? 'Đang bán' : 'Ẩn'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800 truncate">{product?.name ?? (isLoading ? 'Đang tải...' : 'Không tìm thấy')}</h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {product?.vendor && (
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <Store className="w-3.5 h-3.5 text-slate-400" />
                  {product.vendor}
                </span>
              )}
              {product?.product_type && (
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {product.product_type}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-8 py-6 space-y-7">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {!isLoading && !product && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Không tìm thấy sản phẩm này.</div>
          )}

          {!isLoading && product && (
            <>
              {/* Gallery */}
              {gallery.length > 0 ? (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setLightbox({ images: gallery, index: activeImage })}
                    className="group relative w-full aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img src={gallery[activeImage]} alt="" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-slate-700 text-xs font-semibold shadow">
                        <ZoomIn className="w-3.5 h-3.5" /> Xem ảnh lớn
                      </span>
                    </div>
                  </button>

                  {gallery.length > 1 && (
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {gallery.map((url, i) => (
                        <button
                          key={url + i}
                          type="button"
                          onClick={() => setActiveImage(i)}
                          className={cn(
                            'w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-colors',
                            i === activeImage ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'
                          )}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-[4/3] sm:aspect-[16/7] rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 p-3.5">
                  <p className="text-xs text-slate-400 font-medium mb-1">Giá</p>
                  <p className="text-base font-bold text-slate-800">{priceRange ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3.5">
                  <p className="text-xs text-slate-400 font-medium mb-1">Biến thể</p>
                  <p className="text-base font-bold text-slate-800">{product.variants.length}</p>
                </div>
              </div>

              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">{t}</span>
                  ))}
                </div>
              )}

              {/* Variants */}
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">Biến thể ({product.variants.length})</p>
                <div className="space-y-2">
                  {product.variants.map(v => (
                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/20 transition-colors">
                      {v.image_url ? (
                        <button
                          type="button"
                          onClick={() => setLightbox({ images: [v.image_url as string], index: 0 })}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0 hover:opacity-80 transition-opacity"
                        >
                          <img src={v.image_url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-semibold text-slate-700 truncate">{v.sku}</p>
                        {v.option_values.length > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">{v.option_values.join(' / ')}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-800">{formatPrice(v.price) ?? '—'}</p>
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold mt-0.5',
                          v.enabled ? 'text-emerald-600' : 'text-slate-400'
                        )}>
                          {v.enabled ? 'Đang bán' : 'Ẩn'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onIndexChange={i => setLightbox(l => l && { ...l, index: i })}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
