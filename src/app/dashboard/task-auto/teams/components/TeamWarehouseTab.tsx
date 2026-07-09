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
import { Pagination, PAGE_SIZE } from '@/components/task-auto/Pagination'
import { ContentFormModal } from '@/components/task-auto/ContentFormModal'
import { TeamProductFormModal } from './products/TeamProductFormModal'
import {
  getTeams,
  getTeamWarehouse, addTeamWarehouse, removeTeamWarehouse, pushTeamToMonth,
  getTeamProducts, getTeamContents, getTeamSources,
  addTeamContent, addTeamSource,
  type WarehouseCatalogType,
} from '@/lib/api/task-auto'
import type { BrandType, Content, TeamProduct } from '@/types/task-auto'
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
  open, onClose, teamId, month, warehouseIds, subTab, onAdded, onRequestCreate,
}: {
  open: boolean
  onClose: () => void
  teamId: string
  month: string
  warehouseIds: Set<string>
  subTab: SubTab
  onAdded: () => void
  onRequestCreate: () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: teamProducts } = useQuery({
    queryKey: ['task-auto', 'team-products', teamId],
    queryFn: () => getTeamProducts(teamId),
    enabled: open && subTab === 'products' && !!teamId,
  })
  const { data: teamContents } = useQuery({
    queryKey: ['task-auto', 'team-contents', teamId],
    queryFn: () => getTeamContents(teamId),
    enabled: open && subTab === 'contents' && !!teamId,
  })
  const { data: teamSources } = useQuery({
    queryKey: ['task-auto', 'team-sources', teamId],
    queryFn: () => getTeamSources(teamId),
    enabled: open && subTab === 'sources' && !!teamId,
  })

  const allItems = useMemo(() => {
    if (subTab === 'products') return teamProducts ?? []
    if (subTab === 'contents') return teamContents ?? []
    return teamSources ?? []
  }, [subTab, teamProducts, teamContents, teamSources])

  const filtered = useMemo(() => {
    const notIn = (allItems as any[]).filter(item => !warehouseIds.has(item.id))
    if (!search.trim()) return notIn
    const q = search.toLowerCase()
    return notIn.filter((item: any) => {
      const name = item.name ?? item.title ?? ''
      return name.toLowerCase().includes(q) || (item.sku ?? '').toLowerCase().includes(q)
    })
  }, [allItems, warehouseIds, search])

  const addMut = useMutation({
    mutationFn: () => addTeamWarehouse(teamId, subTab as WarehouseCatalogType, month, [...selected]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'team', teamId, month] })
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-800">Thêm vào kho team {month}</h2>
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
              {item.sku && <span className="text-xs text-slate-400">{item.sku}</span>}
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

// ── Source create modal ───────────────────────────────────────────────────────

