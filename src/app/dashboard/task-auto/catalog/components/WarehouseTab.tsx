'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Package, FileText, Radio, Trash2, Plus, Loader2,
  Search, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MonthPicker } from '@/components/task-auto/MonthPicker'
import { currentMonth } from '@/components/task-auto/helpers'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, CustomSelect } from '@/components/task-auto/DarkInput'
import { ProductFormModal } from '@/components/task-auto/ProductFormModal'
import { ContentFormModal } from '@/components/task-auto/ContentFormModal'
import {
  getGlobalWarehouse, addGlobalWarehouse, removeGlobalWarehouse, autoCarryGlobal,
  getProducts, getContents, getSources, createSource,
  type WarehouseCatalogType,
} from '@/lib/api/task-auto'
import type { BrandType, Product, Content, Source } from '@/types/task-auto'
import { SOURCE_TYPE_LABELS } from '@/types/task-auto'

type SubTab = 'products' | 'contents' | 'sources'

const SUB_TABS: { key: SubTab; label: string; icon: React.ElementType }[] = [
  { key: 'products', label: 'Sản phẩm', icon: Package },
  { key: 'contents', label: 'Content',  icon: FileText },
  { key: 'sources',  label: 'Sources',  icon: Radio },
]

function prevMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  if (mo === 1) return `${y - 1}-12`
  return `${y}-${String(mo - 1).padStart(2, '0')}`
}

// ── Pick modal (chọn từ kho có sẵn) ──────────────────────────────────────────

