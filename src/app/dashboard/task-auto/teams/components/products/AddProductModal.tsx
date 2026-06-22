'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Package, Search, Check, Loader2, X, ListFilter, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { ProductFormModal } from '@/components/task-auto/ProductFormModal'
import { CustomSelect } from '@/components/task-auto/DarkInput'

import type { BrandType, Product } from '@/types/task-auto'
import { addTeamProduct, getProducts } from '@/lib/api/task-auto'

interface Props {
  open: boolean
  teamId: string
  existingProductIds: string[]
  onClose: () => void
  onSuccess: () => void
  userId?: string
  initialBrandType?: BrandType
}

export function AddProductModal({ open, teamId, existingProductIds, onClose, onSuccess, userId, initialBrandType = 'DO_DA' }: Props) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'pick' | 'create'>('pick')
  const [search, setSearch] = useState('')
  const [brandType, setBrandType] = useState<BrandType>(initialBrandType)
  const [selectedId, setSelectedId] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: productsData, isLoading: loadingPick } = useQuery({
    queryKey: ['task-auto', 'products-catalog', brandType, search],
    queryFn: () => getProducts({ owner: 'global', brand_type: brandType, search: search || undefined, limit: 50, is_active: true }),
    enabled: open && mode === 'pick',
  })

  const available = (productsData?.data ?? []).filter(p => !existingProductIds.includes(p.id))

  const pickMut = useMutation({
    mutationFn: () => addTeamProduct(teamId, selectedId),
    onSuccess: () => {
      toast.success('Đã thêm sản phẩm vào kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', teamId] })
      onSuccess()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Thêm sản phẩm thất bại'),
  })

  useEffect(() => {
    if (!open) {
      setSearch(''); setSelectedId(''); setMode('pick'); setShowCreateModal(false); setBrandType(initialBrandType)
    }
  }, [open, initialBrandType])

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
                disabled={pickMut.isPending || !selectedId}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                {pickMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Thêm vào kho
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
            <div className="flex gap-2 mb-3">
              {(['DO_DA', 'TRANG_SUC'] as BrandType[]).map(b => (
                <button key={b} onClick={() => { setBrandType(b); setSelectedId('') }}
                  className={cn('px-4 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    brandType === b ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-slate-400')}>
                  {b === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
                </button>
              ))}
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
                available.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                      selectedId === p.id ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">SKU: {p.sku}</p>
                    </div>
                    {selectedId === p.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* Tab: Tạo sản phẩm mới — mở ProductFormModal */}
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

      <ProductFormModal
        open={showCreateModal}
        userId={userId}
        defaultBrandType={brandType}
        title="Tạo sản phẩm mới cho kho team"
        onClose={() => { setShowCreateModal(false); setMode('pick') }}
        onSuccess={async (product: Product) => {
          try {
            await addTeamProduct(teamId, product.id)
            qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', teamId] })
            toast.success('Đã thêm sản phẩm vào kho team')
            setShowCreateModal(false)
            onSuccess()
          } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Không thể thêm vào kho team')
          }
        }}
      />
    </>
  )
}
