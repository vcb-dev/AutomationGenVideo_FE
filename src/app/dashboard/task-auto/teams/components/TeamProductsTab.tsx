'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Package, Plus, Trash2, Search, Check, Loader2, ShoppingBag, X, Star, ExternalLink, ListFilter, Sparkles } from 'lucide-react'
import { getProduct } from '@/lib/api/task-auto'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect, DarkInput, CreatableSelect } from '@/components/task-auto/DarkInput'
import {
  getTeams, getTeamProducts, addTeamProduct, removeTeamProduct, getProducts,
  createProduct, getProductLines, createProductLine, getMaterials, createMaterial, createSource,
} from '@/lib/api/task-auto'
import type { TeamProduct, Product } from '@/types/task-auto'
import { defaultSource } from '../../catalog/components/ProductsTab/product-utils'
import type { SourceDraft } from '../../catalog/components/ProductsTab/product-utils'
import { MarketPicker, PriceInput, MultiImagePicker, SourceForm } from '../../catalog/components/ProductsTab/ProductFormFields'

// ── Add Product Modal ────────────────────────────────────────────────────────

function AddProductModal({
  open,
  teamId,
  existingProductIds,
  onClose,
  onSuccess,
}: {
  open: boolean
  teamId: string
  existingProductIds: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'pick' | 'create'>('pick')

  // Pick mode
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')

  // Create mode
  const [form, setForm] = useState<Partial<Product> & { image_urls: string[] }>({
    sku: '', name: '', image_urls: [], price: '',
    price_segment: '', priority_score: 0, material_id: '', product_line_id: '', is_active: true,
  })
  const [markets, setMarkets] = useState<string[]>(['VIETNAM'])
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(defaultSource)

  // Queries
  const { data: productsData, isLoading: loadingPick } = useQuery({
    queryKey: ['task-auto', 'products-catalog', search],
    queryFn: () => getProducts({ search: search || undefined, limit: 50, is_active: true }),
    enabled: open && mode === 'pick',
  })
  const { data: productLines } = useQuery({
    queryKey: ['task-auto', 'product-lines'],
    queryFn: getProductLines,
    enabled: open && mode === 'create',
  })
  const { data: materials } = useQuery({
    queryKey: ['task-auto', 'materials'],
    queryFn: getMaterials,
    enabled: open && mode === 'create',
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

  const createMut = useMutation({
    mutationFn: async () => {
      const product = await createProduct({
        sku: form.sku,
        name: form.name,
        image_urls: form.image_urls,
        price: form.price || undefined,
        market: markets.join(','),
        price_segment: form.price_segment || undefined,
        priority_score: form.priority_score,
        material_id: form.material_id || null,
        product_line_id: form.product_line_id || null,
        is_active: form.is_active,
      })
      await addTeamProduct(teamId, product.id)
      if (sourceDraft.enabled && sourceDraft.name && sourceDraft.link) {
        await createSource({
          type: sourceDraft.type, name: sourceDraft.name, link: sourceDraft.link,
          code: sourceDraft.code || undefined, product_id: product.id, is_active: true,
        } as any).catch(() => null)
        qc.invalidateQueries({ queryKey: ['task-auto', 'sources'] })
      }
      qc.invalidateQueries({ queryKey: ['task-auto', 'products'] })
      return product
    },
    onSuccess: () => {
      toast.success('Đã tạo sản phẩm và thêm vào kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', teamId] })
      onSuccess()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể tạo sản phẩm'),
  })

  useEffect(() => {
    if (!open) {
      setSearch(''); setSelectedId(''); setMode('pick')
      setForm({ sku: '', name: '', image_urls: [], price: '', price_segment: '', priority_score: 0, material_id: '', product_line_id: '', is_active: true })
      setMarkets(['VIETNAM']); setSourceDraft(defaultSource)
    }
  }, [open])

  const handleSubmit = () => {
    if (mode === 'pick') {
      if (!selectedId) return
      pickMut.mutate()
    } else {
      if (!form.sku || !form.name) return toast.error('SKU và tên là bắt buộc')
      if (markets.length === 0) return toast.error('Chọn ít nhất một thị trường')
      if (sourceDraft.enabled && (!sourceDraft.name || !sourceDraft.link)) return toast.error('Source cần có tên và link')
      createMut.mutate()
    }
  }

  const saving = pickMut.isPending || createMut.isPending

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title="Thêm sản phẩm vào kho team"
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || (mode === 'pick' && !selectedId) || (mode === 'create' && markets.length === 0)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === 'pick' ? 'Thêm vào kho' : 'Tạo & thêm vào kho'}
          </button>
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
          onClick={() => setMode('create')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
            mode === 'create' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Sparkles className="w-4 h-4" /> Tạo sản phẩm mới
        </button>
      </div>

      {/* ── Tab: Từ kho tổng ── */}
      {mode === 'pick' && (
        <>
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

      {/* ── Tab: Tạo sản phẩm mới ── */}
      {mode === 'create' && (
        <div className="space-y-6">

          {/* Thông tin cơ bản */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Thông tin cơ bản
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DarkInput
                label="SKU *"
                placeholder="VD: NM101"
                value={form.sku ?? ''}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              />
              <MarketPicker label="Thị trường" value={markets} onChange={setMarkets} />
            </div>
            <DarkInput
              label="Tên sản phẩm *"
              placeholder="Nhập tên sản phẩm đầy đủ..."
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Phân loại & Giá */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Phân loại & Giá
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CreatableSelect
                label="Dòng sản phẩm"
                value={form.product_line_id ?? ''}
                onChange={v => setForm(f => ({ ...f, product_line_id: v }))}
                options={productLines?.map(l => ({ value: l.id, label: l.name })) ?? []}
                createLabel="Thêm dòng sản phẩm"
                onCreate={async (name) => {
                  const created = await createProductLine(name)
                  qc.setQueryData<typeof productLines>(
                    ['task-auto', 'product-lines'],
                    old => [...(old ?? []), created]
                  )
                  return { id: created.id, label: created.name }
                }}
              />
              <CreatableSelect
                label="Chất liệu"
                value={form.material_id ?? ''}
                onChange={v => setForm(f => ({ ...f, material_id: v }))}
                options={materials?.map(m => ({ value: m.id, label: m.name })) ?? []}
                createLabel="Thêm chất liệu"
                onCreate={async (name) => {
                  const created = await createMaterial(name)
                  qc.setQueryData<typeof materials>(
                    ['task-auto', 'materials'],
                    old => [...(old ?? []), created]
                  )
                  return { id: created.id, label: created.name }
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PriceInput
                label="Giá bán (₫)"
                value={form.price ?? ''}
                onChange={v => setForm(f => ({ ...f, price: v }))}
              />
              <DarkInput
                label="Phân khúc giá"
                placeholder="VD: MID, HIGH"
                value={form.price_segment ?? ''}
                onChange={e => setForm(f => ({ ...f, price_segment: e.target.value }))}
              />
              <DarkInput
                label="Điểm ưu tiên"
                type="number"
                placeholder="0"
                value={form.priority_score ?? 0}
                onChange={e => setForm(f => ({ ...f, priority_score: Number(e.target.value) }))}
                min={0}
              />
            </div>
          </div>

          {/* Hình ảnh */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Hình ảnh sản phẩm
            </p>
            <MultiImagePicker
              values={form.image_urls ?? []}
              onChange={urls => setForm(f => ({ ...f, image_urls: urls }))}
            />
          </div>

          {/* Trạng thái */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Trạng thái
            </p>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <div>
                <p className="text-sm font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
                <p className="text-xs text-slate-500">{form.is_active ? 'Sản phẩm hiển thị và có thể dùng trong task' : 'Sản phẩm bị ẩn khỏi danh sách'}</p>
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Source đi kèm <span className="text-gray-300 font-normal normal-case tracking-normal">(tuỳ chọn)</span>
            </p>
            <SourceForm value={sourceDraft} onChange={setSourceDraft} />
          </div>
        </div>
      )}
    </DarkModal>
  )
}

// ── Main Tab ─────────────────────────────────────────────────────────────────

interface TeamProductsTabProps {
  canManage: boolean       // LEADER của team hoặc ADMIN/MANAGER
  isAdminOrManager: boolean
  userId?: string
}

export function TeamProductsTab({ canManage, isAdminOrManager, userId }: TeamProductsTabProps) {
  const qc = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // Auto-select team cho LEADER/MEMBER
  useEffect(() => {
    if (!isAdminOrManager && userId && teams) {
      const myTeam =
        teams.find(t => t.leader_id === userId) ||
        teams.find(t => t.members?.some(m => m.user_id === userId))
      if (myTeam) setSelectedTeamId(myTeam.id)
    }
  }, [isAdminOrManager, userId, teams])

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)

  // Member hoặc leader của team được chọn đều có thể thêm/sửa/xóa
  const isLeaderOfSelected = selectedTeam?.leader_id === userId
  const isMemberOfSelected = selectedTeam?.members?.some(m => m.user_id === userId) ?? false
  const canManageSelected = isAdminOrManager || isLeaderOfSelected || isMemberOfSelected

  const { data: teamProducts, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-products', selectedTeamId],
    queryFn: () => getTeamProducts(selectedTeamId),
    enabled: !!selectedTeamId,
  })

  const removeMut = useMutation({
    mutationFn: (productId: string) => removeTeamProduct(selectedTeamId, productId),
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm khỏi kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-products', selectedTeamId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xóa thất bại'),
  })

  const existingProductIds = (teamProducts ?? []).map(tp => tp.product_id)

  const filtered = (teamProducts ?? []).filter(tp => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      tp.product?.name?.toLowerCase().includes(q) ||
      tp.product?.sku?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Controls — card giống TaskFilters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {isAdminOrManager ? (
            <CustomSelect
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              options={[
                { value: '', label: 'Tất cả đội nhóm' },
                ...(teams ?? []).map(t => ({ value: t.id, label: t.name })),
              ]}
              className="min-w-[220px]"
              searchable
            />
          ) : (
            selectedTeam && (
              <div className="flex items-center gap-2 px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-base font-semibold text-indigo-700">
                <ShoppingBag className="w-4 h-4" />
                {selectedTeam.name}
              </div>
            )
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm trong kho team..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedTeamId && teamProducts && (
            <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
              {teamProducts.length} sản phẩm
            </span>
          )}

          {selectedTeamId && canManageSelected && (
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors ml-auto shrink-0"
            >
              <Plus className="w-5 h-5" /> Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!selectedTeamId ? (
        <EmptyState icon={ShoppingBag} title="Chọn đội nhóm để xem kho sản phẩm" />
      ) : isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="h-32 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl">
          {teamProducts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Package className="w-7 h-7 text-indigo-300" />
              </div>
              <p className="font-semibold text-slate-600">Kho team chưa có sản phẩm</p>
              <p className="text-sm text-slate-400">
                {canManageSelected ? 'Nhấn "Thêm sản phẩm" để chọn từ kho tổng' : 'Leader chưa thêm sản phẩm nào'}
              </p>
              {canManageSelected && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Thêm sản phẩm đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400 text-sm italic">Không tìm thấy sản phẩm "{search}"</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tp: TeamProduct) => (
            <ProductCard
              key={tp.id}
              teamProduct={tp}
              canRemove={canManageSelected}
              onRemove={() => {
                if (confirm(`Xóa "${tp.product?.name}" khỏi kho team?`)) {
                  removeMut.mutate(tp.product_id)
                }
              }}
            />
          ))}
        </div>
      )}

      {showAdd && selectedTeamId && (
        <AddProductModal
          open={showAdd}
          teamId={selectedTeamId}
          existingProductIds={existingProductIds}
          onClose={() => setShowAdd(false)}
          onSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ── Product Detail Modal ──────────────────────────────────────────────────────

function ProductDetailModal({
  teamProduct,
  canRemove,
  onRemove,
  onClose,
}: {
  teamProduct: TeamProduct
  canRemove: boolean
  onRemove: () => void
  onClose: () => void
}) {
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

          {/* Header */}
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-0">

                {/* Left — images */}
                <div className="sm:w-64 shrink-0 bg-gray-50 flex flex-col items-center justify-center p-4 gap-3 border-b sm:border-b-0 sm:border-r border-gray-100">
                  {/* Main image */}
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                    {images.length > 0 ? (
                      <a href={images[imgIdx]} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                        <img src={images[imgIdx]} alt={p?.name ?? ''} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                      </a>
                    ) : (
                      <Package className="w-16 h-16 text-slate-200" />
                    )}
                  </div>
                  {/* Thumbnails */}
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

                {/* Right — details */}
                <div className="flex-1 p-6 space-y-5">

                  {/* Price */}
                  {p?.price && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Giá bán</p>
                      <p className="text-2xl font-black text-indigo-600">
                        {Number(p.price).toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  )}

                  {/* Attributes grid */}
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

                  {/* Added by */}
                  <div className="pt-3 border-t border-gray-100 text-xs text-slate-400 space-y-0.5">
                    <p>Thêm bởi <span className="font-semibold text-slate-600">{teamProduct.added_by?.full_name ?? '—'}</span></p>
                    <p>{new Date(teamProduct.added_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
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

// ── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  teamProduct,
  canRemove,
  onRemove,
}: {
  teamProduct: TeamProduct
  canRemove: boolean
  onRemove: () => void
}) {
  const [showDetail, setShowDetail] = useState(false)
  const p = teamProduct.product

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer"
      >
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {p?.image_url ? (
            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-slate-200" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
            {p?.market && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm',
                p.market === 'VIETNAM' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
              )}>
                {p.market === 'VIETNAM' ? 'VN' : 'Global'}
              </span>
            )}
          </div>

          {/* Remove button */}
          {canRemove && (
            <button
              onClick={e => { e.stopPropagation(); onRemove() }}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
              title="Xóa khỏi kho team"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Product line tag */}
          {p?.product_line && (
            <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gradient-to-t from-black/50 to-transparent">
              <span className="text-[11px] font-semibold text-white/90">{p.product_line.name}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 py-3.5">
          <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
            {p?.name ?? '—'}
          </p>
          <p className="text-xs text-slate-400 font-mono mt-1">{p?.sku}</p>
          <div className="flex items-center justify-between mt-2.5">
            {p?.price ? (
              <p className="text-base font-black text-indigo-600">
                {Number(p.price).toLocaleString('vi-VN')}₫
              </p>
            ) : (
              <span />
            )}
            {(p?.priority_score ?? 0) > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-amber-500">{p?.priority_score}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetail && (
        <ProductDetailModal
          teamProduct={teamProduct}
          canRemove={canRemove}
          onRemove={() => { onRemove(); setShowDetail(false) }}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}
