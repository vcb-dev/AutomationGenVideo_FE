'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Package, FileText, Radio, Trash2, Plus, Loader2,
  Search, RefreshCw,
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
  getEditorWarehouse, addEditorWarehouse, addEditorWarehouseProducts, updateEditorProductWarehouseQuantity,
  removeEditorWarehouse, pushEditorToMonth,
  getEditorProducts, getEditorContents, getEditorSources,
  createEditorSource,
  type WarehouseCatalogType,
} from '@/lib/api/task-auto'
import type { BrandType, Content, Product } from '@/types/task-auto'
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

// ── Pick modal ────────────────────────────────────────────────────────────────

function PickItemsModal({
  open, onClose, userId, month, warehouseIds, subTab, onAdded, onRequestCreate,
}: {
  open: boolean
  onClose: () => void
  userId: string
  month: string
  warehouseIds: Set<string>
  subTab: SubTab
  onAdded: () => void
  onRequestCreate: () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const { data: editorProductsData } = useQuery({
    queryKey: ['task-auto', 'editor-products', userId],
    queryFn: () => getEditorProducts(userId, {}),
    enabled: open && subTab === 'products',
  })
  const { data: editorContentsData } = useQuery({
    queryKey: ['task-auto', 'editor-contents', userId],
    queryFn: () => getEditorContents(userId, {}),
    enabled: open && subTab === 'contents',
  })
  const { data: editorSourcesData } = useQuery({
    queryKey: ['task-auto', 'editor-sources', userId],
    queryFn: () => getEditorSources(userId, {}),
    enabled: open && subTab === 'sources',
  })

  const allItems = useMemo(() => {
    if (subTab === 'products') return editorProductsData?.data ?? []
    if (subTab === 'contents') return editorContentsData?.data ?? []
    return editorSourcesData?.data ?? []
  }, [subTab, editorProductsData, editorContentsData, editorSourcesData])

  const filtered = useMemo(() => {
    const notIn = (allItems as any[]).filter(item => !warehouseIds.has(item.id))
    if (!search.trim()) return notIn
    const q = search.toLowerCase()
    return notIn.filter((item: any) => {
      const name = item.name ?? item.title ?? ''
      const code = item.sku ?? item.code ?? ''
      return name.toLowerCase().includes(q) || code.toLowerCase().includes(q)
    })
  }, [allItems, warehouseIds, search])

  const addMut = useMutation({
    mutationFn: () =>
      subTab === 'products'
        ? addEditorWarehouseProducts(userId, month, [...selected].map(id => ({ id, target_quantity: quantities[id] ?? 1 })))
        : addEditorWarehouse(userId, subTab as WarehouseCatalogType, month, [...selected]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'editor', userId, month] })
      toast.success(`Đã thêm ${selected.size} mục vào kho ${month}`)
      setSelected(new Set())
      setQuantities({})
      onAdded()
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi thêm vào kho'),
  })

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (!open) return null

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
          {(filtered as any[]).map((item: any) => (
            <label key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
              <span className="text-sm text-slate-700 flex-1">{item.name ?? item.title ?? item.sku ?? item.id}</span>
              {(item.sku || item.code) && <span className="text-xs text-slate-400">{item.sku || item.code}</span>}
              {subTab === 'products' && selected.has(item.id) && (
                <span className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-slate-400">SL video</span>
                  <input
                    type="number"
                    min={1}
                    value={quantities[item.id] ?? 1}
                    onChange={e => setQuantities(q => ({ ...q, [item.id]: Math.max(1, Number(e.target.value) || 1) }))}
                    className="w-14 text-right text-sm font-semibold text-slate-800 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => { onClose(); onRequestCreate() }}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo mới
          </button>
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

// ── Product quantity cell (target_quantity — số video cần cho SP trong tháng) ──

function ProductQuantityCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  return (
    <input
      type="number"
      min={1}
      value={draft}
      onChange={e => setDraft(Math.max(1, Number(e.target.value) || 1))}
      onBlur={() => { if (draft !== value) onSave(draft) }}
      className="w-16 text-right text-sm font-semibold text-slate-800 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-400 focus:bg-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  )
}

// ── Source create modal ───────────────────────────────────────────────────────

function SourceCreateModal({
  open, onClose, userId, brandType, month,
}: {
  open: boolean
  onClose: () => void
  userId: string
  brandType: BrandType
  month: string
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', type: 'PRODUCT_STOCK', link: '' })

  const mut = useMutation({
    mutationFn: async () => {
      const src = await createEditorSource(userId, { name: form.name.trim(), brand_type: brandType, type: form.type as any, link: form.link.trim() || undefined })
      await addEditorWarehouse(userId, 'sources', month, [src.id])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'editor', userId, month] })
      toast.success(`Đã tạo source và thêm vào kho ${month}`)
      setForm({ name: '', type: 'PRODUCT_STOCK', link: '' })
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
            disabled={!form.name.trim() || !form.type || mut.isPending}
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
        <DarkInput label="Link" placeholder="https://..." value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
      </div>
    </DarkModal>
  )
}

// ── Main MyWarehouseTab ───────────────────────────────────────────────────────

export function MyWarehouseTab({
  userId,
  brandType,
  teamMarket,
}: {
  userId: string
  brandType: BrandType
  teamMarket?: string
}) {
  const qc = useQueryClient()
  const [month, setMonth] = useState(currentMonth())
  const [subTab, setSubTab] = useState<SubTab>('products')
  const [showPickModal, setShowPickModal] = useState(false)
  const [createWhat, setCreateWhat] = useState<'product' | 'content' | 'source' | null>(null)
  const [confirmPush, setConfirmPush] = useState(false)

  const prev = prevMonth(month)

  const { data: warehouse, isLoading } = useQuery({
    queryKey: ['task-auto', 'warehouse', 'editor', userId, month],
    queryFn: () => getEditorWarehouse(userId, month),
  })

  const warehouseItems = useMemo(() => {
    if (!warehouse) return []
    if (subTab === 'products') return warehouse.products
    if (subTab === 'contents') return warehouse.contents
    return warehouse.sources
  }, [warehouse, subTab])

  const warehouseIds = useMemo(() => new Set(warehouseItems.map((i: any) => i.id)), [warehouseItems])

  const removeMut = useMutation({
    mutationFn: (id: string) => removeEditorWarehouse(userId, subTab as WarehouseCatalogType, month, [id]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'editor', userId, month] })
      toast.success('Đã xoá khỏi kho tháng')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi xoá'),
  })

  const pushMut = useMutation({
    mutationFn: () => pushEditorToMonth(userId, prev, month),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'editor', userId, month] })
      toast.success(`Đã copy kho ${prev} → ${month}`)
      setConfirmPush(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi copy kho'),
  })

  const updateQuantityMut = useMutation({
    mutationFn: (item: { id: string; target_quantity: number }) =>
      updateEditorProductWarehouseQuantity(userId, month, [item]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'editor', userId, month] })
      toast.success('Đã cập nhật số lượng video')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi cập nhật số lượng'),
  })

  const addProductToWarehouse = async (product: Product) => {
    try {
      await addEditorWarehouse(userId, 'products', month, [product.id])
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'editor', userId, month] })
      toast.success(`Đã tạo sản phẩm và thêm vào kho ${month}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Sản phẩm đã tạo nhưng không thể thêm vào kho')
    }
    setCreateWhat(null)
  }

  const addContentToWarehouse = async (content: Content) => {
    try {
      await addEditorWarehouse(userId, 'contents', month, [content.id])
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'editor', userId, month] })
      toast.success(`Đã tạo content và thêm vào kho ${month}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Content đã tạo nhưng không thể thêm vào kho')
    }
    setCreateWhat(null)
  }

  const labelOf = (item: any): string => item.name ?? item.title ?? item.sku ?? '—'
  const subOf = (item: any): string => {
    if (subTab === 'products') return item.sku ?? ''
    if (subTab === 'contents') return item.content_line?.name ?? item.market ?? ''
    return item.type ?? ''
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <span className="text-sm text-slate-500">
            {isLoading ? '...' : `${warehouseItems.length} mục trong kho`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmPush(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Copy từ {prev}
          </button>
          <button
            onClick={() => setShowPickModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm vào kho
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
              subTab === t.key ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800 hover:bg-gray-100',
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className={cn('ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold', subTab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-slate-500')}>
              {t.key === 'products' ? (warehouse?.products.length ?? 0)
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
            title={`Kho cá nhân ${month} chưa có ${SUB_TABS.find(t => t.key === subTab)?.label}`}
            description='Nhấn "Thêm vào kho" hoặc "Copy từ tháng trước" để bắt đầu'
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {subTab === 'products' ? 'Tên sản phẩm' : subTab === 'contents' ? 'Tiêu đề' : 'Tên source'}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {subTab === 'products' ? 'SKU' : subTab === 'contents' ? 'Loại content' : 'Loại'}
                </th>
                {subTab === 'products' && (
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">SL video</th>
                )}
                <th className="px-5 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {warehouseItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {labelOf(item)}
                    {subTab === 'contents' && item.code && (
                      <span className="ml-2 text-xs font-mono font-normal text-slate-400">{item.code}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{subOf(item)}</td>
                  {subTab === 'products' && (
                    <td className="px-5 py-3.5 text-right">
                      <ProductQuantityCell
                        value={item.warehouses?.[0]?.target_quantity ?? 1}
                        onSave={v => updateQuantityMut.mutate({ id: item.id, target_quantity: v })}
                      />
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => removeMut.mutate(item.id)}
                      disabled={removeMut.isPending}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PickItemsModal
        open={showPickModal}
        onClose={() => setShowPickModal(false)}
        userId={userId}
        month={month}
        warehouseIds={warehouseIds}
        subTab={subTab}
        onAdded={() => qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'editor', userId, month] })}
        onRequestCreate={() => setCreateWhat(subTab === 'products' ? 'product' : subTab === 'contents' ? 'content' : 'source')}
      />

      {/* Create modals */}
      <ProductFormModal
        open={createWhat === 'product'}
        userId={userId}
        defaultBrandType={brandType}
        onClose={() => setCreateWhat(null)}
        onSuccess={addProductToWarehouse}
      />

      <ContentFormModal
        open={createWhat === 'content'}
        userId={userId}
        brandType={brandType}
        initialMarket={teamMarket}
        onClose={() => setCreateWhat(null)}
        onSuccess={addContentToWarehouse}
      />

      <SourceCreateModal
        open={createWhat === 'source'}
        onClose={() => setCreateWhat(null)}
        userId={userId}
        brandType={brandType}
        month={month}
      />

      <ConfirmDialog
        open={confirmPush}
        title={`Copy kho ${prev} → ${month}?`}
        message={`Toàn bộ items trong kho cá nhân tháng ${prev} sẽ được copy sang tháng ${month}. Items đã có sẽ không bị trùng.`}
        confirmLabel="Copy"
        onConfirm={() => pushMut.mutate()}
        onCancel={() => setConfirmPush(false)}
        isLoading={pushMut.isPending}
      />
    </div>
  )
}
