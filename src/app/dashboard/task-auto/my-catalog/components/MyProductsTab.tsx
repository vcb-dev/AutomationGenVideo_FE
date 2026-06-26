'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Loader2, Package, Search, Download,
  ChevronLeft, ChevronRight, ImageIcon, SendHorizontal, Check, X, ExternalLink,
} from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, CreatableSelect } from '@/components/task-auto/DarkInput'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import {
  getProducts, getTeamProducts, getSources, getTeamSources,
  getEditorProducts, createEditorProduct, updateEditorProduct, createEditorSource, getEditorSources, deleteEditorProduct, pushEditorProductToTeam,
  getProductLines, createProductLine, getMaterials, createMaterial,
  getTeams,
} from '@/lib/api/task-auto'
import {
  MarketPicker, PriceInput, MultiImagePicker, SourceForm, MarketBadge, LoadingRows,
} from '../../catalog/components/ProductsTab/ProductFormFields'
import { parseMarkets, formatPrice, defaultSource } from '../../catalog/components/ProductsTab/product-utils'
import type { SourceDraft } from '../../catalog/components/ProductsTab/product-utils'
import { Product, TeamProduct, SOURCE_TYPE_LABELS } from '@/types/task-auto'
import { SOURCE_TYPE_COLORS } from '../../catalog/components/ProductsTab/product-utils'
import { ProductViewModal } from '@/components/task-auto/ProductViewModal'

// ── Push to team modal ────────────────────────────────────────────────────────