function PickItemsModal({
  open, onClose, brandType, month, warehouseIds, type, onAdded, onRequestCreate, canCreate,
}: {
  open: boolean
  onClose: () => void
  brandType: BrandType
  month: string
  warehouseIds: Set<string>
  type: SubTab
  onAdded: () => void
  onRequestCreate: () => void
  canCreate?: boolean
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: productsData } = useQuery({
    queryKey: ['task-auto', 'products', brandType, 'all-for-warehouse'],
    queryFn: () => getProducts({ brand_type: brandType, limit: 200 }),
    enabled: open && type === 'products',
  })
  const { data: contentsData } = useQuery({
    queryKey: ['task-auto', 'contents', brandType, 'all-for-warehouse'],
    queryFn: () => getContents({ brand_type: brandType, limit: 200 }),
    enabled: open && type === 'contents',
  })
  const { data: sourcesData } = useQuery({
    queryKey: ['task-auto', 'sources', brandType, 'all-for-warehouse'],
    queryFn: () => getSources({ brand_type: brandType, limit: 200 }),
    enabled: open && type === 'sources',
  })

  const allItems = useMemo(() => {
    if (type === 'products') return (productsData?.data ?? []) as Array<Product | Content | Source>
    if (type === 'contents') return (contentsData?.data ?? []) as Array<Product | Content | Source>
    return (sourcesData?.data ?? []) as Array<Product | Content | Source>
  }, [type, productsData, contentsData, sourcesData])

  const filtered = useMemo(() => {
    const notIn = allItems.filter(item => !warehouseIds.has(item.id))
    if (!search.trim()) return notIn
    const q = search.toLowerCase()
    return notIn.filter(item => {
      const name = (item as any).name ?? (item as any).title ?? ''
      const code = (item as any).sku ?? (item as any).code ?? ''
      return name.toLowerCase().includes(q) || code.toLowerCase().includes(q)
    })
  }, [allItems, warehouseIds, search])

  const addMut = useMutation({
    mutationFn: () => addGlobalWarehouse(type as WarehouseCatalogType, month, [...selected]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'global', month] })
      toast.success(`Đã thêm ${selected.size} mục vào kho ${month}`)
      setSelected(new Set())
      onAdded()
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi thêm vào kho'),
  })

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (!open) return null
  const labelOf = (item: any) => {
    const tp = item.source_team_product; const tp_ep = tp?.source_editor_product
    const tc = item.source_team_content; const tc_ec = tc?.source_editor_content
    const ts = item.source_team_source; const ts_es = ts?.source_editor_source
    return (
      item.name || item.title || item.sku ||
      tp?.name || tp_ep?.name ||
      tc?.title || tc_ec?.title ||
      ts?.name || ts_es?.name ||
      item.id
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-800">Thêm vào kho {month}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-slate-400 transition-colors text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 && <div className="py-10 text-center text-slate-400 text-sm">Không có mục nào</div>}
          {filtered.map(item => (
            <label key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
              <span className="text-sm text-slate-700 flex-1">{labelOf(item)}</span>
              {((item as any).sku || (item as any).code) && (
                <span className="text-xs text-slate-400">{(item as any).sku || (item as any).code}</span>
              )}
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          {canCreate && (
            <button
              onClick={() => { onClose(); onRequestCreate() }}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo mới
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-gray-100 transition-colors">Huỷ</button>
            <button
              onClick={() => addMut.mutate()}
              disabled={selected.size === 0 || addMut.isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {addMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Thêm {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Source create modal (inline vì không có standalone component) ──────────────

function SourceCreateModal({
  open, onClose, brandType, month,
}: {
  open: boolean
  onClose: () => void
  brandType: BrandType
  month: string
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', type: 'PRODUCT_STOCK', link: '', nas_link: '' })

  const mut = useMutation({
    mutationFn: async () => {
      const src = await createSource({ name: form.name.trim(), brand_type: brandType, type: form.type as any, link: form.link.trim() || undefined, nas_link: form.nas_link.trim() })
      await addGlobalWarehouse('sources', month, [src.id])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'global', month] })
      toast.success(`Đã tạo source và thêm vào kho ${month}`)
      setForm({ name: '', type: 'PRODUCT_STOCK', link: '', nas_link: '' })
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi tạo source'),
  })

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title="Tạo source mới & thêm vào kho"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Huỷ</button>
          <button
            onClick={() => mut.mutate()}
            disabled={!form.name.trim() || !form.type || !form.nas_link.trim() || mut.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo & Thêm vào kho
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <CustomSelect
          label="Loại source *"
          value={form.type}
          onChange={v => setForm(f => ({ ...f, type: v }))}
          options={Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
        <DarkInput label="Tên source *" placeholder="Tên nguồn tài liệu..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <DarkInput label="Link ổ NAS *" placeholder="\\nas\... hoặc smb://..." value={form.nas_link} onChange={e => setForm(f => ({ ...f, nas_link: e.target.value }))} />
        <DarkInput label="Link" placeholder="https://... (tuỳ chọn)" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
      </div>
    </DarkModal>
  )
}

// ── Main WarehouseTab ─────────────────────────────────────────────────────────

export function WarehouseTab({ brandType, isAdminOrManager = false, isScaleData = false }: {
  brandType: BrandType
  isAdminOrManager?: boolean
  isScaleData?: boolean
}) {
  const qc = useQueryClient()
  const [month, setMonth] = useState(currentMonth())
  const [subTab, setSubTab] = useState<SubTab>('products')
  const [page, setPage] = useState(1)
  const [showPickModal, setShowPickModal] = useState(false)
  const [createWhat, setCreateWhat] = useState<'product' | 'content' | 'source' | null>(null)
  const [confirmCarry, setConfirmCarry] = useState(false)

  const prev = prevMonth(month)

  // Products & contents: chỉ Admin/Manager. Sources: Admin/Manager + Scale Data
  const canWriteCurrent = subTab === 'sources'
    ? (isAdminOrManager || isScaleData)
    : isAdminOrManager

  const { data: warehouse, isLoading } = useQuery({
    queryKey: ['task-auto', 'warehouse', 'global', month, brandType],
    queryFn: () => getGlobalWarehouse(month, brandType),
    enabled: !!month,
  })

  const warehouseItems = useMemo(() => {
    if (!warehouse) return []
    if (subTab === 'products') return warehouse.products
    if (subTab === 'contents') return warehouse.contents
    return warehouse.sources
  }, [warehouse, subTab])

  const warehouseIds = useMemo(() => new Set(warehouseItems.map(i => i.id)), [warehouseItems])

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(warehouseItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedItems = useMemo(
    () => warehouseItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [warehouseItems, safePage],
  )

  const removeMut = useMutation({
    mutationFn: (id: string) => removeGlobalWarehouse(subTab as WarehouseCatalogType, month, [id]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'global', month] })
      toast.success('Đã xoá khỏi kho tháng')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi xoá'),
  })

  const carryMut = useMutation({
    mutationFn: () => autoCarryGlobal(month),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'global', month] })
      toast.success(`Đã copy kho ${prev} → ${month}`)
      setConfirmCarry(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi auto-carry'),
  })

  const addProductToWarehouse = async (product: Product) => {
    try {
      await addGlobalWarehouse('products', month, [product.id])
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'global', month] })
      toast.success(`Đã tạo sản phẩm và thêm vào kho ${month}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Sản phẩm đã tạo nhưng không thể thêm vào kho')
    }
    setCreateWhat(null)
  }

  const addContentToWarehouse = async (content: Content) => {
    try {
      await addGlobalWarehouse('contents', month, [content.id])
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'global', month] })
      toast.success(`Đã tạo content và thêm vào kho ${month}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Content đã tạo nhưng không thể thêm vào kho')
    }
    setCreateWhat(null)
  }

  const labelOf = (item: any): string => {
    const tp = item.source_team_product; const tp_ep = tp?.source_editor_product
    const tc = item.source_team_content; const tc_ec = tc?.source_editor_content
    const ts = item.source_team_source; const ts_es = ts?.source_editor_source
    return (
      item.name || item.title || item.sku ||
      tp?.name || tp_ep?.name ||
      tc?.title || tc_ec?.title ||
      ts?.name || ts_es?.name ||
      '—'
    )
  }
  const subOf = (item: any, tab: SubTab): string => {
    if (tab === 'products') {
      return item.sku || item.source_team_product?.sku || item.source_team_product?.source_editor_product?.sku || ''
    }
    if (tab === 'contents') {
      return (
        item.content_line?.name ?? item.source_team_content?.content_line?.name ??
        item.source_team_content?.source_editor_content?.content_line?.name ??
        item.market ?? item.source_team_content?.market ?? ''
      )
    }
    return item.type ?? item.source_team_source?.type ?? item.source_team_source?.source_editor_source?.type ?? ''
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={m => { setMonth(m); setPage(1) }} />
          <span className="text-sm text-slate-500">
            {isLoading ? '...' : `${warehouseItems.length} mục trong kho`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <button
              onClick={() => setConfirmCarry(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Copy từ {prev}
            </button>
          )}
          {canWriteCurrent && (
            <button
              onClick={() => setShowPickModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm vào kho
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setSubTab(t.key); setPage(1) }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
              subTab === t.key ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800 hover:bg-gray-100',
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className={cn('ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold', subTab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-slate-500')}>
              {subTab === t.key ? warehouseItems.length
                : t.key === 'products' ? (warehouse?.products.length ?? 0)
                : t.key === 'contents' ? (warehouse?.contents.length ?? 0)
                : (warehouse?.sources.length ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
        ) : warehouseItems.length === 0 ? (
          <EmptyState
            icon={subTab === 'products' ? Package : subTab === 'contents' ? FileText : Radio}
            title={`Kho ${month} chưa có ${SUB_TABS.find(t => t.key === subTab)?.label}`}
            description='Nhấn "Thêm vào kho" hoặc "Copy từ tháng trước" để bắt đầu'
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {subTab === 'products' ? 'Tên sản phẩm' : subTab === 'contents' ? 'Tiêu đề' : 'Tên source'}
                </th>
                {subTab === 'products' && <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>}
                {subTab === 'contents' && <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Loại content</th>}
                {subTab === 'sources'  && <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Loại</th>}
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagedItems.map(item => {
                const itemCode = subTab === 'contents'
                  ? ((item as any).code || (item as any).source_team_content?.code || (item as any).source_team_content?.source_editor_content?.code || '')
                  : ''
                return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {labelOf(item)}
                    {itemCode && <span className="ml-2 text-xs font-mono font-normal text-slate-400">{itemCode}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{subOf(item, subTab)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {canWriteCurrent && (
                      <button
                        onClick={() => removeMut.mutate(item.id)}
                        disabled={removeMut.isPending}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Xoá khỏi kho tháng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-slate-500">
              Trang <span className="font-semibold text-slate-700">{safePage}</span> / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7
                  ? i + 1
                  : safePage <= 4
                    ? i + 1
                    : safePage >= totalPages - 3
                      ? totalPages - 6 + i
                      : safePage - 3 + i
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn('w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
                      pg === safePage ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 text-slate-600'
                    )}>
                    {pg}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="p-2 rounded-lg hover:bg-gray-200 text-slate-500 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pick modal */}
      <PickItemsModal
        open={showPickModal}
        onClose={() => setShowPickModal(false)}
        brandType={brandType}
        month={month}
        warehouseIds={warehouseIds}
        type={subTab}
        canCreate={isAdminOrManager}
        onAdded={() => qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'global', month] })}
        onRequestCreate={() => setCreateWhat(subTab === 'products' ? 'product' : subTab === 'contents' ? 'content' : 'source')}
      />

      {/* Create modals */}
      <ProductFormModal
        open={createWhat === 'product'}
        defaultBrandType={brandType}
        onClose={() => setCreateWhat(null)}
        onSuccess={addProductToWarehouse}
      />

      <ContentFormModal
        open={createWhat === 'content'}
        brandType={brandType}
        onClose={() => setCreateWhat(null)}
        onSuccess={addContentToWarehouse}
      />

      <SourceCreateModal
        open={createWhat === 'source'}
        onClose={() => setCreateWhat(null)}
        brandType={brandType}
        month={month}
      />

      <ConfirmDialog
        open={confirmCarry}
        title={`Copy kho ${prev} → ${month}?`}
        message={`Tất cả items trong kho ${prev} sẽ được copy sang kho ${month}. Items đã có trong kho ${month} sẽ không bị ảnh hưởng.`}
        confirmLabel="Copy"
        onConfirm={() => carryMut.mutate()}
        onCancel={() => setConfirmCarry(false)}
        isLoading={carryMut.isPending}
      />
    </div>
  )
}
