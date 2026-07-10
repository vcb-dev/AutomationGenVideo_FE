'use client'

import { useState } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Package, X, Star, Trash2, Download,
  ChevronLeft, ChevronRight, Edit2, ZoomIn, Database, ExternalLink,
  SendHorizontal, Globe,
} from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { getSources, getTeamSources, getEditorSources } from '@/lib/api/task-auto'
import { SOURCE_TYPE_COLORS } from '@/app/dashboard/task-auto/catalog/components/ProductsTab/product-utils'
import { SOURCE_TYPE_LABELS } from '@/types/task-auto'

export interface ProductViewItem {
  id: string
  sku: string | null
  name: string | null
  brand_type?: string | null
  market?: string | null
  image_urls?: string[] | null
  image_url?: string | null
  price?: string | number | null
  price_segment?: string | null
  priority_score?: number
  material?: { id: string; name: string } | null
  product_line?: { id: string; name: string } | null
  classification?: { id: string; name: string } | null
  is_active?: boolean
  added_by?: { id: string; full_name: string } | null
  added_at?: string
  created_at?: string
  team_id?: string
  source_product_id?: string | null
  source_editor_product_id?: string | null
  source_editor_product?: {
    sku: string | null; name: string | null; image_url?: string | null; image_urls?: string[]
    price?: string | number | null; price_segment?: string | null
    market?: string | null; priority_score?: number
    material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null
    classification?: { id: string; name: string } | null
    material_id?: string | null; product_line_id?: string | null
  } | null
  source_team_product_id?: string | null
  source_team_product?: {
    sku: string | null; name: string | null; image_url?: string | null; image_urls?: string[]
    price?: string | number | null; price_segment?: string | null; market?: string | null; priority_score?: number
    material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null
    classification?: { id: string; name: string } | null
    source_editor_product?: {
      sku: string | null; name: string | null; image_url?: string | null; image_urls?: string[]
      price?: string | number | null; price_segment?: string | null; market?: string | null; priority_score?: number
      material?: { id: string; name: string } | null; product_line?: { id: string; name: string } | null
      classification?: { id: string; name: string } | null
    } | null
  } | null
}

interface Props {
  item: ProductViewItem
  open: boolean
  catalogType: 'global' | 'team' | 'editor'
  teamId?: string
  userId?: string
  canEdit?: boolean
  canDelete?: boolean
  canPushToTeam?: boolean
  canPushToGlobal?: boolean
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPushToTeam?: () => void
  onPushToGlobal?: () => void
}

function formatPrice(price: string | number | null | undefined) {
  if (!price) return null
  const n = Number(price)
  if (isNaN(n) || n === 0) return null
  return n.toLocaleString('vi-VN') + '₫'
}


