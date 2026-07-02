'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Radio, Plus, Search, ExternalLink, Trash2, Edit2,
  Loader2, Globe, ListFilter, PenLine, Check, X, ArrowUpToLine, Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect, DarkInput, ProductSearchSelect } from '@/components/task-auto/DarkInput'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import {
  getTeamSources, addTeamSource, updateTeamSource, removeTeamSource,
  pushTeamSourceToGlobal, getSources, getTeams, getTeamProducts,
} from '@/lib/api/task-auto'
import { TeamSource, Source, SOURCE_TYPE_LABELS, SourceType } from '@/types/task-auto'
import { SourceViewModal } from '@/components/task-auto/SourceViewModal'

const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  PRODUCT_STOCK: 'bg-indigo-100 text-indigo-700',
  COLLECTED:     'bg-teal-100 text-teal-700',
  OUTRO:         'bg-purple-100 text-purple-700',
  WORKSHOP:      'bg-orange-100 text-orange-700',
  HUYK:          'bg-rose-100 text-rose-700',
}

interface TeamSourcesTabProps {
  isAdminOrManager: boolean
  isScaleData?: boolean
  userId?: string
  brandType: 'DO_DA' | 'TRANG_SUC'
  selectedTeamId: string
  setSelectedTeamId: (id: string) => void
  month: string
  setMonth: (month: string) => void
}

type AddMode = 'manual' | 'global'

