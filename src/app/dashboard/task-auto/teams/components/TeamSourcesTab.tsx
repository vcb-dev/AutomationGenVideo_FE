'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Radio, Plus, Search, ExternalLink, Trash2, Edit2,
  Loader2, Globe, ListFilter, PenLine, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/task-auto/EmptyState'
import { CustomSelect, DarkInput, ProductSearchSelect } from '@/components/task-auto/DarkInput'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { getSources, createSource, updateSource, deleteSource, getTeams, getProducts } from '@/lib/api/task-auto'
import { Source, SOURCE_TYPE_LABELS, SourceType } from '@/types/task-auto'

const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  PRODUCT_STOCK: 'bg-indigo-100 text-indigo-700',
  COLLECTED:     'bg-teal-100 text-teal-700',
  OUTRO:         'bg-purple-100 text-purple-700',
  WORKSHOP:      'bg-orange-100 text-orange-700',
  HUYK:          'bg-rose-100 text-rose-700',
}

interface TeamSourcesTabProps {
  isAdminOrManager: boolean
  userId?: string
  brandType: 'DO_DA' | 'TRANG_SUC'
}

type AddMode = 'manual' | 'global'

export function TeamSourcesTab({ isAdminOrManager, userId, brandType }: TeamSourcesTabProps) {
  const qc = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [search, setSearch] = useState('')

  // modal states
  const [modal, setModal]           = useState<null | 'add' | 'edit'>(null)
  const [addMode, setAddMode]       = useState<AddMode>('manual')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing]       = useState<Source | null>(null)

  // manual form — dùng brandType từ props (page-level selection)
  const [formBrandType, setFormBrandType] = useState<'DO_DA' | 'TRANG_SUC'>(brandType)
  const [form, setForm] = useState<Partial<Source>>({
    type: 'OUTRO', name: '', link: '', code: '', product_id: '', is_active: true,
  })

  // global pick state
  const [globalSearch, setGlobalSearch]         = useState('')
  const [selectedGlobalId, setSelectedGlobalId] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  useEffect(() => {
    if (!isAdminOrManager && teams && userId) {
      const myTeam = teams.find(t => t.leader_id === userId || t.members?.some((m: any) => m.user_id === userId))
      if (myTeam) setSelectedTeamId(myTeam.id)
    }
  }, [teams, userId, isAdminOrManager])

  const teamOptions = isAdminOrManager
    ? [{ value: '', label: '— Chọn team —' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]
    : (teams ?? []).map(t => ({ value: t.id, label: t.name }))

  const selectedTeam = teams?.find(t => t.id === selectedTeamId)
  const isLeaderOfSelected  = selectedTeam?.leader_id === userId
  const isMemberOfSelected  = selectedTeam?.members?.some((m: any) => m.user_id === userId) ?? false
  const canManageSelected   = isAdminOrManager || isLeaderOfSelected || isMemberOfSelected

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'sources', 'team', selectedTeamId, brandType, search],
    queryFn: () => getSources({ team_id: selectedTeamId, brand_type: brandType, search: search || undefined, limit: 100 }),
    enabled: !!selectedTeamId,
  })

  const { data: productsForSelect } = useQuery({
    queryKey: ['task-auto', 'products-select'],
    queryFn: () => getProducts({ limit: 200 }),
    enabled: modal !== null,
  })

  const { data: globalSourcesData, isLoading: loadingGlobal } = useQuery({
    queryKey: ['task-auto', 'sources-global-pick', globalSearch],
    queryFn: () => getSources({ owner: 'global', search: globalSearch || undefined, is_active: true, limit: 100 }),
    enabled: modal === 'add' && addMode === 'global',
  })

  const resetAddModal = () => {
    setModal(null)
    setAddMode('manual')
    setForm({ type: 'OUTRO', name: '', link: '', code: '', product_id: '', is_active: true })
    setGlobalSearch('')
    setSelectedGlobalId('')
    setEditing(null)
  }

  const createMut = useMutation({
    mutationFn: createSource,
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['task-auto', 'sources', 'team', selectedTeamId] })
      toast.success('Đã thêm source vào kho team')
      resetAddModal()
    },
    onError: () => toast.error('Không thể thêm source'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Source> }) => updateSource(id, body),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['task-auto', 'sources', 'team', selectedTeamId] })
      toast.success('Đã cập nhật source')
      setModal(null)
    },
    onError: () => toast.error('Không thể cập nhật source'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteSource,
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['task-auto', 'sources', 'team', selectedTeamId] })
      toast.success('Đã xóa source')
      setDeletingId(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể xóa source')
      setDeletingId(null)
    },
  })

  const openAdd = () => {
    setForm({ type: 'OUTRO', name: '', link: '', code: '', product_id: '', is_active: true })
    setEditing(null)
    setAddMode('manual')
    setGlobalSearch('')
    setSelectedGlobalId('')
    setModal('add')
  }

  const openEdit = (s: Source) => { setForm({ ...s }); setEditing(s); setModal('edit') }

  const handleManualSubmit = () => {
    if (!form.name || !form.link) return toast.error('Tên và link là bắt buộc')
    const body = {
      name:       form.name,
      link:       form.link,
      code:       form.code || null,
      product_id: form.product_id || null,
      team_id:    selectedTeamId,
      user_id:    null,
      is_active:  form.is_active ?? true,
    }
    if (modal === 'add') createMut.mutate({ type: form.type!, brand_type: formBrandType, ...body })
    else if (editing)    updateMut.mutate({ id: editing.id, body })
  }

  const handleGlobalPick = () => {
    const src = globalSourcesData?.data?.find(s => s.id === selectedGlobalId)
    if (!src) return
    createMut.mutate({
      type:       src.type,
      name:       src.name,
      link:       src.link,
      code:       src.code || null,
      product_id: src.product_id || null,
      team_id:    selectedTeamId,
      user_id:    null,
      is_active:  true,
    } as any)
  }

  const saving = createMut.isPending || updateMut.isPending
  const sources = data?.data ?? []
  const existingLinks = new Set(sources.map(s => s.link))
  const availableGlobal = (globalSourcesData?.data ?? []).filter(s => !existingLinks.has(s.link))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          {isAdminOrManager ? (
            <CustomSelect
              value={selectedTeamId}
              onChange={v => { setSelectedTeamId(v); setSearch('') }}
              options={teamOptions}
              className="min-w-[200px]"
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

      {/* Chưa chọn team */}
      {!selectedTeamId && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12">
          <EmptyState icon={Radio} title="Chọn team để xem kho source" />
        </div>
      )}

      {/* Danh sách */}
      {selectedTeamId && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
            </div>
          ) : sources.length === 0 ? (
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
                    <th className="text-left px-5 py-4 text-sm font-bold text-slate-600 whitespace-nowrap">Trạng thái</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sources.map(s => (
                    <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors group">
                      <td className="px-5 py-4">
                        <p className="text-base font-semibold text-slate-800 truncate max-w-[240px]" title={s.name}>{s.name}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold', SOURCE_TYPE_COLORS[s.type])}>
                          {SOURCE_TYPE_LABELS[s.type]}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {s.code
                          ? <span className="bg-slate-100 text-slate-600 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg">{s.code}</span>
                          : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-4 max-w-[200px]">
                        <a href={s.link} target="_blank" rel="noreferrer" title={s.link}
                          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-400 text-sm transition-colors">
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{s.link}</span>
                        </a>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-700 truncate block max-w-[160px]">
                          {s.product?.name ?? <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                          s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-slate-400')}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', s.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                          {s.is_active ? 'Hoạt động' : 'Ẩn'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {canManageSelected && (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(s)}
                              className="p-2 rounded-xl hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeletingId(s.id)}
                              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
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

      {/* ─── Modal Thêm Source (2 tab) ─── */}
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
              <button onClick={handleGlobalPick} disabled={saving || !selectedGlobalId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Thêm vào kho
              </button>
            )}
          </>
        }
      >
        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setAddMode('manual')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              addMode === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <PenLine className="w-4 h-4" /> Nhập tay
          </button>
          <button
            onClick={() => setAddMode('global')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              addMode === 'global' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <ListFilter className="w-4 h-4" /> Từ kho tổng
          </button>
        </div>

        {/* ── Tab: Nhập tay ── */}
        {addMode === 'manual' && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Source này sẽ thuộc <strong>kho riêng của team</strong>.
                Khi auto-assign, editor trong team này sẽ được ưu tiên dùng source này.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
                Phân loại
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="Nhóm sản phẩm *"
                  value={formBrandType}
                  onChange={v => setFormBrandType(v as 'DO_DA' | 'TRANG_SUC')}
                  options={[{ value: 'DO_DA', label: 'Đồ da' }, { value: 'TRANG_SUC', label: 'Trang sức' }]}
                />
                <CustomSelect
                  label="Loại Source *"
                  value={form.type ?? 'OUTRO'}
                  onChange={v => setForm(f => ({ ...f, type: v as SourceType }))}
                  options={(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map(k => ({ value: k, label: SOURCE_TYPE_LABELS[k] }))}
                />
              </div>
              <DarkInput
                label="Mã code"
                placeholder="VD: SRC001 (tuỳ chọn)"
                value={form.code ?? ''}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              />
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
                Thông tin Source
              </p>
              <DarkInput
                label="Tên Source *"
                placeholder="Tên nguồn tài liệu..."
                value={form.name ?? ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <DarkInput
                label="Link *"
                placeholder="https://drive.google.com/..."
                value={form.link ?? ''}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              />
              <ProductSearchSelect
                label="Sản phẩm liên kết"
                value={form.product_id ?? ''}
                onChange={id => setForm(f => ({ ...f, product_id: id }))}
                products={productsForSelect?.data ?? []}
                placeholder="-- Không liên kết sản phẩm --"
                clearLabel="-- Không liên kết --"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
                Trạng thái
              </p>
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-4 border border-gray-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.is_active ?? true}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
                <div>
                  <p className="text-base font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{form.is_active ? 'Source hiển thị và có thể gán vào task' : 'Source bị ẩn'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Từ kho tổng ── */}
        {addMode === 'global' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
              <Globe className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-sm text-violet-700">
                Chọn source từ kho tổng để sao chép vào kho team.
                Source gốc vẫn ở kho tổng, team sẽ có bản riêng để tuỳ chỉnh.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setSelectedGlobalId('') }}
                placeholder="Tìm tên hoặc code source..."
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
              {globalSearch && (
                <button onClick={() => setGlobalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1">
              {loadingGlobal ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : availableGlobal.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-10 italic">
                  {globalSearch ? 'Không tìm thấy source phù hợp' : 'Kho tổng chưa có source nào'}
                </p>
              ) : (
                availableGlobal.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedGlobalId(s.id)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left',
                      selectedGlobalId === s.id
                        ? 'bg-indigo-50 border border-indigo-300'
                        : 'hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                      SOURCE_TYPE_COLORS[s.type]
                    )}>
                      {SOURCE_TYPE_LABELS[s.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.code && (
                          <span className="text-[11px] font-mono text-slate-400">{s.code}</span>
                        )}
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[11px] text-indigo-400 hover:text-indigo-600 flex items-center gap-0.5 truncate max-w-[200px]"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{s.link}</span>
                        </a>
                      </div>
                    </div>
                    {selectedGlobalId === s.id && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                ))
              )}
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
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Phân loại
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CustomSelect
                label="Nhóm sản phẩm *"
                value={formBrandType}
                onChange={v => setFormBrandType(v as 'DO_DA' | 'TRANG_SUC')}
                options={[{ value: 'DO_DA', label: 'Đồ da' }, { value: 'TRANG_SUC', label: 'Trang sức' }]}
              />
              <CustomSelect
                label="Loại Source *"
                value={form.type ?? 'OUTRO'}
                onChange={v => setForm(f => ({ ...f, type: v as SourceType }))}
                options={(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map(k => ({ value: k, label: SOURCE_TYPE_LABELS[k] }))}
              />
            </div>
            <DarkInput
              label="Mã code"
              placeholder="VD: SRC001 (tuỳ chọn)"
              value={form.code ?? ''}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Thông tin Source
            </p>
            <DarkInput
              label="Tên Source *"
              placeholder="Tên nguồn tài liệu..."
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <DarkInput
              label="Link *"
              placeholder="https://drive.google.com/..."
              value={form.link ?? ''}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
            />
            <ProductSearchSelect
              label="Sản phẩm liên kết"
              value={form.product_id ?? ''}
              onChange={id => setForm(f => ({ ...f, product_id: id }))}
              products={productsForSelect?.data ?? []}
              placeholder="-- Không liên kết sản phẩm --"
              clearLabel="-- Không liên kết --"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Trạng thái
            </p>
            <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-4 border border-gray-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
              <div>
                <p className="text-base font-semibold text-slate-800">{form.is_active ? 'Đang hoạt động' : 'Không hoạt động'}</p>
                <p className="text-sm text-slate-500 mt-0.5">{form.is_active ? 'Source hiển thị và có thể gán vào task' : 'Source bị ẩn'}</p>
              </div>
            </div>
          </div>
        </div>
      </DarkModal>
    </div>
  )
}
