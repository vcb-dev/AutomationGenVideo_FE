'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Search, Loader2, X, Globe, Sparkles, ChevronLeft, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { TeamProductFormModal, OmsPrefill } from './TeamProductFormModal'

import type { BrandType, OmsProductSummary } from '@/types/task-auto'
import { searchOmsProducts, getOmsProductDetail } from '@/lib/api/task-auto'

interface Props {
  open: boolean
  teamId: string
  existingSkus: string[]
  onClose: () => void
  onSuccess: () => void
  userId?: string
  initialBrandType?: BrandType
}

export function AddProductModal({ open, teamId, existingSkus, onClose, onSuccess, userId: _userId, initialBrandType = 'DO_DA' }: Props) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'oms' | 'create'>('oms')
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<OmsProductSummary | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [omsPrefill, setOmsPrefill] = useState<OmsPrefill | null>(null)

  const { data: omsData, isLoading: loadingOms } = useQuery({
    queryKey: ['task-auto', 'oms-products', search],
    queryFn: () => searchOmsProducts({ q: search || undefined, page: 1, page_size: 30 }),
    enabled: open && mode === 'oms' && !selectedProduct,
  })

  const { data: productDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['task-auto', 'oms-products', 'detail', selectedProduct?.id],
    queryFn: () => getOmsProductDetail(selectedProduct!.id),
    enabled: !!selectedProduct,
  })

  // Ẩn sản phẩm mà mọi SKU đều đã có trong kho team
  const available = (omsData?.data ?? []).filter(p => !p.skus.every(sku => existingSkus.includes(sku)))

  useEffect(() => {
    if (open) {
      // Chọn variant duy nhất tự động ngay khi có chi tiết, khỏi cần thêm 1 bước bấm chọn
      if (productDetail && productDetail.variants.length === 1) {
        const v = productDetail.variants[0]
        if (!existingSkus.includes(v.sku)) {
          setOmsPrefill({
            oms_product_id: productDetail.id,
            oms_variant_id: v.id,
            sku: v.sku,
            name: productDetail.name,
            price: v.price ? String(v.price) : '',
            image_urls: (v.image_url ? [v.image_url] : productDetail.images.map(i => i.url)),
          })
          setShowCreateModal(true)
          setSelectedProduct(null)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetail])

  const pickVariant = (v: NonNullable<typeof productDetail>['variants'][number]) => {
    if (!productDetail) return
    setOmsPrefill({
      oms_product_id: productDetail.id,
      oms_variant_id: v.id,
      sku: v.sku,
      name: productDetail.name,
      price: v.price ? String(v.price) : '',
      image_urls: v.image_url ? [v.image_url] : productDetail.images.map(i => i.url),
    })
    setShowCreateModal(true)
    setSelectedProduct(null)
  }

  useEffect(() => {
    if (!open) {
      setSearch(''); setMode('oms'); setSelectedProduct(null); setShowCreateModal(false); setOmsPrefill(null)
    }
  }, [open])

  return (
    <>
      <DarkModal
        open={open && !showCreateModal}
        onClose={onClose}
        title="Thêm sản phẩm vào kho team"
        size="lg"
      >
        {/* Tab switcher */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => { setMode('oms'); setSelectedProduct(null) }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              mode === 'oms' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Globe className="w-4 h-4" /> Từ OMS
          </button>
          <button
            onClick={() => { setMode('create'); setShowCreateModal(true) }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              mode === 'create' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Sparkles className="w-4 h-4" /> Tạo sản phẩm mới
          </button>
        </div>

        {/* Tab: Từ OMS — bước 1: tìm/duyệt sản phẩm */}
        {mode === 'oms' && !selectedProduct && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm tên sản phẩm hoặc SKU trên OMS..."
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {loadingOms ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
              ) : available.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-10 italic">
                  {search ? 'Không tìm thấy sản phẩm phù hợp' : 'Không có sản phẩm nào'}
                </p>
              ) : (
                available.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left hover:bg-gray-50 border border-transparent"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.name || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}</p>
                      <p className="text-xs text-slate-400 truncate">
                        SKU: {p.default_sku || '—'}{p.variant_count > 1 ? ` · ${p.variant_count} biến thể` : ''}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* Tab: Từ OMS — bước 2: chọn biến thể (chỉ hiện khi > 1 biến thể) */}
        {mode === 'oms' && selectedProduct && (
          <>
            <button
              onClick={() => setSelectedProduct(null)}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-3"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
            </button>
            {loadingDetail || (productDetail && productDetail.variants.length === 1) ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500 mb-2">Chọn 1 biến thể (SKU) để thêm vào kho team</p>
                {productDetail?.variants.map(v => {
                  const already = existingSkus.includes(v.sku)
                  return (
                    <button
                      key={v.id}
                      disabled={already}
                      onClick={() => pickVariant(v)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left border border-transparent',
                        already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {v.image_url ? <img src={v.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs font-semibold text-slate-700 truncate">{v.sku}</p>
                        <p className="text-xs text-slate-400 truncate">{v.option_values.join(' / ') || '—'}{already ? ' · đã có trong kho team' : ''}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800 shrink-0">{v.price ? v.price.toLocaleString('vi-VN') + '₫' : '—'}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </DarkModal>

      <TeamProductFormModal
        open={showCreateModal}
        teamId={teamId}
        defaultBrandType={initialBrandType}
        omsPrefill={mode === 'oms' ? omsPrefill : null}
        onClose={() => { setShowCreateModal(false); setMode('oms'); setOmsPrefill(null) }}
        onSuccess={() => {
          setShowCreateModal(false)
          setOmsPrefill(null)
          qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', teamId] })
          onSuccess()
        }}
      />
    </>
  )
}
