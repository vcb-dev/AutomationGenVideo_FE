'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Loader2, Users, Video, FileText, Package } from 'lucide-react'
import { DarkModal, DarkInput, EmptyState, CustomSelect, ServerSearchSelect } from '@/components/task-auto'
import {
  getEditorKpis, createEditorKpi, updateEditorKpi, deleteEditorKpi,
  getApprovals, getTeams,
} from '@/lib/api/task-auto'
import { EditorKpi } from '@/types/task-auto'
import { cn } from '@/lib/utils'
import { EditorKpiDetailModal, VIDEO_ROWS, CONTENT_ROWS, PRODUCT_ROWS, KpiFormState } from './EditorKpiDetailModal'
import { EditorKpiTableRow, EditorKpiLoadingRows } from './EditorKpiTableRow'
import { TeamKpiAllocationForm, AllocationDraft } from './TeamKpiAllocationForm'

const defaultForm = (): KpiFormState => ({
  user_id: '', team_id: '', month: '',
  total_target: 0, video_win: 0, video_fail: 0,
  kpi_extra: 0, content_new: 0, content_collected: 0, content_win_cover: 0,
  product_planned: 0, product_win_collect: 0,
})

interface Props {
  month: string
  canEdit: boolean
  isLeader?: boolean
  userId?: string
  selectedTeamId?: string
  onTeamChange?: (id: string) => void
}

