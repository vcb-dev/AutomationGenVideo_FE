'use client'

import { useState } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useQuery } from '@tanstack/react-query'
import {
  X, Edit2, Package, Database, Loader2, ExternalLink, Star, Tag, Layers, BarChart3,
  Download, ChevronLeft, ChevronRight, ZoomIn
} from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { getSources } from '@/lib/api/task-auto'
import { SOURCE_TYPE_COLORS, parseMarkets, formatPrice } from './product-utils'
import { MarketBadge } from './ProductFormFields'
import { Product, SOURCE_TYPE_LABELS } from '@/types/task-auto'

export function ProductDetailModal({ product, onClose, onEdit }: {
  product: Product
  onClose: () => void
  onEdit: () => void
}) {
  useScrollLock()
  const [imgIdx, setImgIdx] = useState(0)
  const [driveErr, setDriveErr] = useState<Record<number, boolean>>({})
  const [lightbox, setLightbox] = useState(false)

  const images = product.image_urls?.length
    ? product.image_urls
    : product.image_url ? [product.image_url] : []

  const markets = parseMarkets(product.market)
  const prioScore = product.priority_score ?? 0

  const imgSrc = (url: string, idx: number, size?: number) =>
    driveErr[idx] ? url : (driveImageUrl(url, size) ?? url)

  const { data: sourcesData, isLoading: loadingSources } = useQuery({
    queryKey: ['task-auto', 'sources', 'by-product', product.id],
    queryFn: () => getSources({ product_id: product.id, limit: 100 }),
  })
  const sources = sourcesData?.data ?? []

  const downloadImage = async (url: string, name: string) => {
    try {
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: name
      })
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && images.length > 0 && (
        <div
          className="fixed inset-0 z-[1010] flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <img
            src={imgSrc(images[imgIdx], imgIdx)}
            alt={product.name}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
            onError={() => setDriveErr(prev => ({ ...prev, [imgIdx]: true }))}
          />
          <div className="absolute bottom-5 flex items-center gap-3">
            {images.length > 1 && (
              <span className="text-white/50 text-sm">{imgIdx + 1} / {images.length}</span>
            )}
            <button
              onClick={e => {
                e.stopPropagation()
                downloadImage(imgSrc(images[imgIdx], imgIdx), `${product.sku}-${imgIdx + 1}.jpg`)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Download className="w-4 h-4" /> Tải ảnh
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div className="fixed inset-0 z-[1003] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

          {/* ── Header ─────────────────────────────── */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-semibold tracking-wide">
                {product.sku}
              </span>
              {markets.map(m => (
                <MarketBadge key={m} market={m} />
              ))}
              <span className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                product.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-slate-400'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', product.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                {product.is_active ? 'Hoạt động' : 'Ẩn'}
              </span>
              {product.user_id && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                  Kho cá nhân
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Product name */}
          <div className="px-6 pb-4 shrink-0">
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{product.name}</h2>
          </div>

          <div className="w-full h-px bg-slate-100 shrink-0" />

          {/* ── Body ───────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">

              {/* Top: image + info */}
              <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-6">

                {/* Left — Image gallery */}
                <div className="space-y-2.5">
                  <div
                    className={cn(
                      'w-full aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center relative group',
                      images.length > 0 && 'cursor-zoom-in'
                    )}
                    onClick={() => images.length > 0 && setLightbox(true)}
                  >
                    {images.length > 0 ? (
                      <>
                        <img
                          src={imgSrc(images[imgIdx], imgIdx, 600)}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:opacity-90 transition-opacity"
                          onError={() => setDriveErr(prev => ({ ...prev, [imgIdx]: true }))}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-2xl">
                          <ZoomIn className="w-6 h-6 text-white drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <Package className="w-14 h-14 text-slate-200" />
                    )}
                  </div>

                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      {images.slice(0, 6).map((url, i) => (
                        <button
                          key={i}
                          onClick={() => { setImgIdx(i); setDriveErr(prev => ({ ...prev, [i]: false })) }}
                          className={cn(
                            'shrink-0 w-11 h-11 rounded-xl overflow-hidden border-2 transition-all',
                            i === imgIdx ? 'border-indigo-500' : 'border-slate-100 hover:border-slate-300'
                          )}
                        >
                          <img
                            src={imgSrc(url, i)}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={() => setDriveErr(prev => ({ ...prev, [i]: true }))}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Download */}
                  {images.length > 0 && (
                    <button
                      onClick={() => downloadImage(
                        imgSrc(images[imgIdx], imgIdx),
                        `${product.sku}-${imgIdx + 1}.jpg`
                      )}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Tải ảnh
                    </button>
                  )}
                </div>

                {/* Right — Info */}
                <div className="space-y-5">

                  {/* Price */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Giá bán</p>
                    {formatPrice(product.price) ? (
                      <p className="text-3xl font-black text-slate-900">{formatPrice(product.price)}</p>
                    ) : (
                      <p className="text-base text-slate-300 italic">Chưa có giá</p>
                    )}
                  </div>

                  {/* Markets */}
                  {markets.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Thị trường</p>
                      <div className="flex flex-wrap gap-1.5">
                        {markets.map(m => <MarketBadge key={m} market={m} />)}
                      </div>
                    </div>
                  )}

                  {/* Attributes */}
                  {(product.product_line || product.material || product.price_segment || prioScore > 0) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Thông tin</p>
                      <div className="space-y-0">
                        {product.product_line && (
                          <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                            <span className="text-sm text-slate-500">Dòng sản phẩm</span>
                            <span className="text-sm font-semibold text-slate-800">{product.product_line.name}</span>
                          </div>
                        )}
                        {product.material && (
                          <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                            <span className="text-sm text-slate-500">Chất liệu</span>
                            <span className="text-sm font-semibold text-slate-800">{product.material.name}</span>
                          </div>
                        )}
                        {product.price_segment && (
                          <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                            <span className="text-sm text-slate-500">Phân khúc giá</span>
                            <span className="text-sm font-semibold text-slate-800">{product.price_segment}</span>
                          </div>
                        )}
                        {prioScore > 0 && (
                          <div className="flex items-center justify-between py-2.5">
                            <span className="text-sm text-slate-500">Điểm ưu tiên</span>
                            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              {prioScore}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Added by */}
                  <div className="pt-1 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      Thêm bởi{' '}
                      <span className="font-semibold text-slate-600">{product.added_by?.full_name ?? '—'}</span>
                      {' · '}
                      {new Date(product.created_at || product.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">
                    Sources {!loadingSources && (
                      <span className="text-slate-400 font-normal">({sources.length})</span>
                    )}
                  </p>
                </div>

                {loadingSources ? (
                  <div className="flex items-center justify-center py-8 bg-slate-50 rounded-2xl">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  </div>
                ) : sources.length === 0 ? (
                  <div className="py-6 text-center bg-slate-50 rounded-2xl">
                    <p className="text-sm text-slate-400 italic">Chưa có source nào gắn với sản phẩm này</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sources.map(s => (
                      <a
                        key={s.id}
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                      >
                        <span className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-bold shrink-0',
                          SOURCE_TYPE_COLORS[s.type] ?? 'bg-slate-100 text-slate-500'
                        )}>
                          {SOURCE_TYPE_LABELS[s.type]}
                        </span>
                        <span className="text-sm font-medium text-slate-700 truncate flex-1">{s.name}</span>
                        {s.code && (
                          <span className="font-mono text-xs text-slate-400 shrink-0 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {s.code}
                          </span>
                        )}
                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Footer ─────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Chỉnh sửa
            </button>
          </div>

        </div>
      </div>
    </>
  )
}