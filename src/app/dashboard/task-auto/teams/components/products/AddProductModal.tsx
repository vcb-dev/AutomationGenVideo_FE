'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Package, Search, Check, Loader2, X, ListFilter, Sparkles } from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { TeamProductFormModal } from './TeamProductFormModal'

import type { BrandType, Product } from '@/types/task-auto'
import { addTeamProduct, getProducts } from '@/lib/api/task-auto'

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
  const [mode, setMode] = useState<'pick' | 'create'>('pick')
  const [search, setSearch] = useState('')
  const [brandType, setBrandType] = useState<BrandType>(initialBrandType)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: productsData, isLoading: loadingPick } = useQuery({
    queryKey: ['task-auto', 'products-catalog', brandType, search],
    queryFn: () => getProducts({ brand_type: brandType, search: search || undefined, limit: 50, is_active: true }),
    enabled: open && mode === 'pick',
  })

  // Sản phẩm được đẩy lên kho tổng từ kho team/cá nhân có sku/name/ảnh rỗng ở bản ghi gốc —
  // dữ liệu thật nằm ở source_team_product (và xuyên tiếp source_editor_product).
  const resolveProduct = (p: Product) => {
    const tp = p.source_team_product
    const tp_ep = tp?.source_editor_product
    return {
      sku: p.sku || tp?.sku || tp_ep?.sku || '',
      name: p.name || tp?.name || tp_ep?.name || '',
      imageUrl: p.image_url ?? tp?.image_url ?? tp_ep?.image_url ?? null,
    }
  }

  // Lọc ra những sản phẩm chưa có trong kho team (dựa theo SKU)
  const available = (productsData?.data ?? []).filter(p => !existingSkus.includes(resolveProduct(p).sku))

  const toggleId = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleAll = () => {
    if (selectedIds.size === available.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(available.map(p => p.id)))
    }
  }

  const pickMut = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds)
      const results = await Promise.allSettled(ids.map(id => addTeamProduct(teamId, { source_product_id: id })))
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} sản phẩm thêm thất bại`)
    },
    onSuccess: () => {
      toast.success(`Đã thêm ${selectedIds.size} sản phẩm vào kho team`)
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', teamId] })
      onSuccess()
    },
    onError: (e: any) => toast.error(e?.message || 'Thêm sản phẩm thất bại'),
  })

  useEffect(() => {
    if (!open) {
      setSearch(''); setSelectedIds(new Set()); setMode('pick'); setShowCreateModal(false); setBrandType(initialBrandType)
    }
  }, [open, initialBrandType])

  const allSelected = available.length > 0 && selectedIds.size === available.length

  return (
    <>
      <DarkModal
        open={open}
        onClose={onClose}
        title="Thêm sản phẩm vào kho team"
        size="lg"
        footer={
          <>
            <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
              Hủy
            </button>
            {mode === 'pick' && (
              <button
                onClick={() => pickMut.mutate()}
                disabled={pickMut.isPending || selectedIds.size === 0}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                {pickMut.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : selectedIds.size > 0
                    ? <Check className="w-3.5 h-3.5" />
                    : null
                }
                {selectedIds.size > 0 ? `Thêm ${selectedIds.size} sản phẩm` : 'Thêm vào kho'}
              </button>
            )}
          </>
        }
      >
        {/* Tab switcher */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode('pick')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              mode === 'pick' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <ListFilter className="w-4 h-4" /> Từ kho tổng
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

        {/* Tab: Từ kho tổng */}
        {mode === 'pick' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                {(['DO_DA', 'TRANG_SUC'] as BrandType[]).map(b => (
                  <button key={b} onClick={() => { setBrandType(b); setSelectedIds(new Set()) }}
                    className={cn('px-4 py-1.5 rounded-full text-xs font-semibold border transition-all',
                      brandType === b ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-slate-400')}>
                    {b === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
                  </button>
                ))}
              </div>
              {available.length > 0 && (
                <button onClick={toggleAll} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  {allSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${available.length})`}
                </button>
              )}
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm tên sản phẩm hoặc SKU..."
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {loadingPick ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
              ) : available.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-10 italic">
                  {search ? 'Không tìm thấy sản phẩm phù hợp' : 'Tất cả sản phẩm đã có trong kho team'}
                </p>
              ) : (
                available.map(p => {
                  const selected = selectedIds.has(p.id)
                  const r = resolveProduct(p)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleId(p.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                        selected ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-gray-50 border border-transparent'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                        selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
                      )}>
                        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {r.imageUrl
                          ? <img src={driveImageUrl(r.imageUrl) ?? r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                          : <Package className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{r.name || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}</p>
                        <p className="text-xs text-slate-400 truncate">SKU: {r.sku || '—'}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* Tab: Tạo sản phẩm mới */}
        {mode === 'create' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Tạo sản phẩm cá nhân và thêm vào kho team</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Mở form tạo sản phẩm
            </button>
          </div>
        )}
      </DarkModal>

      <TeamProductFormModal
        open={showCreateModal}
        teamId={teamId}
        defaultBrandType={brandType}
        onClose={() => { setShowCreateModal(false); setMode('pick') }}
        onSuccess={() => {
          setShowCreateModal(false)
          onSuccess()
        }}
      />
    </>
  )
}
