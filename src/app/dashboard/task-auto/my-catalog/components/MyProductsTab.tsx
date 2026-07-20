'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Loader2, Package, Search, Download,
  ChevronLeft, ChevronRight, ImageIcon, SendHorizontal, Check, X,
} from 'lucide-react'
import { cn, driveImageUrl } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { HeaderFilterDropdown } from '@/components/task-auto/HeaderFilterDropdown'
import {
  getProducts, getTeamProducts, getSources, getTeamSources,
  getEditorProducts, createEditorProduct, createEditorSource, deleteEditorProduct, pushEditorProductToTeam,
  getProductLines,
  getProductClassifications,
  getTeams, getMyPushRequests,
} from '@/lib/api/task-auto'
import {
  MarketBadge, LoadingRows,
} from '../../catalog/components/ProductsTab/ProductFormFields'
import { parseMarkets, formatPrice } from '../../catalog/components/ProductsTab/product-utils'
import { Product, TeamProduct } from '@/types/task-auto'
import { ProductFormModal } from '@/components/task-auto/ProductFormModal'
import { ProductViewModal } from '@/components/task-auto/ProductViewModal'

// ── Push to team modal ────────────────────────────────────────────────────────

function PushModal({ product, userId, onClose }: { product: Product; userId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const myTeams = teams?.filter(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId)) ?? []
  const [teamId, setTeamId] = useState('')
  const effectiveTeamId = teamId || myTeams[0]?.id || ''
  const selectedTeam = myTeams.find(t => t.id === effectiveTeamId)
  const isLeaderOfTeam = selectedTeam?.leader_id === userId
  const push = useMutation({
    mutationFn: () => pushEditorProductToTeam(userId, product.id, effectiveTeamId),
    onSuccess: (res: any) => {
      toast.success(res?.pending ? 'Đã gửi yêu cầu — chờ leader duyệt' : 'Đã đẩy sang kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-products'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-push-requests'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể đẩy sang team'),
  })
  return (
    <DarkModal open onClose={onClose} title="Đẩy sang kho team" size="sm"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button disabled={!effectiveTeamId || push.isPending} onClick={() => push.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {push.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isLeaderOfTeam ? 'Đẩy sang team' : 'Gửi yêu cầu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Sản phẩm <strong className="text-slate-800">{product.name}</strong> sẽ được thêm vào kho sản phẩm của team.
        </p>
        {myTeams.length > 1 ? (
          <CustomSelect
            label="Chọn team"
            value={effectiveTeamId}
            onChange={setTeamId}
            options={myTeams.map(t => ({ value: t.id, label: t.name }))}
          />
        ) : myTeams.length === 1 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <span className="font-semibold">{myTeams[0].name}</span>
          </div>
        ) : (
          <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Bạn chưa thuộc team nào
          </div>
        )}
        {!isLeaderOfTeam && effectiveTeamId && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Yêu cầu sẽ được gửi tới leader của team để duyệt trước khi sản phẩm vào kho team.
          </p>
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
  const brandType = initialBrandType
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

  // Sản phẩm được đẩy lên kho tổng/kho team từ kho khác có sku/name/ảnh rỗng ở bản ghi gốc —
  // dữ liệu thật nằm ở source_team_product (kho tổng) hoặc source_editor_product (kho team).
  const resolveImportItem = (p: Product | TeamProduct) => {
    if (scope === 'global') {
      const g = p as Product
      const tp = g.source_team_product
      const tp_ep = tp?.source_editor_product
      return {
        sku: g.sku || tp?.sku || tp_ep?.sku || '',
        name: g.name || tp?.name || tp_ep?.name || '',
        imageUrl: g.image_url ?? tp?.image_url ?? tp_ep?.image_url ?? null,
        imageUrls: g.image_urls?.length ? g.image_urls : tp?.image_urls?.length ? tp.image_urls : (tp_ep?.image_urls ?? []),
        price: g.price ?? tp?.price ?? tp_ep?.price ?? null,
        market: g.market ?? tp?.market ?? tp_ep?.market ?? null,
        priceSegment: g.price_segment ?? tp?.price_segment ?? tp_ep?.price_segment ?? null,
        priorityScore: g.priority_score ?? 0,
        materialId: g.material_id ?? tp?.material?.id ?? tp_ep?.material?.id ?? null,
        productLineId: g.product_line_id ?? tp?.product_line?.id ?? tp_ep?.product_line?.id ?? null,
        classificationId: g.classification_id ?? tp?.classification?.id ?? tp_ep?.classification?.id ?? null,
      }
    }
    const t = p as TeamProduct
    const ep = t.source_editor_product
    return {
      sku: t.sku || ep?.sku || '',
      name: t.name || ep?.name || '',
      imageUrl: t.image_url ?? ep?.image_url ?? null,
      imageUrls: t.image_urls?.length ? t.image_urls : (ep?.image_urls ?? []),
      price: t.price ?? ep?.price ?? null,
      market: t.market ?? ep?.market ?? null,
      priceSegment: t.price_segment ?? ep?.price_segment ?? null,
      priorityScore: t.priority_score ?? 0,
      materialId: t.material_id ?? ep?.material_id ?? null,
      productLineId: t.product_line_id ?? ep?.product_line_id ?? null,
      classificationId: t.classification_id ?? ep?.classification_id ?? null,
    }
  }

  const available = rawItems.filter(p => {
    const skuLower = resolveImportItem(p).sku.trim().toLowerCase()
    // Global products get '-p' appended when copied; team products already have the final sku
    const checkSku = scope === 'global' ? skuLower + '-p' : skuLower
    if (mySkuSet.has(checkSku)) return false
    if (scope === 'team' && search) {
      const q = search.toLowerCase()
      const r = resolveImportItem(p)
      return r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
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
          const r = resolveImportItem(p)

          const editorProduct = await createEditorProduct(userId, {
            ...(sourceId ? { source_product_id: sourceId } : {}),
            sku: scope === 'team' ? r.sku : `${r.sku}-P`,
            name: r.name,
            brand_type: brandType,
            image_urls: r.imageUrls,
            price: r.price ?? undefined,
            market: r.market ?? undefined,
            price_segment: r.priceSegment ?? undefined,
            priority_score: r.priorityScore,
            material_id: r.materialId,
            product_line_id: r.productLineId,
            classification_id: r.classificationId,
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
        {/* Scope switcher */}
        <div className="flex gap-1.5">
          {(['global', 'team'] as const).map(s => (
            <button key={s} onClick={() => { setScope(s); setSelectedIds(new Set()) }}
              className={cn('px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                scope === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200')}>
              {s === 'global' ? 'Kho chung' : 'Kho team'}
            </button>
          ))}
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
            const r = resolveImportItem(p)
            const thumb = r.imageUrls[0] ?? r.imageUrl
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
                    ? <img src={driveImageUrl(thumb) ?? thumb} alt={r.name} className="w-full h-full object-cover" />
                    : <Package className="w-4 h-4 text-slate-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{r.name || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}</p>
                  <p className="text-xs text-slate-400 truncate">SKU: {r.sku || '—'}</p>
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
  const [productLineFilter, setProductLineFilter] = useState('')
  const [classificationFilter, setClassificationFilter] = useState('')
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [pushItem, setPushItem] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewProduct, setViewProduct] = useState<Product | null>(null)

  const { data: productLines } = useQuery({ queryKey: ['task-auto', 'product-lines'], queryFn: () => getProductLines() })
  const { data: productClassifications } = useQuery({ queryKey: ['task-auto', 'product-classifications'], queryFn: () => getProductClassifications() })

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'my-products', userId, brandType, search, productLineFilter, classificationFilter, month, page],
    queryFn: () => getEditorProducts(userId, {
      brand_type: brandType,
      search: search || undefined,
      product_line_id: productLineFilter || undefined,
      classification_id: classificationFilter || undefined,
      month: month || undefined,
      page, limit: 20,
    }),
  })

  const { data: myPushRequests } = useQuery({
    queryKey: ['task-auto', 'my-push-requests', userId],
    queryFn: () => getMyPushRequests(userId, 'PENDING'),
  })
  const pendingProductIds = new Set((myPushRequests ?? []).map(r => r.editor_product_id).filter(Boolean))

  const refresh = () => qc.invalidateQueries({ queryKey: ['task-auto', 'my-products'] })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEditorProduct(userId, id),
    onSuccess: () => { refresh(); toast.success('Đã xóa sản phẩm'); setDeletingId(null) },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Không thể xóa'); setDeletingId(null) },
  })

  const openCreate = () => {
    setEditing(null)
    setModal('create')
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setModal('edit')
  }

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
          <input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); setPage(1) }}
            className="px-3 py-3.5 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
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
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">
                  <HeaderFilterDropdown
                    label="Dòng SP"
                    value={productLineFilter}
                    onChange={v => { setProductLineFilter(v); setPage(1) }}
                    options={(productLines ?? []).map(l => ({ value: l.id, label: l.name }))}
                  />
                </th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">
                  <HeaderFilterDropdown
                    label="Phân loại"
                    value={classificationFilter}
                    onChange={v => { setClassificationFilter(v); setPage(1) }}
                    options={(productClassifications ?? []).map(c => ({ value: c.id, label: c.name }))}
                  />
                </th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Thị trường</th>
                <th className="text-right px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Giá bán</th>
                {/* <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Người thêm</th> */}
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Ngày thêm</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows cols={9} />}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={9}><EmptyState icon={Package} title="Chưa có sản phẩm cá nhân nào" /></td></tr>
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
                      {p.classification?.name
                        ? <span className="text-sm font-medium text-slate-700">{p.classification.name}</span>
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
                    {/* <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">
                        {p.added_by?.full_name ?? <span className="text-slate-300">—</span>}
                      </span>
                    </td> */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">
                        {(p as any).added_at ? new Date((p as any).added_at).toLocaleDateString('vi-VN') : <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {pendingProductIds.has(p.id) ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap" title="Đang chờ leader duyệt vào kho team">
                            Chờ duyệt
                          </span>
                        ) : (
                          <button
                            onClick={() => setPushItem(p)}
                            title="Đẩy sang kho team"
                            className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <SendHorizontal className="w-4 h-4" />
                          </button>
                        )}
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
      {modal && (
        <ProductFormModal
          open
          editing={editing}
          userId={userId}
          defaultBrandType={brandType}
          lockBrandType
          title={modal === 'create' ? 'Thêm sản phẩm vào kho cá nhân' : 'Chỉnh sửa sản phẩm'}
          onClose={() => setModal(null)}
          onSuccess={() => { refresh(); setModal(null) }}
        />
      )}

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
