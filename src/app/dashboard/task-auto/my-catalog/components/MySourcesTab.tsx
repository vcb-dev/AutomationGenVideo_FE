'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Loader2, Radio, Search, Download,
  ExternalLink, ChevronLeft, ChevronRight, SendHorizontal, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, CustomSelect, ProductSearchSelect } from '@/components/task-auto/DarkInput'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import {
  getSources,
  getEditorSources, createEditorSource, updateEditorSource, deleteEditorSource, pushEditorSourceToTeam,
  getEditorProducts,
  getProducts, getTeams, getTeamSources,
} from '@/lib/api/task-auto'
import { Source, TeamSource, SOURCE_TYPE_LABELS, SourceType } from '@/types/task-auto'
import { SOURCE_TYPE_COLORS } from '../../catalog/components/ProductsTab/product-utils'
import { SourceViewModal } from '@/components/task-auto/SourceViewModal'

const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[]

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>{Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
        ))}</tr>
      ))}
    </>
  )
}

// ── Push to team modal ────────────────────────────────────────────────────────

function PushModal({ source, userId, onClose }: { source: Source; userId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const myTeam = teams?.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))
  const push = useMutation({
    mutationFn: () => pushEditorSourceToTeam(userId, source.id, myTeam!.id),
    onSuccess: () => {
      toast.success('Đã đẩy sang kho team')
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-sources'] })
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể đẩy sang team'),
  })
  return (
    <DarkModal open onClose={onClose} title="Đẩy sang kho team" size="sm"
      subtitle="Source sẽ được gán vào team và không còn là source cá nhân"
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
          Source <strong className="text-slate-800">{source.name}</strong> sẽ được chuyển sang kho team.
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

// ── Import from catalog modal ─────────────────────────────────────────────────

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
  const [typeFilter, setTypeFilter] = useState<SourceType | ''>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  const myTeam = teams?.find(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId))

  const { data: mySources, isLoading: loadingMySources } = useQuery({
    queryKey: ['task-auto', 'my-sources-links', userId],
    queryFn: () => getEditorSources(userId, { limit: 500 }),
  })
  const myLinkSet = new Set(mySources?.data?.map(s => s.link?.trim().toLowerCase()).filter(Boolean) ?? [])

  const { data: globalData, isLoading: loadingGlobal } = useQuery({
    queryKey: ['task-auto', 'import-sources-global', brandType, typeFilter, search],
    queryFn: () => getSources({
      brand_type: brandType,
      type: typeFilter || undefined,
      search: search || undefined,
      limit: 50,
    }),
    enabled: scope === 'global',
  })

  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ['task-auto', 'import-sources-team', myTeam?.id, brandType, typeFilter, search],
    queryFn: () => getTeamSources(myTeam!.id, {
      brand_type: brandType,
      type: typeFilter || undefined,
      search: search || undefined,
    }),
    enabled: scope === 'team' && !!myTeam,
  })

  const isLoading = scope === 'global' ? loadingGlobal : loadingTeam

  const rawList: (Source | TeamSource)[] = scope === 'global'
    ? (globalData?.data ?? [])
    : (teamData ?? [])

  const available = rawList.filter(
    s => !myLinkSet.has(s.link?.trim().toLowerCase() ?? '')
  )

  const toggleId = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () =>
    setSelectedIds(selectedIds.size === available.length ? new Set() : new Set(available.map(s => s.id)))
  const allSelected = available.length > 0 && selectedIds.size === available.length

  const copyMut = useMutation({
    mutationFn: async () => {
      const selected = available.filter(s => selectedIds.has(s.id))
      const results = await Promise.allSettled(
        selected.map(s => createEditorSource(userId, {
          source_source_id: s.id,
          brand_type: brandType,
          type: s.type,
          name: s.name,
          link: s.link,
          code: s.code ?? undefined,
          product_id: s.product_id ?? undefined,
          is_active: true,
        } as any))
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} source thêm thất bại`)
    },
    onSuccess: () => {
      toast.success(`Đã thêm ${selectedIds.size} source vào kho cá nhân`)
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-sources'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-sources-links'] })
      onImported()
    },
    onError: (e: any) => toast.error(e?.message || 'Không thể thêm source'),
  })

  return (
    <DarkModal
      open
      onClose={onClose}
      title="Lấy từ kho danh mục"
      subtitle="Chọn nhiều source để thêm vào kho cá nhân"
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
            {selectedIds.size > 0 ? `Thêm ${selectedIds.size} source` : 'Thêm vào kho'}
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

        {/* Search + type filter + select all */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedIds(new Set()) }}
              placeholder="Tìm tên, code source..."
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <CustomSelect
            value={typeFilter}
            onChange={v => { setTypeFilter(v as SourceType | ''); setSelectedIds(new Set()) }}
            options={[{ value: '', label: 'Tất cả loại' }, ...SOURCE_TYPES.map(t => ({ value: t, label: SOURCE_TYPE_LABELS[t] }))]}
            className="min-w-[150px]"
          />
          {available.length > 0 && (
            <button onClick={toggleAll} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap">
              {allSelected ? 'Bỏ chọn' : `Chọn tất cả (${available.length})`}
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto space-y-1">
          {(isLoading || loadingMySources) && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>}
          {!isLoading && !loadingMySources && available.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 italic">
              {search ? 'Không tìm thấy source phù hợp' : 'Tất cả source đã có trong kho cá nhân'}
            </p>
          )}
          {!isLoading && !loadingMySources && available.map(s => {
            const selected = selectedIds.has(s.id)
            return (
              <button
                key={s.id}
                onClick={() => toggleId(s.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                  selected ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-gray-50 border border-transparent'
                )}
              >
                <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                  selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white')}>
                  {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.type && (
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold', SOURCE_TYPE_COLORS[s.type])}>
                        {SOURCE_TYPE_LABELS[s.type]}
                      </span>
                    )}
                    {s.code && <span className="font-mono text-xs text-slate-400">{s.code}</span>}
                    {(s.editor_product?.name ?? s.product?.name) && <span className="text-xs text-slate-400 truncate">· {s.editor_product?.name ?? s.product?.name}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </DarkModal>
  )
}

// ── Source form modal ─────────────────────────────────────────────────────────

function SourceFormModal({
  editing,
  userId,
  defaultBrandType = 'DO_DA',
  onClose,
  onSuccess,
}: {
  editing?: Source | null
  userId: string
  defaultBrandType?: 'DO_DA' | 'TRANG_SUC'
  onClose: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const brandType: 'DO_DA' | 'TRANG_SUC' = (editing?.brand_type as 'DO_DA' | 'TRANG_SUC') ?? defaultBrandType ?? 'TRANG_SUC'
  const [form, setForm] = useState<Partial<Source> & { editor_product_id?: string }>({
    type: editing?.type ?? 'PRODUCT_STOCK',
    name: editing?.name ?? '',
    link: editing?.link ?? '',
    nas_link: editing?.nas_link ?? '',
    code: editing?.code ?? '',
    editor_product_id: editing?.editor_product_id ?? '',
    is_active: editing?.is_active ?? true,
  })

  const { data: productsData } = useQuery({
    queryKey: ['task-auto', 'editor-products-select', userId],
    queryFn: () => getEditorProducts(userId, { limit: 200 }),
  })

  const createMut = useMutation({
    mutationFn: () => createEditorSource(userId, { type: form.type!, name: form.name!, link: form.link!, nas_link: form.nas_link || null, code: form.code || null, editor_product_id: form.editor_product_id || null, is_active: form.is_active, brand_type: brandType } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-sources'] })
      toast.success('Đã thêm source')
      onSuccess()
    },
    onError: () => toast.error('Không thể thêm source'),
  })

  const updateMut = useMutation({
    mutationFn: () => updateEditorSource(userId, editing!.id, { name: form.name, link: form.link, nas_link: form.nas_link || null, code: form.code || null, editor_product_id: form.editor_product_id || null, is_active: form.is_active } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'my-sources'] })
      toast.success('Đã cập nhật source')
      onSuccess()
    },
    onError: () => toast.error('Không thể cập nhật source'),
  })

  const saving = createMut.isPending || updateMut.isPending

  const handleSubmit = () => {
    if (!form.name?.trim() || !form.link?.trim()) return toast.error('Tên và link là bắt buộc')
    isEdit ? updateMut.mutate() : createMut.mutate()
  }

  return (
    <DarkModal
      open
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa source' : 'Thêm source vào kho cá nhân'}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">Hủy</button>
          <button onClick={handleSubmit} disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Thông tin source */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Thông tin source
          </p>
          <CustomSelect
            label="Loại source *"
            value={form.type ?? 'PRODUCT_STOCK'}
            onChange={v => setForm(f => ({ ...f, type: v as SourceType }))}
            options={SOURCE_TYPES.map(t => ({ value: t, label: SOURCE_TYPE_LABELS[t] }))}
          />
          <DarkInput
            label="Mã code"
            placeholder="VD: SRC001"
            value={form.code ?? ''}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
          />
          <DarkInput
            label="Tên source *"
            placeholder="Nhập tên nguồn tài liệu..."
            value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <DarkInput
            label="Link *"
            placeholder="https://..."
            value={form.link ?? ''}
            onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
          />
          <DarkInput
            label="Link ổ NAS"
            placeholder="\\nas\... hoặc smb://... (tuỳ chọn)"
            value={form.nas_link ?? ''}
            onChange={e => setForm(f => ({ ...f, nas_link: e.target.value }))}
          />
        </div>

        {/* Liên kết sản phẩm */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Liên kết sản phẩm <span className="text-gray-300 font-normal normal-case tracking-normal">(tuỳ chọn)</span>
          </p>
          <ProductSearchSelect
            value={form.editor_product_id ?? ''}
            onChange={v => setForm(f => ({ ...f, editor_product_id: v }))}
            products={productsData?.data ?? []}
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
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
            <p className="text-sm font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
          </div>
        </div>
      </div>
    </DarkModal>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface Props { userId: string; brandType: 'DO_DA' | 'TRANG_SUC' }

export function MySourcesTab({ userId, brandType }: Props) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<SourceType | ''>('')
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Source | null>(null)
  const [pushItem, setPushItem] = useState<Source | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewSource, setViewSource] = useState<Source | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'my-sources', userId, brandType, search, typeFilter, month, page],
    queryFn: () => getEditorSources(userId, {
      brand_type: brandType,
      search: search || undefined,
      type: typeFilter || undefined,
      month: month || undefined,
      page, limit: 20,
    }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEditorSource(userId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'my-sources'] }); toast.success('Đã xóa source'); setDeletingId(null) },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Không thể xóa source'); setDeletingId(null) },
  })

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit = (s: Source) => { setEditing(s); setShowModal(true) }

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
              placeholder="Tìm tên, code source..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <CustomSelect
            value={typeFilter}
            onChange={v => { setTypeFilter(v as SourceType | ''); setPage(1) }}
            options={[{ value: '', label: 'Tất cả loại' }, ...SOURCE_TYPES.map(t => ({ value: t, label: SOURCE_TYPE_LABELS[t] }))]}
            className="min-w-[180px]"
          />
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
            onClick={openCreate}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3.5 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" /> Thêm source
          </button>
        </div>
      </div>

      {data && data.total > 0 && (
        <p className="text-sm text-slate-500 px-1">
          <span className="font-bold text-slate-700">{data.total}</span> source cá nhân
        </p>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-gray-200">
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Tên source</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Loại</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Code</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Sản phẩm</th>
                {/* <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Người thêm</th> */}
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Ngày thêm</th>
                <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide whitespace-nowrap">Trạng thái</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <LoadingRows cols={8} />}
              {!isLoading && !data?.data?.length && (
                <tr><td colSpan={8}><EmptyState icon={Radio} title="Chưa có source cá nhân nào" /></td></tr>
              )}
              {data?.data.map(s => (
                <tr key={s.id} onClick={() => setViewSource(s)} className="hover:bg-indigo-50/20 transition-colors group cursor-pointer">
                  <td className="px-5 py-4">
                    <a href={s.link} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 group/link"
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-base font-semibold text-slate-800 truncate max-w-[200px] group-hover/link:text-indigo-600 transition-colors">{s.name}</p>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-indigo-500 shrink-0" />
                    </a>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold', SOURCE_TYPE_COLORS[s.type])}>
                      {SOURCE_TYPE_LABELS[s.type]}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {s.code
                      ? <span className="inline-block bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">{s.code}</span>
                      : <span className="text-slate-300 text-sm">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-slate-600 truncate block max-w-[160px]">
                      {(s.editor_product?.name ?? s.product?.name) ?? <span className="text-slate-300">—</span>}
                    </span>
                  </td>
                  {/* <td className="px-5 py-4 whitespace-nowrap">
                    {s.added_by ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {s.added_by.full_name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate max-w-[110px]" title={s.added_by.full_name}>{s.added_by.full_name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td> */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-500">
                      {(s as any).added_at ? new Date((s as any).added_at).toLocaleDateString('vi-VN') : <span className="text-slate-300">—</span>}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                      s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400',
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', s.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                      {s.is_active ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPushItem(s)}
                        title="Đẩy sang kho team"
                        className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <SendHorizontal className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(s.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {showModal && (
        <SourceFormModal
          editing={editing}
          userId={userId}
          defaultBrandType={brandType}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
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

      {pushItem && <PushModal source={pushItem} userId={userId} onClose={() => setPushItem(null)} />}

      {viewSource && (
        <SourceViewModal
          open
          item={viewSource as any}
          catalogType="editor"
          canEdit
          canDelete
          onClose={() => setViewSource(null)}
          onEdit={() => { openEdit(viewSource); setViewSource(null) }}
          onDelete={() => { setDeletingId(viewSource.id); setViewSource(null) }}
        />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa source"
        message="Source sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xóa source"
        danger
        isLoading={deleteMut.isPending}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