export function TeamSourcesTab({ isAdminOrManager, isScaleData = false, userId, brandType, selectedTeamId, setSelectedTeamId, month, setMonth }: TeamSourcesTabProps) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const [modal, setModal]           = useState<null | 'add' | 'view' | 'edit'>(null)
  const [addMode, setAddMode]       = useState<AddMode>('manual')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pushingId, setPushingId]   = useState<string | null>(null)
  const [editing, setEditing]       = useState<TeamSource | null>(null)

  const [formBrandType, setFormBrandType] = useState<'DO_DA' | 'TRANG_SUC'>(brandType)

  // Sync formBrandType when team changes (brandType derived from team)
  useEffect(() => { setFormBrandType(brandType) }, [brandType])
  const [form, setForm] = useState<Partial<TeamSource>>({
    type: 'OUTRO', name: '', link: '', nas_link: '', code: '', team_product_id: '', is_active: true,
  })

  const [globalSearch, setGlobalSearch]           = useState('')
  const [selectedGlobalIds, setSelectedGlobalIds] = useState<Set<string>>(new Set())

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  const canSelectAnyTeam = isAdminOrManager || isScaleData
  const teamOptions = canSelectAnyTeam
    ? [{ value: '', label: '— Chọn team —' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]
    : (teams ?? []).map(t => ({ value: t.id, label: t.name }))

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const isLeaderOfSelected = selectedTeam?.leader_id === userId
  const isMemberOfSelected = selectedTeam?.members?.some((m: any) => m.user_id === userId) ?? false
  // Scale Data members có quyền quản lý source trong bất kỳ team nào
  const canManageSelected  = isAdminOrManager || isScaleData || isLeaderOfSelected || isMemberOfSelected
  const canPushToGlobal    = isAdminOrManager || isScaleData || isLeaderOfSelected

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['task-auto', 'team-sources', selectedTeamId, brandType, month],
    queryFn: () => getTeamSources(selectedTeamId, { brand_type: brandType, month }),
    enabled: !!selectedTeamId,
  })

  const filtered = search
    ? sources.filter(s => {
        const name = s.name ?? s.source_editor_source?.name ?? ''
        const link = s.link ?? s.source_editor_source?.link ?? ''
        return name.toLowerCase().includes(search.toLowerCase()) || link.includes(search)
      })
    : sources

  const { data: productsForSelect } = useQuery({
    queryKey: ['task-auto', 'team-products-select', selectedTeamId],
    queryFn: () => getTeamProducts(selectedTeamId),
    enabled: modal !== null && !!selectedTeamId,
  })

  const { data: globalSourcesData, isLoading: loadingGlobal } = useQuery({
    queryKey: ['task-auto', 'sources-global-pick', brandType, globalSearch],
    queryFn: () => getSources({ brand_type: brandType, search: globalSearch || undefined, is_active: true, limit: 100 }),
    enabled: modal === 'add' && addMode === 'global',
  })

  const resetAddModal = () => {
    setModal(null)
    setAddMode('manual')
    setForm({ type: 'OUTRO', name: '', link: '', nas_link: '', code: '', team_product_id: '', is_active: true })
    setGlobalSearch('')
    setSelectedGlobalIds(new Set())
    setEditing(null)
  }

  const refetchKey = ['task-auto', 'team-sources', selectedTeamId, brandType]

  const addMut = useMutation({
    mutationFn: (data: Parameters<typeof addTeamSource>[1]) => addTeamSource(selectedTeamId, data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: refetchKey })
      toast.success('Đã thêm source vào kho team')
      resetAddModal()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không thể thêm source'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<TeamSource> }) =>
      updateTeamSource(selectedTeamId, id, body),
    onSuccess: async (_, { id }) => {
      const updated = await qc.fetchQuery({ queryKey: refetchKey, queryFn: () => getTeamSources(selectedTeamId, { brand_type: brandType }) }).catch(() => null)
      const fresh = (updated as TeamSource[] | null)?.find(s => s.id === id)
      if (fresh) setEditing(fresh)
      await qc.refetchQueries({ queryKey: refetchKey })
      toast.success('Đã cập nhật source')
      setModal('view')
    },
    onError: () => toast.error('Không thể cập nhật source'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeTeamSource(selectedTeamId, id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: refetchKey })
      toast.success('Đã xóa source')
      setDeletingId(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể xóa source')
      setDeletingId(null)
    },
  })

  const pushMut = useMutation({
    mutationFn: (id: string) => pushTeamSourceToGlobal(selectedTeamId, id),
    onSuccess: async (_, id) => {
      await qc.refetchQueries({ queryKey: refetchKey })
      await qc.refetchQueries({ queryKey: ['task-auto', 'sources'] })
      toast.success('Đã đẩy source ra kho tổng')
      setPushingId(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể đẩy source')
      setPushingId(null)
    },
  })

  const openView = (s: TeamSource) => {
    setEditing(s)
    setModal('view')
  }

  const openAdd = () => {
    setForm({ type: 'OUTRO', name: '', link: '', nas_link: '', code: '', team_product_id: '', is_active: true })
    setEditing(null)
    setAddMode('manual')
    setGlobalSearch('')
    setSelectedGlobalIds(new Set())
    setModal('add')
  }

  const openEdit = (s: TeamSource) => {
    setForm({ ...s })
    setFormBrandType(s.brand_type as 'DO_DA' | 'TRANG_SUC')
    setEditing(s)
    setModal('edit')
  }

  const handleManualSubmit = () => {
    if (!form.name || !form.link) return toast.error('Tên và link là bắt buộc')
    const body = {
      brand_type: formBrandType,
      type:       form.type!,
      name:       form.name,
      link:       form.link,
      nas_link:        form.nas_link || undefined,
      code:            form.code || undefined,
      team_product_id: form.team_product_id || undefined,
      is_active:       form.is_active ?? true,
    }
    if (modal === 'add') addMut.mutate(body)
    else if (editing)   updateMut.mutate({ id: editing.id, body })
  }

  const toggleGlobalId = (id: string) =>
    setSelectedGlobalIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleGlobalPick = async () => {
    const srcList = (globalSourcesData?.data ?? []).filter(s => selectedGlobalIds.has(s.id))
    if (srcList.length === 0) return
    const results = await Promise.allSettled(
      srcList.map((src: Source) => addMut.mutateAsync({ source_source_id: src.id }))
    )
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) toast.error(`${failed} source thêm thất bại`)
    else toast.success(`Đã thêm ${srcList.length} source vào kho team`)
    await qc.refetchQueries({ queryKey: refetchKey })
    resetAddModal()
  }

  const saving = addMut.isPending || updateMut.isPending
  const existingLinks = new Set(sources.map(s => s.link))
  const availableGlobal = (globalSourcesData?.data ?? []).filter(s => !existingLinks.has(s.link))
  const allGlobalSelected = availableGlobal.length > 0 && selectedGlobalIds.size === availableGlobal.length
  const toggleAllGlobal = () =>
    setSelectedGlobalIds(allGlobalSelected ? new Set() : new Set(availableGlobal.map(s => s.id)))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          {canSelectAnyTeam ? (
            <CustomSelect
              value={selectedTeamId}
              onChange={v => { setSelectedTeamId(v); setSearch('') }}
              options={teamOptions}
              className="min-w-[200px]"
              searchable
            />
          ) : (
            <div className="text-base font-semibold text-slate-700 px-1">
              {teams?.find(t => t.id === selectedTeamId)?.name ?? 'Team của bạn'}
            </div>
          )}

          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm source..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              disabled={!selectedTeamId}
            />
          </div>

          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-3 border border-gray-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          {canManageSelected && selectedTeamId && (
            <button
              onClick={openAdd}
              className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors shrink-0"
            >
              <Plus className="w-5 h-5" /> Thêm Source
            </button>
          )}
        </div>
      </div>

      {!selectedTeamId && <EmptyState icon={Radio} title="Chọn team để xem kho source" />}

      {selectedTeamId && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Radio} title="Team chưa có source nào"
              description={canManageSelected ? 'Nhấn "Thêm Source" để thêm source vào kho của team.' : 'Chưa có source nào được thêm vào kho team.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-gray-200">
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 tracking-wide">Tên source</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 whitespace-nowrap">Loại</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 whitespace-nowrap">Code</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600">Link</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600">Sản phẩm</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 whitespace-nowrap">Người thêm</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 whitespace-nowrap">Ngày thêm</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 whitespace-nowrap">Trạng thái</th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(s => {
                    const es = s.source_editor_source
                    const sName = s.name ?? es?.name ?? '—'
                    const sLink = s.link ?? es?.link ?? null
                    const sType = s.type ?? es?.type ?? null
                    const sCode = s.code ?? es?.code ?? null
                    return (
                    <tr key={s.id} onClick={() => openView(s)}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer">
                      <td className="px-5 py-4">
                        <p className="text-base font-semibold text-slate-800 truncate max-w-[240px]" title={sName}>{sName}</p>
                        {s.source_source_id && (
                          <span className="text-xs text-slate-400 mt-0.5">· copy từ kho tổng</span>
                        )}
                        {s.source_editor_source_id && (
                          <span className="text-xs text-violet-400 mt-0.5 block">· từ kho cá nhân</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {sType ? (
                          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold', SOURCE_TYPE_COLORS[sType])}>
                            {SOURCE_TYPE_LABELS[sType]}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {sCode
                          ? <span className="bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">{sCode}</span>
                          : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-4 max-w-[200px]">
                        {sLink ? (
                          <a href={sLink} target="_blank" rel="noreferrer" title={sLink}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-400 text-sm transition-colors">
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sLink}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-700 truncate block max-w-[160px]">
                          {(s.team_product?.name ?? s.product?.name ?? es?.editor_product_id) ?? <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {s.added_by ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {s.added_by.full_name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[110px]" title={s.added_by.full_name}>{s.added_by.full_name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-500">
                          {(s as any).added_at ? new Date((s as any).added_at).toLocaleDateString('vi-VN') : <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                          s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400')}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', s.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                          {s.is_active ? 'Hoạt động' : 'Ẩn'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                        {canManageSelected && (
                          <div className="flex items-center justify-end gap-1">
                            {canPushToGlobal && (
                              <button onClick={() => setPushingId(s.id)} title="Đẩy ra kho tổng"
                                className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                                <ArrowUpToLine className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => openEdit(s)} title="Chỉnh sửa"
                              className="p-2 rounded-xl hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeletingId(s.id)} title="Xóa"
                              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )})}

                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Xóa source"
        message="Source này sẽ bị xóa khỏi kho team. Hành động không thể hoàn tác."
        confirmLabel="Xóa source"
        danger
        isLoading={deleteMut.isPending}
        onConfirm={() => deletingId && deleteMut.mutate(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmDialog
        open={!!pushingId}
        title="Đẩy source ra kho tổng"
        message={pushingId && sources.find(s => s.id === pushingId)?.source_source_id
          ? 'Source sẽ cập nhật lại source gốc trong kho tổng.'
          : 'Source sẽ được tạo mới trong kho tổng và liên kết lại.'}
        confirmLabel="Đẩy ra kho tổng"
        isLoading={pushMut.isPending}
        onConfirm={() => pushingId && pushMut.mutate(pushingId)}
        onCancel={() => setPushingId(null)}
      />

      {/* ─── Modal Chi tiết Source ─── */}
      {editing && modal === 'view' && (
        <SourceViewModal
          open
          item={editing as any}
          catalogType="team"
          canEdit={canManageSelected}
          canDelete={canManageSelected}
          canPushToGlobal={canPushToGlobal}
          onClose={() => setModal(null)}
          onEdit={() => openEdit(editing)}
          onDelete={() => setDeletingId(editing.id)}
          onPushToGlobal={() => { setModal(null); setPushingId(editing.id) }}
        />
      )}

      {/* ─── Modal Thêm Source ─── */}
      <DarkModal
        open={modal === 'add'}
        onClose={resetAddModal}
        title="Thêm Source vào kho team"
        size="lg"
        footer={
          <>
            <button onClick={resetAddModal}
              className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-3 text-base font-semibold transition-colors">
              Hủy
            </button>
            {addMode === 'manual' ? (
              <button onClick={handleManualSubmit} disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Thêm vào kho
              </button>
            ) : (
              <button onClick={handleGlobalPick} disabled={saving || selectedGlobalIds.size === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedGlobalIds.size > 0 ? <Check className="w-4 h-4" /> : null}
                {selectedGlobalIds.size > 0 ? `Thêm ${selectedGlobalIds.size} source` : 'Thêm vào kho'}
              </button>
            )}
          </>
        }
      >
        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setAddMode('manual')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              addMode === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <PenLine className="w-4 h-4" /> Nhập tay
          </button>
          <button onClick={() => setAddMode('global')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              addMode === 'global' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <ListFilter className="w-4 h-4" /> Từ kho tổng
          </button>
        </div>

        {/* ── Nhập tay ── */}
        {addMode === 'manual' && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">Source này sẽ thuộc <strong>kho riêng của team</strong>.</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect label="Nhóm sản phẩm *" value={formBrandType}
                  onChange={v => setFormBrandType(v as 'DO_DA' | 'TRANG_SUC')}
                  options={[{ value: 'DO_DA', label: 'Đồ da' }, { value: 'TRANG_SUC', label: 'Trang sức' }]} />
                <CustomSelect label="Loại Source *" value={form.type ?? 'OUTRO'}
                  onChange={v => setForm(f => ({ ...f, type: v as SourceType }))}
                  options={(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map(k => ({ value: k, label: SOURCE_TYPE_LABELS[k] }))} />
              </div>
              <DarkInput label="Mã code" placeholder="VD: SRC001 (tuỳ chọn)" value={form.code ?? ''}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              <DarkInput label="Tên Source *" placeholder="Tên nguồn tài liệu..." value={form.name ?? ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <DarkInput label="Link *" placeholder="https://drive.google.com/..." value={form.link ?? ''}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
              <DarkInput label="Link ổ NAS" placeholder="\\nas\... hoặc smb://... (tuỳ chọn)" value={form.nas_link ?? ''}
                onChange={e => setForm(f => ({ ...f, nas_link: e.target.value }))} />
              <ProductSearchSelect label="Sản phẩm liên kết" value={form.team_product_id ?? ''}
                onChange={id => setForm(f => ({ ...f, team_product_id: id }))}
                products={(productsForSelect ?? []).map(p => ({ ...p, sku: p.sku ?? p.source_editor_product?.sku ?? '', name: p.name ?? p.source_editor_product?.name ?? '' }))}
                placeholder="-- Không liên kết sản phẩm --" clearLabel="-- Không liên kết --" />
            </div>
            <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-4 border border-gray-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <p className="text-base font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
            </div>
          </div>
        )}

        {/* ── Từ kho tổng ── */}
        {addMode === 'global' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
              <Globe className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-sm text-violet-700">Chọn source từ kho tổng để sao chép vào kho team. Source gốc vẫn ở kho tổng.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input autoFocus type="text" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
                  placeholder="Tìm tên hoặc code source..."
                  className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {globalSearch && (
                  <button onClick={() => setGlobalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {availableGlobal.length > 0 && (
                <button onClick={toggleAllGlobal} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap shrink-0">
                  {allGlobalSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${availableGlobal.length})`}
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {loadingGlobal ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
              ) : availableGlobal.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-10 italic">
                  {globalSearch ? 'Không tìm thấy source phù hợp' : 'Kho tổng chưa có source nào'}
                </p>
              ) : availableGlobal.map(s => {
                const selected = selectedGlobalIds.has(s.id)
                return (
                  <button key={s.id} onClick={() => toggleGlobalId(s.id)}
                    className={cn('w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left',
                      selected ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-gray-50 border border-transparent')}>
                    <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5',
                      selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white')}>
                      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className={cn('mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', SOURCE_TYPE_COLORS[s.type])}>
                      {SOURCE_TYPE_LABELS[s.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.code && <span className="text-[11px] font-mono text-slate-400">{s.code}</span>}
                        <span className="text-[11px] text-indigo-400 truncate max-w-[200px]">{s.link}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {(globalSourcesData?.data ?? []).length > availableGlobal.length && (
              <p className="text-xs text-slate-400 text-center">
                Đã ẩn {(globalSourcesData?.data ?? []).length - availableGlobal.length} source đã có trong kho team
              </p>
            )}
          </div>
        )}
      </DarkModal>

      {/* ─── Modal Sửa Source ─── */}
      <DarkModal
        open={modal === 'edit'}
        onClose={() => setModal(null)}
        title="Chỉnh sửa Source"
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-3 text-base font-semibold transition-colors">
              Hủy
            </button>
            <button onClick={handleManualSubmit} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu thay đổi
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect label="Nhóm sản phẩm *" value={formBrandType}
              onChange={v => setFormBrandType(v as 'DO_DA' | 'TRANG_SUC')}
              options={[{ value: 'DO_DA', label: 'Đồ da' }, { value: 'TRANG_SUC', label: 'Trang sức' }]} />
            <CustomSelect label="Loại Source *" value={form.type ?? 'OUTRO'}
              onChange={v => setForm(f => ({ ...f, type: v as SourceType }))}
              options={(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map(k => ({ value: k, label: SOURCE_TYPE_LABELS[k] }))} />
          </div>
          <DarkInput label="Mã code" placeholder="VD: SRC001" value={form.code ?? ''}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          <DarkInput label="Tên Source *" placeholder="Tên nguồn tài liệu..." value={form.name ?? ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <DarkInput label="Link *" placeholder="https://drive.google.com/..." value={form.link ?? ''}
            onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
          {editing?.team_product ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">Sản phẩm liên kết</p>
              <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <span className="text-xs text-indigo-400 font-mono bg-white border border-indigo-100 px-2 py-0.5 rounded-lg">{editing.team_product.sku}</span>
                <span className="text-sm font-semibold text-slate-800">{editing.team_product.name}</span>
                <span className="ml-auto text-xs text-indigo-400 shrink-0">Kho team</span>
              </div>
            </div>
          ) : (
            <ProductSearchSelect label="Sản phẩm liên kết" value={form.team_product_id ?? ''}
              onChange={id => setForm(f => ({ ...f, team_product_id: id }))}
              products={(productsForSelect ?? []).map(p => ({ ...p, sku: p.sku ?? p.source_editor_product?.sku ?? '', name: p.name ?? p.source_editor_product?.name ?? '' }))}
              placeholder="-- Không liên kết sản phẩm --" clearLabel="-- Không liên kết --" />
          )}
          <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-4 border border-gray-200">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.is_active ?? true}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
            <p className="text-base font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
          </div>
        </div>
      </DarkModal>
    </div>
  )
}