export function EditorKpiTab({ month, canEdit, isLeader, userId, selectedTeamId, onTeamChange }: Props) {
  const qc = useQueryClient()
  const [modal, setModal]           = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing]       = useState<EditorKpi | null>(null)
  const [viewingKpi, setViewingKpi] = useState<EditorKpi | null>(null)
  const [form, setForm]             = useState<KpiFormState>(defaultForm())
  const [allocations, setAllocations] = useState<AllocationDraft[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editorSearch, setEditorSearch] = useState('')

  const isManagerOrAdmin = canEdit && !isLeader

  // Admin: teamFilter sync với selectedTeamId (liên tab); non-admin: quản lý độc lập, mặc định '' = tất cả
  const [teamFilter, setTeamFilter] = useState(isManagerOrAdmin ? (selectedTeamId ?? '') : '')

  useEffect(() => {
    if (isManagerOrAdmin && selectedTeamId !== undefined) setTeamFilter(selectedTeamId)
  }, [selectedTeamId, isManagerOrAdmin])

  const { data: editorKpis, isLoading } = useQuery({
    queryKey: ['task-auto', 'editor-kpis', month],
    queryFn: () => getEditorKpis(month),
  })

  const { data: approvedEditors } = useQuery({
    queryKey: ['task-auto', 'approvals', 'APPROVED'],
    queryFn: () => getApprovals('APPROVED'),
    enabled: modal !== null,
  })

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
    enabled: isManagerOrAdmin || !!isLeader,
  })

  // Tất cả team user thuộc (leader hoặc member) — cho non-admin
  const myTeams = !isManagerOrAdmin && userId
    ? (teams?.filter(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId)) ?? [])
    : []

  // Tập hợp tất cả member IDs từ mọi team của user (dùng khi không chọn team cụ thể)
  const allMyTeamMemberIds = myTeams.length > 0
    ? new Set(myTeams.flatMap(t => t.members?.map(m => m.user_id) ?? []))
    : null

  // Team đang chọn (teamFilter đã được sync từ selectedTeamId prop qua useEffect)
  const effectiveTeam = teamFilter ? teams?.find(t => t.id === teamFilter) : undefined
  const effectiveTeamMemberIds = new Set(effectiveTeam?.members?.map(m => m.user_id) ?? [])


  const allApproved = approvedEditors ?? []
  const selectableEditors = isLeader
    ? allApproved.filter(a =>
        teamFilter
          ? effectiveTeamMemberIds.has(a.user_id)       // team cụ thể đang chọn
          : allMyTeamMemberIds?.has(a.user_id) ?? false  // tất cả team của mình
      )
    : allApproved

  const upsertMut = useMutation({
    mutationFn: (body: KpiFormState & { allocations: any[] }) =>
      editing
        ? updateEditorKpi(editing.id, body as any)
        : createEditorKpi(body as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'editor-kpis'] })
      toast.success(editing ? 'Đã cập nhật KPI' : 'Đã thêm KPI editor')
      setModal(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể lưu KPI'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteEditorKpi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'editor-kpis'] })
      toast.success('Đã xóa KPI')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Không thể xóa KPI')
      setDeletingId(null)
    },
  })

  const openCreate = () => {
    setForm({ ...defaultForm(), month, team_id: teamFilter || myTeams[0]?.id || '' })
    setAllocations([])
    setEditing(null)
    setModal('create')
  }

  const openEdit = (kpi: EditorKpi) => {
    setEditing(kpi)
    setForm({
      user_id: kpi.user_id, team_id: kpi.team_id ?? '', month: kpi.month,
      total_target: kpi.total_target, video_win: kpi.video_win, video_fail: kpi.video_fail,
      kpi_extra: kpi.kpi_extra, content_new: kpi.content_new,
      content_collected: kpi.content_collected, content_win_cover: kpi.content_win_cover,
      product_planned: kpi.product_planned, product_win_collect: kpi.product_win_collect,
    })
    setAllocations((kpi.allocations ?? []).map(a => ({
      type: a.type,
      content_line_id: a.content_line_id ?? '',
      product_line_id: a.product_line_id ?? '',
      value: a.quantity,
    })))
    setModal('edit')
  }

  const setField = (key: keyof KpiFormState, val: number) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = () => {
    if (!form.user_id)  return toast.error('Chọn editor')
    if (!form.team_id)  return toast.error('Chọn nhóm để đặt KPI')
    if (!form.month)    return toast.error('Chọn tháng')
    const contentAllocs = allocations.filter(a => a.type === 'CONTENT_LINE')
    const productAllocs = allocations.filter(a => a.type === 'PRODUCT_LINE')
    const contentTotal  = contentAllocs.reduce((s, a) => s + (Number(a.value) || 0), 0)
    const productTotal  = productAllocs.reduce((s, a) => s + (Number(a.value) || 0), 0)
    if (contentAllocs.length > 0 && contentTotal !== form.total_target)
      return toast.error(`Tuyến nội dung tổng phải bằng tổng video sản xuất (${form.total_target}), hiện ${contentTotal}`)
    if (productAllocs.length > 0 && productTotal !== form.product_planned)
      return toast.error(`Dòng sản phẩm tổng phải bằng SP đẩy video theo kế hoạch (${form.product_planned}), hiện ${productTotal}`)
    upsertMut.mutate({
      ...form,
      allocations: allocations
        .filter(a => Number(a.value) > 0)
        .map(a => ({
          type: a.type,
          content_line_id: a.type === 'CONTENT_LINE' ? (a.content_line_id || null) : null,
          product_line_id: a.type === 'PRODUCT_LINE' ? (a.product_line_id || null) : null,
          quantity: Number(a.value),
        })),
    })
  }

  let visibleKpis = editorKpis ?? []
  if (isLeader) {
    // Filter theo team_id trực tiếp → chính xác ngay cả khi editor thuộc nhiều team
    if (teamFilter)
      visibleKpis = visibleKpis.filter(k => k.team_id === teamFilter)
    else if (allMyTeamMemberIds && allMyTeamMemberIds.size > 0)
      visibleKpis = visibleKpis.filter(k => k.team_id && allMyTeamMemberIds.has(k.user_id))
  } else if (teamFilter) {
    visibleKpis = visibleKpis.filter(k => k.team_id === teamFilter)
  }

  const handleTeamChange = (id: string) => {
    setTeamFilter(id)
    onTeamChange?.(id)
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {isManagerOrAdmin && (
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <CustomSelect
              value={teamFilter}
              onChange={handleTeamChange}
              options={[
                { value: '', label: 'Tất cả nhóm' },
                ...(teams?.map(t => ({ value: t.id, label: t.name })) ?? []),
              ]}
              className="min-w-[200px]"
              searchable
            />
          </div>
        )}
        {isLeader && myTeams.length === 1 && myTeams[0] && (
          <p className="text-sm text-slate-500">
            Đặt KPI cho editor trong team{' '}
            <span className="font-semibold text-slate-700">{myTeams[0].name}</span>
          </p>
        )}
        {isLeader && myTeams.length > 1 && (
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400 shrink-0" />
            <CustomSelect
              value={teamFilter}
              onChange={handleTeamChange}
              options={[
                { value: '', label: 'Tất cả nhóm của tôi' },
                ...myTeams.map(t => ({ value: t.id, label: t.name })),
              ]}
              className="min-w-[200px]"
            />
          </div>
        )}
        {canEdit && (
          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" /> Thêm KPI Editor
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Editor</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Nhóm</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tháng</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tổng video</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Video win</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Content mới</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">SP kế hoạch</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Người đặt</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <EditorKpiLoadingRows />}
              {!isLoading && visibleKpis.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState title={`Không có KPI editor${teamFilter ? ' trong nhóm này' : ''}`} />
                  </td>
                </tr>
              )}
              {visibleKpis.map(kpi => (
                <EditorKpiTableRow
                  key={kpi.id}
                  kpi={kpi}
                  canEdit={canEdit}
                  onEdit={openEdit}
                  onDelete={setDeletingId}
                  onViewDetail={setViewingKpi}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      <DarkModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Thêm KPI Editor' : `Sửa KPI — ${editing?.user?.full_name ?? ''}`}
        size="2xl"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-3 text-base font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={upsertMut.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              {upsertMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {modal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <ServerSearchSelect
              label="Editor *"
              value={form.user_id}
              onChange={v => setForm(f => ({ ...f, user_id: v }))}
              items={selectableEditors.map(a => ({
                value: a.user_id,
                label: a.user?.full_name ?? a.user_id,
                sublabel: a.user?.email ?? '',
              }))}
              searchValue={editorSearch}
              onSearchChange={setEditorSearch}
              placeholder={
                selectableEditors.length === 0
                  ? (isLeader ? 'Chưa có editor trong team' : 'Chưa có editor được phê duyệt')
                  : '-- Chọn editor --'
              }
              searchPlaceholder="Tìm tên hoặc email..."
              clearLabel="-- Bỏ chọn --"
            />
            <DarkInput
              label="Tháng *"
              type="month"
              value={form.month}
              onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
            />
          </div>

          {/* Team selector: admin chọn bất kỳ team; leader 1-team thì badge; leader nhiều team thì dropdown */}
          {isManagerOrAdmin ? (
            <CustomSelect
              label="Nhóm *"
              value={form.team_id ?? ''}
              onChange={v => setForm(f => ({ ...f, team_id: v }))}
              options={[
                { value: '', label: '-- Chọn nhóm --' },
                ...(teams?.map(t => ({ value: t.id, label: t.name })) ?? []),
              ]}
              searchable
            />
          ) : myTeams.length > 1 ? (
            <CustomSelect
              label="Nhóm *"
              value={form.team_id ?? ''}
              onChange={v => setForm(f => ({ ...f, team_id: v }))}
              options={[
                { value: '', label: '-- Chọn nhóm --' },
                ...myTeams.map(t => ({ value: t.id, label: t.name })),
              ]}
            />
          ) : form.team_id ? (
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Nhóm</label>
              <div className="px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700">
                {myTeams[0]?.name ?? form.team_id}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Video */}
            <div className="rounded-2xl overflow-hidden border border-orange-200">
              <div className="bg-orange-400 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
                <Video className="w-4 h-4" /> Số video sản xuất đạt tiêu chuẩn
              </div>
              <div className="divide-y divide-orange-100">
                {VIDEO_ROWS.map(row => (
                  <div key={row.key as string} className={cn('flex items-center justify-between gap-3 px-4 py-2.5', row.bold ? 'bg-orange-50/60' : 'bg-white')}>
                    <span className={cn('text-sm text-slate-600 flex-1 leading-snug', row.bold && 'font-semibold text-slate-800')}>{row.label}</span>
                    <input
                      type="number" min={0}
                      value={(form[row.key] as number) || ''}
                      onChange={e => setField(row.key, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className={cn(
                        'w-20 shrink-0 border rounded-lg px-2 py-1 text-right font-bold focus:outline-none focus:ring-2 transition-colors',
                        row.bold
                          ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-400'
                          : 'bg-white border-gray-200 text-slate-800 focus:ring-green-400',
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="rounded-2xl overflow-hidden border border-green-200">
              <div className="bg-green-500 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Content
              </div>
              <div className="divide-y divide-green-100">
                {CONTENT_ROWS.map(row => (
                  <div key={row.key as string} className={cn('flex items-center justify-between gap-3 px-4 py-2.5', row.bold ? 'bg-green-50/60' : 'bg-white')}>
                    <span className={cn('text-sm text-slate-600 flex-1 leading-snug', row.bold && 'font-semibold text-slate-800')}>{row.label}</span>
                    <input
                      type="number" min={0}
                      value={(form[row.key] as number) || ''}
                      onChange={e => setField(row.key, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className={cn(
                        'w-20 shrink-0 border rounded-lg px-2 py-1 text-right font-bold focus:outline-none focus:ring-2 transition-colors',
                        row.bold
                          ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-400'
                          : 'bg-white border-gray-200 text-slate-800 focus:ring-green-400',
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Product */}
            <div className="rounded-2xl overflow-hidden border border-purple-200">
              <div className="bg-purple-500 text-white text-sm font-bold px-4 py-3 flex items-center gap-2">
                <Package className="w-4 h-4" /> Product
              </div>
              <div className="divide-y divide-purple-100">
                {PRODUCT_ROWS.map(row => (
                  <div key={row.key as string} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white">
                    <span className="text-sm text-slate-600 flex-1 leading-snug">{row.label}</span>
                    <input
                      type="number" min={0}
                      value={(form[row.key] as number) || ''}
                      onChange={e => setField(row.key, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-20 shrink-0 border border-gray-200 rounded-lg px-2 py-1 text-right font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
            <strong>Tổng video sản xuất</strong> được dùng làm chỉ tiêu auto-assign task hàng ngày.
            KPI sáng tạo chỉ thông báo, không tạo task tự động.
          </p>

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
              Phân bổ số lượng video theo tuyến nội dung / dòng sản phẩm
            </p>
            <TeamKpiAllocationForm
              allocations={allocations}
              onChange={setAllocations}
              mode="count"
              contentTarget={form.total_target}
              productTarget={form.product_planned}
            />
          </div>
        </div>
      </DarkModal>

      {/* Xác nhận xóa */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Xóa KPI Editor</h3>
            <p className="text-sm text-slate-500">KPI này sẽ bị xóa vĩnh viễn. Bạn có chắc không?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deletingId)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-60"
              >
                {deleteMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingKpi && (
        <EditorKpiDetailModal kpi={viewingKpi} onClose={() => setViewingKpi(null)} />
      )}
    </div>
  )
}
