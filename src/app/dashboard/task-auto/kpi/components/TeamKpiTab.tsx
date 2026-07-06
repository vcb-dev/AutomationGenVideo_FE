'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Loader2, Users } from 'lucide-react'
import { DarkModal, DarkInput, EmptyState, CustomSelect } from '@/components/task-auto'
import { getTeamKpis, createTeamKpi, updateTeamKpi, getTeams } from '@/lib/api/task-auto'
import { TeamKpi } from '@/types/task-auto'
import { TeamKpiCard } from './TeamKpiCard'
import { TeamKpiAllocationForm, AllocationDraft } from './TeamKpiAllocationForm'

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props {
  month: string
  canEdit: boolean
  userId?: string
  isAdminOrManager?: boolean
  selectedTeamId: string
  onTeamChange: (id: string) => void
}

export function TeamKpiTab({ month, canEdit, userId, isAdminOrManager, selectedTeamId, onTeamChange }: Props) {
  const qc = useQueryClient()
  const [modal, setModal]         = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing]     = useState<TeamKpi | null>(null)
  const [form, setForm]           = useState({ team_id: '', month, note: '' })
  const [allocations, setAllocations] = useState<AllocationDraft[]>([])

  const { data: teamKpis, isLoading } = useQuery({
    queryKey: ['task-auto', 'team-kpis', month],
    queryFn: () => getTeamKpis(month),
  })
  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // Tất cả team user thuộc (leader hoặc member)
  const myTeams = !isAdminOrManager && userId
    ? (teams?.filter(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId)) ?? [])
    : []

  // Khởi tạo selectedTeamId về team đầu tiên khi data load xong
  useEffect(() => {
    if (myTeams.length > 0 && !isAdminOrManager && !selectedTeamId) {
      onTeamChange(myTeams[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTeams.length, isAdminOrManager])

  const effectiveTeamId = isAdminOrManager ? selectedTeamId : (selectedTeamId || myTeams[0]?.id || '')
  const visibleKpis = effectiveTeamId
    ? (teamKpis ?? []).filter(k => k.team_id === effectiveTeamId)
    : []

  const createMut = useMutation({
    mutationFn: createTeamKpi,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'team-kpis'] }); toast.success('Đã thêm KPI team'); setModal(null) },
    onError: () => toast.error('Không thể thêm KPI team'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<TeamKpi> }) => updateTeamKpi(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'team-kpis'] }); toast.success('Đã cập nhật KPI team'); setModal(null) },
    onError: () => toast.error('Không thể cập nhật KPI team'),
  })

  const openCreate = () => { setForm({ team_id: '', month, note: '' }); setAllocations([]); setEditing(null); setModal('create') }
  const openEdit = (kpi: TeamKpi) => {
    setForm({ team_id: kpi.team_id, month: kpi.month, note: kpi.note ?? '' })
    setAllocations((kpi.allocations ?? []).map(a => ({
      type: a.type,
      content_line_id: a.content_line_id ?? '',
      product_line_id: a.product_line_id ?? '',
      value: a.percent,
    })))
    setEditing(kpi)
    setModal('edit')
  }

  const handleSubmit = () => {
    if (!form.team_id) return toast.error('Chọn team')
    if (!form.month)   return toast.error('Chọn tháng')
    const contentAllocs = allocations.filter(a => a.type === 'CONTENT_LINE')
    const productAllocs = allocations.filter(a => a.type === 'PRODUCT_LINE')
    const contentTotal  = contentAllocs.reduce((s, a) => s + (Number(a.value) || 0), 0)
    const productTotal  = productAllocs.reduce((s, a) => s + (Number(a.value) || 0), 0)
    if (contentAllocs.length > 0 && contentTotal !== 100) return toast.error(`Tuyến nội dung tổng phải bằng 100% (hiện ${contentTotal}%)`)
    if (productAllocs.length > 0 && productTotal !== 100) return toast.error(`Dòng sản phẩm tổng phải bằng 100% (hiện ${productTotal}%)`)
    const body = {
      ...form,
      note: form.note || null,
      allocations: allocations
        .filter(a => Number(a.value) > 0)
        .map(a => ({
          type: a.type,
          content_line_id: a.type === 'CONTENT_LINE' ? (a.content_line_id || null) : null,
          product_line_id: a.type === 'PRODUCT_LINE' ? (a.product_line_id || null) : null,
          percent: Number(a.value),
        })),
    }
    if (modal === 'create') createMut.mutate(body as Partial<TeamKpi>)
    else if (editing)       updateMut.mutate({ id: editing.id, body: body as Partial<TeamKpi> })
  }

  const saving       = createMut.isPending || updateMut.isPending
  const formatMonth  = (yyyymm: string) => { const [y, m] = yyyymm.split('-'); return `Tháng ${m}/${y}` }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <CustomSelect
              value={selectedTeamId}
              onChange={onTeamChange}
              options={[
                { value: '', label: 'Chọn team để xem KPI' },
                ...(teams?.map(t => ({ value: t.id, label: t.name })) ?? []),
              ]}
              className="min-w-[220px]"
              searchable
            />
          </div>
        )}
        {!isAdminOrManager && myTeams.length === 1 && (
          <p className="text-sm text-slate-500">
            KPI team <span className="font-semibold text-slate-700">{myTeams[0].name}</span>
          </p>
        )}
        {!isAdminOrManager && myTeams.length > 1 && (
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <CustomSelect
              value={selectedTeamId}
              onChange={onTeamChange}
              options={myTeams.map(t => ({ value: t.id, label: t.name }))}
              className="min-w-[220px]"
            />
          </div>
        )}
        {canEdit && effectiveTeamId && (
          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm KPI Team
          </button>
        )}
      </div>

      {isAdminOrManager && !effectiveTeamId ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <EmptyState title="Chọn một team để xem KPI" />
        </div>
      ) : isLoading ? (
        <LoadingCards />
      ) : visibleKpis.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <EmptyState title={`Không có KPI team nào trong ${formatMonth(month)}`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleKpis.map(kpi => (
            <TeamKpiCard key={kpi.id} kpi={kpi} canEdit={canEdit} onEdit={() => openEdit(kpi)} />
          ))}
        </div>
      )}

      <DarkModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Thêm KPI Team' : 'Chỉnh sửa KPI Team'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {modal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Thông tin chung
            </p>
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="Team *"
                value={form.team_id}
                onChange={v => setForm(f => ({ ...f, team_id: v }))}
                options={[
                  { value: '', label: '-- Chọn team --' },
                  ...(teams?.map(t => ({ value: t.id, label: t.name })) ?? []),
                ]}
                searchable
              />
              <DarkInput
                label="Tháng *"
                type="month"
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Ghi chú</label>
              <textarea
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                rows={2}
                placeholder="Nhập ghi chú (tuỳ chọn)..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Phân bổ KPI
              <span className="text-gray-300 font-normal normal-case tracking-normal">(mỗi nhóm độc lập = 100%)</span>
            </p>
            <TeamKpiAllocationForm allocations={allocations} onChange={setAllocations} />
          </div>
        </div>
      </DarkModal>
    </div>
  )
}