function SourceCreateModal({
  open, onClose, teamId, brandType, month,
}: {
  open: boolean
  onClose: () => void
  teamId: string
  brandType: BrandType
  month: string
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', type: 'PRODUCT_STOCK', link: '' })

  const mut = useMutation({
    mutationFn: async () => {
      const src = await addTeamSource(teamId, { name: form.name.trim(), brand_type: brandType, type: form.type, link: form.link.trim() || undefined })
      await addTeamWarehouse(teamId, 'sources', month, [src.id])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'team', teamId, month] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-sources', teamId] })
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

// ── Main TeamWarehouseTab ─────────────────────────────────────────────────────

interface TeamWarehouseTabProps {
  isAdminOrManager: boolean
  userId?: string
  brandType: BrandType
  selectedTeamId: string
  setSelectedTeamId: (id: string) => void
}

export function TeamWarehouseTab({
  isAdminOrManager,
  userId,
  brandType,
  selectedTeamId,
  setSelectedTeamId,
}: TeamWarehouseTabProps) {
  const qc = useQueryClient()
  const [month, setMonth] = useState(currentMonth())
  const [subTab, setSubTab] = useState<SubTab>('products')
  const [page, setPage] = useState(1)
  const [showPickModal, setShowPickModal] = useState(false)
  const [createWhat, setCreateWhat] = useState<'product' | 'content' | 'source' | null>(null)
  const [confirmPush, setConfirmPush] = useState(false)

  const prev = prevMonth(month)

  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })

  const teamOptions = useMemo(
    () =>
      (teams ?? [])
        .filter(t => isAdminOrManager || t.leader_id === userId || t.members?.some((m: any) => m.user_id === userId))
        .map(t => ({ label: t.name, value: t.id })),
    [teams, isAdminOrManager, userId],
  )

  // Derive team market từ selected team
  const teamMarket = useMemo(
    () => (teams ?? []).find(t => t.id === selectedTeamId)?.market ?? 'VIETNAM',
    [teams, selectedTeamId],
  )

  const { data: warehouse, isLoading } = useQuery({
    queryKey: ['task-auto', 'warehouse', 'team', selectedTeamId, month],
    queryFn: () => getTeamWarehouse(selectedTeamId, month),
    enabled: !!selectedTeamId,
  })

  const warehouseItems = useMemo(() => {
    if (!warehouse) return []
    if (subTab === 'products') return warehouse.products
    if (subTab === 'contents') return warehouse.contents
    return warehouse.sources
  }, [warehouse, subTab])

  const warehouseIds = useMemo(() => new Set(warehouseItems.map((i: any) => i.id)), [warehouseItems])

  useEffect(() => { setPage(1) }, [selectedTeamId, month, subTab])
  const paginatedItems = warehouseItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const removeMut = useMutation({
    mutationFn: (id: string) => removeTeamWarehouse(selectedTeamId, subTab as WarehouseCatalogType, month, [id]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'team', selectedTeamId, month] })
      toast.success('Đã xoá khỏi kho tháng')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi xoá'),
  })

  const pushMut = useMutation({
    mutationFn: () => pushTeamToMonth(selectedTeamId, prev, month),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'team', selectedTeamId, month] })
      toast.success(`Đã copy kho ${prev} → ${month}`)
      setConfirmPush(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi copy kho'),
  })

  const addProductToWarehouse = async (teamProduct?: TeamProduct) => {
    if (!teamProduct) { setCreateWhat(null); return }
    try {
      await addTeamWarehouse(selectedTeamId, 'products', month, [teamProduct.id])
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'team', selectedTeamId, month] })
      toast.success(`Đã tạo sản phẩm và thêm vào kho ${month}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Sản phẩm đã tạo nhưng không thể thêm vào kho')
    }
    setCreateWhat(null)
  }

  const addContentToWarehouse = async (content: Content) => {
    try {
      const teamContent = await addTeamContent(selectedTeamId, {
        brand_type: content.brand_type,
        market: content.market,
        title: content.title,
        body: content.body,
        script: content.script,
        file_content_url: content.file_content_url,
        voice_url: content.voice_url,
        content_line_id: content.content_line_id,
      })
      await addTeamWarehouse(selectedTeamId, 'contents', month, [teamContent.id])
      qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'team', selectedTeamId, month] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents', selectedTeamId] })
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
      {/* Team selector + toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-56">
            <CustomSelect value={selectedTeamId} onChange={setSelectedTeamId} options={teamOptions} />
          </div>
          <MonthPicker value={month} onChange={setMonth} />
          <span className="text-sm text-slate-500">
            {isLoading ? '...' : `${warehouseItems.length} mục trong kho`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmPush(true)}
            disabled={!selectedTeamId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-slate-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Copy từ {prev}
          </button>
          <button
            onClick={() => setShowPickModal(true)}
            disabled={!selectedTeamId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
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
        {!selectedTeamId ? (
          <EmptyState icon={Package} title="Chọn team để xem kho tháng" description="" />
        ) : isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
        ) : warehouseItems.length === 0 ? (
          <EmptyState
            icon={subTab === 'products' ? Package : subTab === 'contents' ? FileText : Radio}
            title={`Kho team ${month} chưa có ${SUB_TABS.find(t => t.key === subTab)?.label}`}
            description='Nhấn "Thêm vào kho" hoặc "Copy từ tháng trước" để bắt đầu'
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {subTab === 'products' ? 'Tên sản phẩm' : subTab === 'contents' ? 'Tiêu đề' : 'Tên source'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {subTab === 'products' ? 'SKU' : subTab === 'contents' ? 'Loại content' : 'Loại'}
                  </th>
                  <th className="px-5 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{labelOf(item)}</td>
                    <td className="px-5 py-3.5 text-slate-500">{subOf(item)}</td>
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
            <Pagination page={page} totalItems={warehouseItems.length} onPageChange={setPage} />
          </>
        )}
      </div>

      <PickItemsModal
        open={showPickModal}
        onClose={() => setShowPickModal(false)}
        teamId={selectedTeamId}
        month={month}
        warehouseIds={warehouseIds}
        subTab={subTab}
        onAdded={() => qc.invalidateQueries({ queryKey: ['task-auto', 'warehouse', 'team', selectedTeamId, month] })}
        onRequestCreate={() => setCreateWhat(subTab === 'products' ? 'product' : subTab === 'contents' ? 'content' : 'source')}
      />

      {/* Create modals */}
      <TeamProductFormModal
        open={createWhat === 'product'}
        teamId={selectedTeamId}
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
        teamId={selectedTeamId}
        brandType={brandType}
        month={month}
      />

      <ConfirmDialog
        open={confirmPush}
        title={`Copy kho team ${prev} → ${month}?`}
        message={`Toàn bộ items trong kho team tháng ${prev} sẽ được copy sang tháng ${month}. Items đã có sẽ không bị trùng.`}
        confirmLabel="Copy"
        onConfirm={() => pushMut.mutate()}
        onCancel={() => setConfirmPush(false)}
        isLoading={pushMut.isPending}
      />
    </div>
  )
}