export function ProductViewModal({
  item, open, catalogType, teamId, userId,
  canEdit, canDelete, canPushToTeam, canPushToGlobal,
  onClose, onEdit, onDelete, onPushToTeam, onPushToGlobal,
}: Props) {
  useScrollLock()
  const [imgIdx, setImgIdx] = useState(0)
  const [driveErr, setDriveErr] = useState<Record<number, boolean>>({})
  const [lightbox, setLightbox] = useState(false)

  // Resolve FK-reference fields: own → source_editor_product (team FK) → source_team_product → source_team_product.source_editor_product (global FK)
  const ep = item.source_editor_product
  const tp = item.source_team_product
  const tp_ep = tp?.source_editor_product
  const itemName = item.name ?? ep?.name ?? tp?.name ?? tp_ep?.name ?? '—'
  const itemSku = item.sku ?? ep?.sku ?? tp?.sku ?? tp_ep?.sku ?? null
  const itemMarket = item.market ?? ep?.market ?? tp?.market ?? tp_ep?.market ?? null
  const itemPrice = item.price ?? ep?.price ?? tp?.price ?? tp_ep?.price ?? null
  const itemPriceSegment = item.price_segment ?? ep?.price_segment ?? tp?.price_segment ?? tp_ep?.price_segment ?? null
  const itemPrioScore = item.priority_score ?? ep?.priority_score ?? tp?.priority_score ?? tp_ep?.priority_score ?? 0
  const imageUrls = item.image_urls?.length ? item.image_urls
    : ep?.image_urls?.length ? ep.image_urls
    : tp?.image_urls?.length ? tp.image_urls
    : tp_ep?.image_urls?.length ? tp_ep.image_urls : []
  const imageUrl = item.image_url ?? ep?.image_url ?? tp?.image_url ?? tp_ep?.image_url ?? null
  const itemMaterial = item.material ?? ep?.material ?? tp?.material ?? tp_ep?.material ?? null
  const itemProductLine = item.product_line ?? ep?.product_line ?? tp?.product_line ?? tp_ep?.product_line ?? null
  const itemClassification = item.classification ?? ep?.classification ?? tp?.classification ?? tp_ep?.classification ?? null

  const images = imageUrls.length ? imageUrls : imageUrl ? [imageUrl] : []
  const markets = (itemMarket ?? '').split(',').map(m => m.trim()).filter(Boolean)
  const price = formatPrice(itemPrice)
  const prioScore = itemPrioScore
  const dateStr = item.added_at ?? item.created_at
  const imgSrc = (url: string, idx: number, size?: number) =>
    driveErr[idx] ? url : (driveImageUrl(url, size) ?? url)

  const { data: globalSourcesData, isLoading: loadingGlobalSrc } = useQuery({
    queryKey: ['task-auto', 'sources', 'product-view', item.id, 'global'],
    queryFn: () => getSources({ product_id: item.id, limit: 100 }),
    enabled: open && catalogType === 'global',
  })
  const { data: teamSourcesData, isLoading: loadingTeamSrc } = useQuery({
    queryKey: ['task-auto', 'sources', 'product-view', item.id, 'team', teamId],
    queryFn: () => getTeamSources(teamId!, { team_product_id: item.id } as any),
    enabled: open && catalogType === 'team' && !!teamId,
  })
  // Global sources linked via source_product_id (khi team product đã được đẩy lên kho tổng)
  const { data: globalSourcesForTeamData, isLoading: loadingGlobalForTeam } = useQuery({
    queryKey: ['task-auto', 'sources', 'product-view', item.source_product_id, 'global-for-team'],
    queryFn: () => getSources({ product_id: item.source_product_id!, limit: 100 }),
    enabled: open && catalogType === 'team' && !!item.source_product_id,
  })
  const { data: editorSourcesData, isLoading: loadingEditorSrc } = useQuery({
    queryKey: ['task-auto', 'sources', 'product-view', item.id, 'editor', userId],
    queryFn: () => getEditorSources(userId!, { editor_product_id: item.id, limit: 100 }),
    enabled: open && catalogType === 'editor' && !!userId,
  })

  const sources =
    catalogType === 'global' ? (globalSourcesData?.data ?? []) :
    catalogType === 'team'   ? [...(teamSourcesData ?? []), ...(globalSourcesForTeamData?.data ?? [])] :
                               (editorSourcesData?.data ?? [])
  const loadingSrc = loadingGlobalSrc || loadingTeamSrc || loadingEditorSrc || loadingGlobalForTeam

  const downloadImage = async (url: string, name: string) => {
    const toastId = toast.loading('Đang tải ảnh...')
    try {
      const proxyUrl = `/api/capture-image?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
      toast.success('Đã tải ảnh thành công', { id: toastId })
    } catch {
      toast.error('Không thể tải ảnh', { id: toastId })
    }
  }

  if (!open) return null

  return (
    <>
      {/* Lightbox */}
      {lightbox && images.length > 0 && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center bg-black/90" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
            <X className="w-5 h-5" />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img src={imgSrc(images[imgIdx], imgIdx)} alt={itemName}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
            onError={() => setDriveErr(p => ({ ...p, [imgIdx]: true }))} />
          <div className="absolute bottom-6 flex items-center gap-3">
            {images.length > 1 && <span className="text-white/50 text-sm">{imgIdx + 1} / {images.length}</span>}
            <button onClick={e => { e.stopPropagation(); downloadImage(imgSrc(images[imgIdx], imgIdx), `${itemSku ?? 'product'}-${imgIdx + 1}.jpg`) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 text-white">
              <Download className="w-4 h-4" /> Tải ảnh
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[1003] flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white w-full max-w-4xl max-h-[94vh] sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-7 pb-5 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-900 leading-snug flex-1">{itemName}</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {itemSku && <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-semibold tracking-wide">{itemSku}</span>}
              {item.source_editor_product_id && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600">
                  Từ kho cá nhân
                </span>
              )}
              {markets.map(m => (
                <span key={m} className={cn('px-2.5 py-1 rounded-full text-xs font-semibold',
                  m === 'VIETNAM' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600')}>
                  {m === 'VIETNAM' ? 'VN' : 'Global'}
                </span>
              ))}
              <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-slate-400')}>
                <span className={cn('w-1.5 h-1.5 rounded-full', item.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                {item.is_active ? 'Hoạt động' : 'Ẩn'}
              </span>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100 shrink-0" />

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-8">

              {/* Image + info */}
              <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-8">
                {/* Image gallery */}
                <div className="space-y-3">
                  <div className={cn('w-full aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center relative group',
                    images.length > 0 && 'cursor-zoom-in')}
                    onClick={() => images.length > 0 && setLightbox(true)}>
                    {images.length > 0 ? (
                      <>
                        <img src={imgSrc(images[imgIdx], imgIdx, 600)} alt={itemName}
                          className="w-full h-full object-contain group-hover:opacity-90 transition-opacity"
                          onError={() => setDriveErr(p => ({ ...p, [imgIdx]: true }))} />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-2xl">
                          <ZoomIn className="w-8 h-8 text-white drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <Package className="w-16 h-16 text-slate-200" />
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {images.slice(0, 6).map((url, i) => (
                        <button key={i} onClick={() => setImgIdx(i)}
                          className={cn('shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all',
                            i === imgIdx ? 'border-indigo-500' : 'border-slate-100 hover:border-slate-300')}>
                          <img src={imgSrc(url, i)} alt="" className="w-full h-full object-cover"
                            onError={() => setDriveErr(p => ({ ...p, [i]: true }))} />
                        </button>
                      ))}
                    </div>
                  )}
                  {images.length > 0 && (
                    <button onClick={() => downloadImage(imgSrc(images[imgIdx], imgIdx), `${itemSku ?? 'product'}-${imgIdx + 1}.jpg`)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
                      <Download className="w-4 h-4" /> Tải ảnh
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Giá bán</p>
                    {price
                      ? <p className="text-4xl font-black text-slate-900">{price}</p>
                      : <p className="text-base text-slate-300 italic">Chưa có giá</p>}
                  </div>

                  {(itemProductLine || itemMaterial || itemClassification || itemPriceSegment || item.brand_type || prioScore > 0) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Thông tin</p>
                      <div className="space-y-0">
                        {item.brand_type && (
                          <div className="flex items-center justify-between py-3 border-b border-slate-50">
                            <span className="text-base text-slate-500">Nhóm SP</span>
                            <span className="text-base font-semibold text-slate-800">{item.brand_type === 'DO_DA' ? 'Đồ da' : 'Trang sức'}</span>
                          </div>
                        )}
                        {itemProductLine && (
                          <div className="flex items-center justify-between py-3 border-b border-slate-50">
                            <span className="text-base text-slate-500">Dòng sản phẩm</span>
                            <span className="text-base font-semibold text-slate-800">{itemProductLine.name}</span>
                          </div>
                        )}
                        {itemMaterial && (
                          <div className="flex items-center justify-between py-3 border-b border-slate-50">
                            <span className="text-base text-slate-500">Chất liệu</span>
                            <span className="text-base font-semibold text-slate-800">{itemMaterial.name}</span>
                          </div>
                        )}
                        {itemClassification && (
                          <div className="flex items-center justify-between py-3 border-b border-slate-50">
                            <span className="text-base text-slate-500">Phân loại</span>
                            <span className="text-base font-semibold text-slate-800">{itemClassification.name}</span>
                          </div>
                        )}
                        {itemPriceSegment && (
                          <div className="flex items-center justify-between py-3 border-b border-slate-50">
                            <span className="text-base text-slate-500">Phân khúc giá</span>
                            <span className="text-base font-semibold text-slate-800">{itemPriceSegment}</span>
                          </div>
                        )}
                        {prioScore > 0 && (
                          <div className="flex items-center justify-between py-3">
                            <span className="text-base text-slate-500">Điểm ưu tiên</span>
                            <span className="flex items-center gap-2 text-base font-bold text-amber-600">
                              <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> {prioScore}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(item.added_by || dateStr) && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-sm text-slate-400">
                        {item.added_by && <>Thêm bởi <span className="font-semibold text-slate-600">{item.added_by.full_name}</span>{' · '}</>}
                        {dateStr && new Date(dateStr).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sources */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <p className="text-base font-bold text-slate-700">
                    Sources liên kết{' '}
                    {!loadingSrc && <span className="text-slate-400 font-normal">({sources.length})</span>}
                  </p>
                </div>
                {loadingSrc ? (
                  <div className="flex items-center justify-center py-10 bg-slate-50 rounded-2xl">
                    <div className="w-6 h-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  </div>
                ) : sources.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-2xl">
                    <p className="text-base text-slate-400 italic">Chưa có source nào gắn với sản phẩm này</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sources.map((s: any) => (
                      <a key={s.id} href={s.link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                        <span className={cn('px-3 py-1.5 rounded-full text-sm font-bold shrink-0', (SOURCE_TYPE_COLORS as Record<string, string>)[s.type] ?? 'bg-slate-100 text-slate-500')}>
                          {(SOURCE_TYPE_LABELS as Record<string, string>)[s.type]}
                        </span>
                        <span className="text-base font-medium text-slate-700 truncate flex-1">{s.name}</span>
                        {s.code && <span className="font-mono text-sm text-slate-400 shrink-0 bg-slate-100 px-2.5 py-1 rounded-lg">{s.code}</span>}
                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-8 py-5 border-t border-slate-100 shrink-0 bg-gray-50/50">
            <div className="flex gap-2">
              {canPushToTeam && onPushToTeam && (
                <button onClick={() => { onPushToTeam(); onClose() }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                  <SendHorizontal className="w-4 h-4" /> Đẩy sang team
                </button>
              )}
              {canPushToGlobal && onPushToGlobal && (
                <button onClick={() => { onPushToGlobal(); onClose() }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 rounded-xl transition-colors">
                  <Globe className="w-4 h-4" /> Đẩy kho tổng
                </button>
              )}
              {canDelete && onDelete && (
                <button onClick={() => { onDelete(); onClose() }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Đóng
              </button>
              {canEdit && onEdit && (
                <button onClick={() => { onEdit(); onClose() }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors">
                  <Edit2 className="w-4 h-4" /> Chỉnh sửa
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
