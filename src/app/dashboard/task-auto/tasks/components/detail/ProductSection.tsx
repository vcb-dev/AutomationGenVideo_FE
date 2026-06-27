'use client'

import { useState } from 'react'
import { Package, Star, ZoomIn, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { ServerSearchSelect } from '@/components/task-auto/DarkInput'
import { Section } from './Section'
import { formatPrice } from '../../../catalog/components/ProductsTab/product-utils'
import type { Product } from '@/types/task-auto'

interface EditProductProps {
  productId: string
  onChange: (id: string) => void
  items: { value: string; label: string; sublabel?: string }[]
  searchValue: string
  onSearchChange: (v: string) => void
  loading: boolean
  currentProductName?: string | null
  currentProductId?: string | null
  filterSlot?: React.ReactNode
}

interface ViewProductProps {
  hasProduct: boolean
  fullProduct?: Product
  productName?: string | null
  productSku?: string | null
  primaryImage?: string | null
  extraImages: string[]
}

interface Props {
  editMode: boolean
  edit: EditProductProps
  view: ViewProductProps
}

async function downloadImage(url: string, name: string) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank')
  }
}

export function ProductSection({ editMode, edit, view }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)

  const allImages: string[] = []
  if (view.primaryImage) allImages.push(view.primaryImage)
  for (const u of view.extraImages) {
    if (!allImages.includes(u)) allImages.push(u)
  }
  // include any remaining images from fullProduct not already captured
  for (const u of view.fullProduct?.image_urls ?? []) {
    if (!allImages.includes(u)) allImages.push(u)
  }

  const currentImg = allImages[imgIdx] ?? null
  const safeIdx = Math.min(imgIdx, allImages.length - 1)

  const prev = () => setImgIdx(i => (i - 1 + allImages.length) % allImages.length)
  const next = () => setImgIdx(i => (i + 1) % allImages.length)

  return (
    <>
      {previewOpen && currentImg && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center bg-black/90" onClick={() => setPreviewOpen(false)}>
          <button type="button" onClick={() => setPreviewOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          {allImages.length > 1 && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={driveImageUrl(currentImg, 1200) ?? currentImg}
            alt={view.productName ?? ''}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-4 flex items-center gap-3" onClick={e => e.stopPropagation()}>
            {allImages.length > 1 && (
              <span className="text-white/60 text-sm">{safeIdx + 1} / {allImages.length}</span>
            )}
            <button type="button"
              onClick={() => downloadImage(driveImageUrl(currentImg, 1200) ?? currentImg, `${view.productSku ?? 'image'}-${safeIdx + 1}.jpg`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Download className="w-4 h-4" /> Tải ảnh
            </button>
          </div>
          {allImages.length > 1 && (
            <div className="absolute bottom-14 flex gap-2 flex-wrap justify-center px-4" onClick={e => e.stopPropagation()}>
              {allImages.map((url, i) => (
                <button key={i} type="button" onClick={() => setImgIdx(i)}
                  className={cn('w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0',
                    i === safeIdx ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80')}>
                  <img src={driveImageUrl(url) ?? url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Section icon={<Package className="w-4 h-4" />} title="Sản phẩm" bgColor="bg-orange-50" iconColor="text-orange-600">
        {editMode ? (
          <div className="p-4">
            <ServerSearchSelect
              label="Sản phẩm"
              value={edit.productId}
              onChange={edit.onChange}
              items={edit.items}
              searchValue={edit.searchValue}
              onSearchChange={edit.onSearchChange}
              loading={edit.loading}
              placeholder="Tìm sản phẩm..."
              clearLabel="-- Không chọn --"
              searchPlaceholder="Tìm theo tên hoặc SKU..."
              filterSlot={edit.filterSlot}
            />
            {edit.productId && edit.productId === edit.currentProductId && edit.currentProductName && (
              <p className="mt-2 text-xs text-slate-400 pl-1">
                Hiện tại: <span className="font-medium text-slate-600">{edit.currentProductName}</span>
              </p>
            )}
          </div>
        ) : !view.hasProduct ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
            <Package className="w-10 h-10 text-gray-200" />
            <p className="text-sm italic">Không gắn sản phẩm</p>
          </div>
        ) : (
          <div>
            {/* Image */}
            {currentImg ? (
              <div className="relative group">
                <button type="button" onClick={() => setPreviewOpen(true)} className="block w-full cursor-zoom-in">
                  <img
                    src={driveImageUrl(currentImg) ?? currentImg}
                    alt={view.productName ?? ''}
                    className="w-full h-52 object-cover transition-opacity group-hover:opacity-95"
                  />
                  {allImages.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/30 rounded-full p-2.5">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </button>

                {allImages.length > 1 && (
                  <div className="absolute bottom-2.5 left-3 flex gap-1.5" onClick={e => e.stopPropagation()}>
                    {allImages.map((url, i) => (
                      <button key={i} type="button" onClick={() => setImgIdx(i)}
                        className={cn(
                          'w-10 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0',
                          i === safeIdx
                            ? 'border-white opacity-100 shadow-md'
                            : 'border-white/40 opacity-60 hover:opacity-90 hover:border-white/70'
                        )}>
                        <img src={driveImageUrl(url) ?? url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <button type="button"
                  onClick={() => downloadImage(driveImageUrl(currentImg, 1200) ?? currentImg, `${view.productSku ?? 'image'}-${safeIdx + 1}.jpg`)}
                  className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-full h-40 bg-gray-50 border-b border-gray-100 flex flex-col items-center justify-center gap-2">
                <Package className="w-8 h-8 text-gray-200" />
                <span className="text-xs text-gray-400">Chưa có ảnh sản phẩm</span>
              </div>
            )}

            {/* Info */}
            <div className="px-4 pt-3.5 pb-4 space-y-3">
              {(view.fullProduct?.market || view.fullProduct?.product_line?.name) && (
                <div className="flex flex-wrap gap-1.5">
                  {view.fullProduct?.market && (
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide',
                      view.fullProduct.market === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
                    )}>
                      {view.fullProduct.market}
                    </span>
                  )}
                  {view.fullProduct?.product_line?.name && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                      {view.fullProduct.product_line.name}
                    </span>
                  )}
                </div>
              )}

              <div>
                <p className="text-base font-bold text-gray-900 leading-snug">{view.productName ?? '—'}</p>
                {view.productSku && (
                  <span className="inline-block mt-1 font-mono text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                    {view.productSku}
                  </span>
                )}
              </div>

              <div className="border-t border-gray-100" />

              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium mb-0.5">Giá bán</p>
                  <p className="text-2xl font-black text-red-600 leading-none">
                    {formatPrice(view.fullProduct?.price) ?? (
                      <span className="text-gray-400 text-sm font-normal italic">Chưa có giá</span>
                    )}
                  </p>
                </div>
                {(view.fullProduct?.priority_score ?? 0) > 0 && (
                  <span className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-base font-black text-amber-600 leading-none">{view.fullProduct?.priority_score}</span>
                  </span>
                )}
              </div>

              {(view.fullProduct?.material?.name || view.fullProduct?.price_segment) && (
                <div className="flex gap-2">
                  {view.fullProduct?.material?.name && (
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Chất liệu</p>
                      <p className="text-sm font-semibold text-gray-800">{view.fullProduct.material.name}</p>
                    </div>
                  )}
                  {view.fullProduct?.price_segment && (
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Phân khúc</p>
                      <p className="text-sm font-semibold text-gray-800">{view.fullProduct.price_segment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Section>
    </>
  )
}