function PushModal({ product, userId, onClose }: { product: Product; userId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const myTeam = teams?.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))
  const push = useMutation({
    mutationFn: () => pushEditorProductToTeam(userId, product.id, myTeam!.id),
    onSuccess: () => { toast.success('Đã đẩy sang kho team'); qc.invalidateQueries({ queryKey: ['task-auto', 'my-products'] }); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể đẩy sang team'),
  })
  return (
    <DarkModal open onClose={onClose} title="Đẩy sang kho team" size="sm"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button disabled={!myTeam || push.isPending} onClick={() => push.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {push.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Đẩy sang team
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Sản phẩm <strong className="text-slate-800">{product.name}</strong> sẽ được thêm vào kho sản phẩm của team.
        </p>
        {myTeam ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <span className="font-semibold">{myTeam.name}</span>
          </div>
        ) : (
          <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Bạn chưa thuộc team nào
          </div>
        )}
      </div>
    </DarkModal>
  )
}

// ── Import from global/team modal ─────────────────────────────────────────────

function ImportModal({
  userId,
  brandType: initialBrandType,
  onImported,
  onClose,
}: {
  userId: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  onImported: () => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'global' | 'team'>('global')
  const [brandType, setBrandType] = useState(initialBrandType)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const myTeam = teams?.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))

  const { data: myProducts } = useQuery({
    queryKey: ['task-auto', 'my-products-skus', userId],
    queryFn: () => getEditorProducts(userId, { limit: 500 }),
  })
  // Check against sku+'-p' since that's what we create when copying
  const mySkuSet = new Set(myProducts?.data?.map(p => p.sku?.trim().toLowerCase()).filter(Boolean) ?? [])

  const { data: globalData, isLoading: loadingGlobal } = useQuery({
    queryKey: ['task-auto', 'import-products-global', brandType, search],
    queryFn: () => getProducts({ brand_type: brandType, search: search || undefined, limit: 50, is_active: true }),
    enabled: scope === 'global',
  })

  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ['task-auto', 'import-products-team', myTeam?.id, brandType],
    queryFn: () => getTeamProducts(myTeam!.id, brandType),
    enabled: scope === 'team' && !!myTeam,
  })

  const isLoading = scope === 'global' ? loadingGlobal : loadingTeam

  const rawItems: Array<Product | TeamProduct> = scope === 'global'
    ? (globalData?.data ?? [])
    : (teamData ?? [])

  const available = rawItems.filter(p => {
    const skuLower = p.sku?.trim().toLowerCase() ?? ''
    // Global products get '-p' appended when copied; team products already have the final sku
    const checkSku = scope === 'global' ? skuLower + '-p' : skuLower
    if (mySkuSet.has(checkSku)) return false
    if (scope === 'team' && search) {
      const q = search.toLowerCase()
      return skuLower.includes(q) || p.name?.toLowerCase().includes(q)
    }
    return true
  })

  const toggleId = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () =>
    setSelectedIds(selectedIds.size === available.length ? new Set() : new Set(available.map(p => p.id)))
  const allSelected = available.length > 0 && selectedIds.size === available.length

  const copyMut = useMutation({
    mutationFn: async () => {
      const selected = available.filter(p => selectedIds.has(p.id))
      const results = await Promise.allSettled(
        selected.map(async p => {
          const isTeamProduct = scope === 'team'
          const sourceId = isTeamProduct
            ? (p as TeamProduct).source_product_id ?? undefined
            : p.id

          const editorProduct = await createEditorProduct(userId, {
            ...(sourceId ? { source_product_id: sourceId } : {}),
            sku: scope === 'team' ? p.sku : `${p.sku}-P`,
            name: p.name,
            brand_type: brandType,
            image_urls: (p as any).image_urls ?? [],
            price: p.price ?? undefined,
            market: p.market,
            price_segment: p.price_segment ?? undefined,
            priority_score: p.priority_score ?? 0,
            material_id: p.material_id ?? null,
            product_line_id: p.product_line_id ?? null,
            is_active: true,
          } as any)

          // Kéo sources liên kết về
          const linkedSources = isTeamProduct && myTeam
            ? await getTeamSources(myTeam.id, { team_product_id: p.id } as any).catch(() => [] as any[])
            : await getSources({ product_id: p.id, limit: 100 }).then(r => r.data).catch(() => [])

          if (linkedSources.length > 0) {
            await Promise.allSettled(
              linkedSources.map((s: any) => createEditorSource(userId, {
                type: s.type,
                name: s.name,
                link: s.link,
                code: s.code || undefined,
                editor_product_id: editorProduct.id,
                is_active: s.is_active ?? true,
              } as any))
            )
          }
        })
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} sản phẩm thêm thất bại`)
    },
    onSuccess: () => {
      toast.success(`Đã thêm ${selectedIds.size} sản phẩm vào kho cá nhân`)
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-products'] })
      onImported()
    },
    onError: (e: any) => toast.error(e?.message || 'Không thể thêm sản phẩm'),
  })

  return (
    <DarkModal
      open
      onClose={onClose}
      title="Lấy từ kho danh mục"
      subtitle="Chọn nhiều sản phẩm để thêm vào kho cá nhân"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button
            onClick={() => copyMut.mutate()}
            disabled={copyMut.isPending || selectedIds.size === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {copyMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : selectedIds.size > 0 ? <Check className="w-3.5 h-3.5" /> : null}
            {selectedIds.size > 0 ? `Thêm ${selectedIds.size} sản phẩm` : 'Thêm vào kho'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Scope + brand switcher */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {(['global', 'team'] as const).map(s => (
              <button key={s} onClick={() => { setScope(s); setSelectedIds(new Set()) }}
                className={cn('px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                  scope === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200')}>
                {s === 'global' ? 'Kho chung' : 'Kho team'}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {(['DO_DA', 'TRANG_SUC'] as const).map(b => (
              <button key={b} onClick={() => { setBrandType(b); setSelectedIds(new Set()) }}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  brandType === b ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-slate-500 hover:border-slate-400')}>
                {b === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
              </button>
            ))}
          </div>
        </div>

        {scope === 'team' && (myTeam ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700">
            <span className="font-semibold">{myTeam.name}</span>
            <span className="text-indigo-400 text-xs">— kho team của bạn</span>
          </div>
        ) : (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Bạn chưa thuộc team nào
          </div>
        ))}

        {/* Search + select all */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedIds(new Set()) }}
              placeholder="Tìm SKU, tên sản phẩm..."
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {available.length > 0 && (
            <button onClick={toggleAll} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap">
              {allSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${available.length})`}
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto space-y-1">
          {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>}
          {!isLoading && available.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 italic">
              {search ? 'Không tìm thấy sản phẩm phù hợp' : 'Tất cả sản phẩm đã có trong kho cá nhân'}
            </p>
          )}
          {available.map(p => {
            const thumb = p.image_urls?.[0] ?? p.image_url
            const selected = selectedIds.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggleId(p.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                  selected ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-gray-50 border border-transparent'
                )}
              >
                <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                  selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white')}>
                  {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {thumb
                    ? <img src={driveImageUrl(thumb) ?? thumb} alt={p.name} className="w-full h-full object-cover" />
                    : <Package className="w-4 h-4 text-slate-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 truncate">SKU: {p.sku}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </DarkModal>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface Props { userId: string; brandType: 'DO_DA' | 'TRANG_SUC' }

export function MyProductsTab({ userId, brandType }: Props) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [pushItem, setPushItem] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewProduct, setViewProduct] = useState<Product | null>(null)

  const [form, setForm] = useState<Partial<Product> & { image_urls: string[] }>({
    sku: '', name: '', image_urls: [], price: '',
    price_segment: '', priority_score: 0, material_id: '', product_line_id: '', is_active: true,
  })
  const [markets, setMarkets] = useState<string[]>(['VIETNAM'])
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(defaultSource)

  const { data: productLines } = useQuery({ queryKey: ['task-auto', 'product-lines', brandType], queryFn: () => getProductLines(brandType) })
  const { data: materials } = useQuery({ queryKey: ['task-auto', 'materials', brandType], queryFn: () => getMaterials(brandType) })
  const { data: editingSourcesData } = useQuery({
    queryKey: ['task-auto', 'editor-sources-by-product', editing?.id],
    queryFn: () => getEditorSources(userId, { editor_product_id: editing!.id, limit: 100 }),
    enabled: modal === 'edit' && !!editing?.id,
  })
  const editingSources = editingSourcesData?.data ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'my-products', userId, brandType, search, page],
    queryFn: () => getEditorProducts(userId, { brand_type: brandType, search: search || undefined, page, limit: 20 }),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['task-auto', 'my-products'] })

  const createMut = useMutation({
    mutationFn: async (body: Partial<Product>) => {
      const product = await createEditorProduct(userId, body)
      if (sourceDraft.enabled && sourceDraft.name && sourceDraft.link) {
        await createEditorSource(userId, {
          type: sourceDraft.type, name: sourceDraft.name, link: sourceDraft.link,
          code: sourceDraft.code || undefined, editor_product_id: product.id, is_active: true,
        } as any).catch(() => null)
      }
      return product
    },
    onSuccess: () => { refresh(); toast.success('Đã thêm sản phẩm'); setModal(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể thêm sản phẩm'),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Product> }) => {
      await updateEditorProduct(userId, id, body)
      if (sourceDraft.enabled && sourceDraft.name && sourceDraft.link) {
        await createEditorSource(userId, {
          type: sourceDraft.type, name: sourceDraft.name, link: sourceDraft.link,
          code: sourceDraft.code || undefined, editor_product_id: id, is_active: true,
        } as any).catch(() => null)
      }
    },
    onSuccess: () => {
      refresh()
      qc.invalidateQueries({ queryKey: ['task-auto', 'editor-sources-by-product', editing?.id] })
      toast.success('Đã cập nhật sản phẩm')
      setModal(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể cập nhật'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEditorProduct(userId, id),
    onSuccess: () => { refresh(); toast.success('Đã xóa sản phẩm'); setDeletingId(null) },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Không thể xóa'); setDeletingId(null) },
  })

  const openCreate = (prefill?: Partial<Product>) => {
    const image_urls = prefill?.image_urls?.length ? prefill.image_urls : (prefill?.image_url ? [prefill.image_url] : [])
    setForm({
      sku: prefill?.sku ? `${prefill.sku}-P` : '',
      name: prefill?.name ?? '',
      image_urls,
      price: prefill?.price ?? '',
      price_segment: prefill?.price_segment ?? '',
      priority_score: prefill?.priority_score ?? 0,
      material_id: prefill?.material_id ?? '',
      product_line_id: prefill?.product_line_id ?? '',
      is_active: true,
    })
    setMarkets(prefill?.market ? parseMarkets(prefill.market) : ['VIETNAM'])
    setSourceDraft(defaultSource)
    setEditing(null)
    setModal('create')
  }

  const openEdit = (p: Product) => {
    const image_urls = p.image_urls?.length ? p.image_urls : (p.image_url ? [p.image_url] : [])
    setForm({ ...p, image_urls })
    setMarkets(parseMarkets(p.market))
    setSourceDraft(defaultSource)
    setEditing(p)
    setModal('edit')
  }

  const handleSubmit = () => {
    if (!form.sku?.trim() || !form.name?.trim()) return toast.error('SKU và tên là bắt buộc')
    if (markets.length === 0) return toast.error('Chọn ít nhất một thị trường')
    const body = {
      name: form.name, brand_type: brandType, image_urls: form.image_urls,
      price: form.price || undefined, market: markets.join(','),
      price_segment: form.price_segment || undefined,
      priority_score: form.priority_score,
      material_id: form.material_id || null,
      product_line_id: form.product_line_id || null,
      is_active: form.is_active,
    }
    if (modal === 'create') createMut.mutate({ sku: form.sku, ...body })
    else if (editing) updateMut.mutate({ id: editing.id, body })
  }

  const saving = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm SKU, tên sản phẩm..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl px-4 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" /> Lấy từ kho
          </button>
          <button
            onClick={() => openCreate()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" /> Thêm sản phẩm
          </button>
        </div>
      </div>

      {data && data.total > 0 && (
        <p className="text-sm text-slate-500 px-1">
          <span className="font-bold text-slate-700">{data.total}</span> sản phẩm cá nhân
        </p>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-gray-200">
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">SKU</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Sản phẩm</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Dòng SP</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Thị trường</th>
                <th className="text-right px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Giá bán</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows cols={6} />}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={6}><EmptyState icon={Package} title="Chưa có sản phẩm cá nhân nào" /></td></tr>
              )}
              {data?.data.map(p => {
                const thumb = p.image_urls?.[0] ?? p.image_url
                return (
                  <tr key={p.id} onClick={() => setViewProduct(p)} className="hover:bg-indigo-50/20 transition-colors group cursor-pointer">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-block bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">{p.sku}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {thumb
                          ? <img src={driveImageUrl(thumb) ?? thumb} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0" />
                          : <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><ImageIcon className="w-4 h-4 text-slate-300" /></div>
                        }
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-800 truncate max-w-[220px]">{p.name}</p>
                          {p.price_segment && <p className="text-xs text-slate-400">{p.price_segment}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {p.product_line?.name
                        ? <span className="text-sm font-medium text-slate-700">{p.product_line.name}</span>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        {parseMarkets(p.market).map(m => <MarketBadge key={m} market={m} />)}
                        {!p.market && <span className="text-slate-300 text-sm">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {formatPrice(p.price)
                        ? <span className="text-base font-bold text-slate-800">{formatPrice(p.price)}</span>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPushItem(p)}
                          title="Đẩy sang kho team"
                          className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <SendHorizontal className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(p.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-slate-500">Trang <span className="font-semibold">{page}</span> / {data.totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <DarkModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Thêm sản phẩm vào kho cá nhân' : 'Chỉnh sửa sản phẩm'}
        size="xl"
        footer={
          <>
            <button onClick={() => setModal(null)} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
            <button onClick={handleSubmit} disabled={saving || markets.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {modal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Thông tin cơ bản */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Thông tin cơ bản
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DarkInput
                label="SKU *"
                placeholder="VD: NM101-P"
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
                  const created = await createProductLine(name, brandType)
                  qc.setQueryData<typeof productLines>(['task-auto', 'product-lines', brandType], old => [...(old ?? []), created])
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
                  const created = await createMaterial(name, brandType)
                  qc.setQueryData<typeof materials>(['task-auto', 'materials', brandType], old => [...(old ?? []), created])
                  return { id: created.id, label: created.name }
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PriceInput label="Giá bán (₫)" value={form.price ?? ''} onChange={v => setForm(f => ({ ...f, price: v }))} />
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
            <MultiImagePicker values={form.image_urls ?? []} onChange={urls => setForm(f => ({ ...f, image_urls: urls }))} />
          </div>

          {/* Trạng thái */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Trạng thái
            </p>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <p className="text-sm font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Source đi kèm{' '}
              {modal === 'edit'
                ? <span className="text-gray-300 font-normal normal-case tracking-normal">({editingSources.length} hiện có)</span>
                : <span className="text-gray-300 font-normal normal-case tracking-normal">(tuỳ chọn)</span>
              }
            </p>
            {modal === 'edit' && editingSources.length > 0 && (
              <div className="space-y-1.5 mb-1">
                {editingSources.map(s => (
                  <a key={s.id} href={s.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold shrink-0', SOURCE_TYPE_COLORS[s.type] ?? 'bg-slate-100 text-slate-500')}>
                      {SOURCE_TYPE_LABELS[s.type]}
                    </span>
                    <span className="text-sm text-slate-700 truncate flex-1">{s.name}</span>
                    {s.code && <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">{s.code}</span>}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            )}
            <SourceForm value={sourceDraft} onChange={setSourceDraft} />
          </div>
        </div>
      </DarkModal>

      {showImport && (
        <ImportModal
          userId={userId}
          brandType={brandType}
          onImported={() => setShowImport(false)}
          onClose={() => setShowImport(false)}
        />
      )}

      {pushItem && <PushModal product={pushItem} userId={userId} onClose={() => setPushItem(null)} />}

      {viewProduct && (
        <ProductViewModal
          open
          item={viewProduct as any}
          catalogType="editor"
          userId={userId}
          canEdit
          canDelete
          onClose={() => setViewProduct(null)}
          onEdit={() => { openEdit(viewProduct); setViewProduct(null) }}
          onDelete={() => { setDeletingId(viewProduct.id); setViewProduct(null) }}
        />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa sản phẩm"
        message="Sản phẩm sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa sản phẩm"
        danger
        isLoading={deleteMut.isPending}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
