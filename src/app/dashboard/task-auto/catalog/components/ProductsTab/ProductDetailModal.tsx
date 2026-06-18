'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Edit2, Package, Database, Loader2, ExternalLink, Eye, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { getSources } from '@/lib/api/task-auto'
import type { Product } from '@/types/task-auto'
import { SOURCE_TYPE_LABELS } from '@/types/task-auto'
import { SOURCE_TYPE_COLORS, parseMarkets, formatPrice } from './product-utils'
import { MarketBadge } from './ProductFormFields'

export function ProductDetailModal({ product, onClose, onEdit }: {
  product: Product
  onClose: () => void
  onEdit: () => void
}) {
  const [tab, setTab] = useState<'info' | 'sources'>('info')
  const [imgIdx, setImgIdx] = useState(0)

  const images = product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : [])

  const { data: sourcesData, isLoading: loadingSources } = useQuery({
    queryKey: ['task-auto', 'sources', 'by-product', product.id],
    queryFn: () => getSources({ product_id: product.id, limit: 100 }),
    enabled: tab === 'sources',
  })

  const tabs = [
    { id: 'info' as const, label: 'Thông tin', icon: Package },
    { id: 'sources' as const, label: `Sources${sourcesData ? ` (${sourcesData.total})` : ''}`, icon: Database },
  ]

  return (
    <DarkModal
      open
      onClose={onClose}
      title={product.name}
      subtitle={product.sku}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
            Đóng
          </button>
          <button onClick={onEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors">
            <Edit2 className="w-4 h-4" /> Chỉnh sửa
          </button>
        </>
      }
    >
      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              tab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Thông tin ── */}
      {tab === 'info' && (
        <div className="space-y-6">
          {images.length > 0 && (
            <div className="space-y-2">
              <div className="w-full aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={images[imgIdx]} alt="" className="w-full h-full object-contain" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((url, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={cn('shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                        i === imgIdx ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'
                      )}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SKU</p>
              <p className="text-sm font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">{product.sku}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trạng thái</p>
              <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400')}>
                <span className={cn('w-1.5 h-1.5 rounded-full', product.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                {product.is_active ? 'Hoạt động' : 'Ẩn'}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thị trường</p>
              <div className="flex gap-1.5 flex-wrap">
                {parseMarkets(product.market).map(m => <MarketBadge key={m} market={m} />)}
                {!product.market && <span className="text-slate-300 text-sm">—</span>}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Giá bán</p>
              <p className="text-base font-bold text-slate-800">{formatPrice(product.price) ?? <span className="text-slate-300 font-normal">—</span>}</p>
            </div>
            {product.price_segment && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phân khúc giá</p>
                <p className="text-sm text-slate-700">{product.price_segment}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Điểm ưu tiên</p>
              <p className="text-sm font-semibold text-slate-700">{product.priority_score}</p>
            </div>
            {product.product_line && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dòng sản phẩm</p>
                <p className="text-sm text-slate-700">{product.product_line.name}</p>
              </div>
            )}
            {product.material && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chất liệu</p>
                <p className="text-sm text-slate-700">{product.material.name}</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            {product.added_by && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {product.added_by.full_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {new Date(product.created_at).toLocaleDateString('vi-VN')}
            </span>
            {product._count && (
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {product._count.tasks} tasks</span>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Sources ── */}
      {tab === 'sources' && (
        <div>
          {loadingSources && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          )}
          {!loadingSources && !sourcesData?.data?.length && (
            <EmptyState icon={Database} title="Chưa có source nào cho sản phẩm này" />
          )}
          {sourcesData?.data && sourcesData.data.length > 0 && (
            <div className="space-y-2">
              {sourcesData.data.map(s => (
                <div key={s.id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0', SOURCE_TYPE_COLORS[s.type] ?? 'bg-gray-100 text-gray-500')}>
                          {SOURCE_TYPE_LABELS[s.type]}
                        </span>
                        {s.code && <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{s.code}</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      {s.added_by && <p className="text-xs text-slate-400 mt-0.5">{s.added_by.full_name}</p>}
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold shrink-0',
                      s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400')}>
                      {s.is_active ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </div>
                  <a href={s.link} target="_blank" rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors break-all"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{s.link}</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DarkModal>
  )
}
