'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Loader2, Users, Video, FileText, Package } from 'lucide-react'
import { DarkModal, DarkInput, EmptyState, CustomSelect, ServerSearchSelect, ConfirmDialog } from '@/components/task-auto'
import {
  getEditorKpis, createEditorKpi, updateEditorKpi, deleteEditorKpi,
  getApprovals, getTeams, getPerformanceGoals, archivePerformanceGoal, getContentLines,
} from '@/lib/api/task-auto'
import { EditorKpi } from '@/types/task-auto'
import { cn } from '@/lib/utils'
import { EditorKpiDetailModal, VIDEO_ROWS, CONTENT_ROWS, PRODUCT_ROWS, KpiFormState } from './EditorKpiDetailModal'
import { EditorKpiTableRow, EditorKpiLoadingRows } from './EditorKpiTableRow'
import type { AllocationDraft } from './TeamKpiAllocationForm'
import {
  PerformanceGoalsEditor, GoalDraft, goalToDraft, saveGoalDrafts, firstInvalidGoalField, assigneeGoalsQueryKey,
} from './PerformanceGoalsEditor'

const defaultForm = (): KpiFormState => ({
  user_id: '', team_id: '', month: '',
  total_target: 0,
  kpi_extra: 0, content_new: 0, content_paast_analyzed: 0, content_win_cover: 0,
  product_gmv: 0, product_traffic: 0, product_profit: 0, product_collect_test_win: 0,
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
  const [goalDrafts, setGoalDrafts] = useState<GoalDraft[]>([])
  const [goalReason, setGoalReason] = useState('')
  const [showGoalErrors, setShowGoalErrors] = useState(false)
  const [focusGoalKey, setFocusGoalKey] = useState<string | null>(null)
  const [loadedGoalsKey, setLoadedGoalsKey] = useState<string | null>(null)

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
  })

  const { data: contentLines = [] } = useQuery({
    queryKey: ['task-auto', 'content-lines'],
    queryFn: getContentLines,
    enabled: modal !== null,
  })

  // Tất cả team user thuộc (leader hoặc member) — cho non-admin
  const myTeams = !isManagerOrAdmin && userId
    ? (teams?.filter(t => t.leader_id === userId || t.members?.some(m => m.user_id === userId)) ?? [])
    : []

  // Tập hợp tất cả member IDs từ mọi team của user (dùng khi không chọn team cụ thể)
  const allMyTeamMemberIds = myTeams.length > 0
    ? new Set(myTeams.flatMap(t => t.members?.map(m => m.user_id) ?? []))
    : null

  // Editor selectable trong modal luôn khoanh theo nhóm đang chọn NGAY TRONG MODAL (form.team_id),
  // không phải theo bộ lọc ngoài toolbar — vì admin/leader nhiều team có thể đổi nhóm bên trong modal.
  const formTeam = teams?.find(t => t.id === form.team_id)
  const formTeamMemberIds = new Set(formTeam?.members?.map(m => m.user_id) ?? [])

  const allApproved = approvedEditors ?? []
  const selectableEditors = form.team_id
    ? allApproved.filter(a => formTeamMemberIds.has(a.user_id))
    : []
  const selectablePeople = [
    ...selectableEditors.map(editor => ({
      value: editor.user_id,
      label: editor.user?.full_name ?? editor.user_id,
      sublabel: editor.user?.email ?? '',
    })),
    ...(formTeam?.leader && !selectableEditors.some(editor => editor.user_id === formTeam.leader!.id)
      ? [{
          value: formTeam.leader.id,
          label: `${formTeam.leader.full_name} (Leader)`,
          sublabel: formTeam.leader.email ?? '',
        }]
      : []),
  ]

  const { data: monthGoals } = useQuery({
    queryKey: ['task-auto', 'performance-goals', 'month', month],
    queryFn: () => getPerformanceGoals({ month, type: 'KPI' }),
  })
  const goalCountByKpi = new Map<string, number>()
  for (const g of monthGoals?.records ?? []) {
    const key = `${g.user_id}|${g.team_id}`
    goalCountByKpi.set(key, (goalCountByKpi.get(key) ?? 0) + 1)
  }

  const formTeamId = form.team_id ?? ''
  const goalsAssigneeReady = modal !== null && !!form.user_id && !!formTeamId && /^\d{4}-\d{2}$/.test(form.month)
  const goalsKey = goalsAssigneeReady ? `${form.user_id}|${formTeamId}|${form.month}` : null
  const assigneeGoals = useQuery({
    queryKey: assigneeGoalsQueryKey(form.month, formTeamId, form.user_id),
    queryFn: () => getPerformanceGoals({ month: form.month, team_id: formTeamId, user_id: form.user_id, type: 'KPI' }),
    enabled: goalsAssigneeReady,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    setGoalDrafts(prev => prev.filter(d => !d.id))
    setLoadedGoalsKey(null)
  }, [goalsKey])

  useEffect(() => {
    if (!goalsKey || loadedGoalsKey === goalsKey) return
    if (!assigneeGoals.isSuccess || assigneeGoals.isFetching) return
    const saved = assigneeGoals.data.records.filter(goal => goal.type === 'KPI').map(goalToDraft)
    setGoalDrafts(prev => [...saved, ...prev.filter(d => !d.id)])
    setLoadedGoalsKey(goalsKey)
  }, [goalsKey, loadedGoalsKey, assigneeGoals.isSuccess, assigneeGoals.isFetching, assigneeGoals.data])

  const goalsLoading = !!goalsKey && loadedGoalsKey !== goalsKey && !assigneeGoals.isError

  const upsertMut = useMutation({
    mutationFn: async ({ body, goals, reason }: {
      body: KpiFormState & { allocations: any[] }
      goals: GoalDraft[]
      reason: string
    }) => {
      await (editing ? updateEditorKpi(editing.id, body as any) : createEditorKpi(body as any))
      return saveGoalDrafts(goals, { user_id: body.user_id, team_id: body.team_id!, month: body.month, reason })
    },
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'editor-kpis'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'performance-goals'] })
      if (result.failed === 0) {
        toast.success('Đã lưu KPI/OKR')
        setModal(null)
        return
      }
      setGoalDrafts(result.drafts)
      toast.error(`Đã lưu KPI cố định, còn ${result.failed} đầu mục KPI/OKR chưa lưu được`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể lưu KPI'),
  })

  const deleteMut = useMutation({
    mutationFn: async (kpi: EditorKpi) => {
      await deleteEditorKpi(kpi.id)
      if (!kpi.team_id) return 0
      try {
        const { records } = await getPerformanceGoals({ month: kpi.month, team_id: kpi.team_id, user_id: kpi.user_id, type: 'KPI' })
        const results = await Promise.allSettled(
          records.map(g => archivePerformanceGoal(g.id, g.revision, 'Xóa KPI/OKR của nhân sự trong tháng')),
        )
        return results.filter(r => r.status === 'rejected').length
      } catch {
        return -1
      }
    },
    onSuccess: failed => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'editor-kpis'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'performance-goals'] })
      if (failed === 0) toast.success('Đã xóa KPI/OKR')
      else toast.error('Đã xóa KPI cố định, nhưng chưa lưu trữ được hết các đầu mục KPI/OKR bổ sung')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Không thể xóa KPI')
      setDeletingId(null)
    },
  })

  const resetGoalEditor = () => {
    qc.removeQueries({ queryKey: ['task-auto', 'performance-goals', 'assignee'] })
    setGoalDrafts([])
    setGoalReason('')
    setShowGoalErrors(false)
    setFocusGoalKey(null)
    setLoadedGoalsKey(null)
  }

  const openCreate = () => {
    resetGoalEditor()
    setForm({ ...defaultForm(), month, team_id: teamFilter || myTeams[0]?.id || '' })
    setAllocations([])
    setEditing(null)
    setModal('create')
  }

  const openEdit = (kpi: EditorKpi) => {
    resetGoalEditor()
    setEditing(kpi)
    setForm({
      user_id: kpi.user_id, team_id: kpi.team_id ?? '', month: kpi.month,
      total_target: kpi.total_target,
      kpi_extra: kpi.kpi_extra, content_new: kpi.content_new,
      content_paast_analyzed: kpi.content_paast_analyzed, content_win_cover: kpi.content_win_cover,
      product_gmv: kpi.product_gmv, product_traffic: kpi.product_traffic,
      product_profit: kpi.product_profit,
      product_collect_test_win: kpi.product_collect_test_win,
    })
    setAllocations((kpi.allocations ?? [])
      .filter(a => a.type === 'CONTENT_LINE')
      .map(a => ({
        type: a.type,
        content_line_id: a.content_line_id ?? '',
        product_line_id: a.product_line_id ?? '',
        value: a.quantity,
      })))
    setModal('edit')
  }

  const setField = (key: keyof KpiFormState, val: number) =>
    setForm(f => ({ ...f, [key]: val }))

  const lineQty = (lineId: string) =>
    allocations.find(a => a.type === 'CONTENT_LINE' && a.content_line_id === lineId)?.value ?? 0
  const setLineQty = (lineId: string, value: number) =>
    setAllocations(prev => prev.some(a => a.type === 'CONTENT_LINE' && a.content_line_id === lineId)
      ? prev.map(a => (a.type === 'CONTENT_LINE' && a.content_line_id === lineId) ? { ...a, value } : a)
      : [...prev, { type: 'CONTENT_LINE', content_line_id: lineId, product_line_id: '', value }])
  const lineTotal = allocations
    .filter(a => a.type === 'CONTENT_LINE')
    .reduce((s, a) => s + (Number(a.value) || 0), 0)
  const lineDiff = form.total_target - lineTotal

  const handleSubmit = () => {
    if (!form.user_id)  return toast.error('Chọn editor')
    if (!form.team_id)  return toast.error('Chọn nhóm để đặt KPI')
    if (!form.month)    return toast.error('Chọn tháng')
    const contentAllocs = allocations.filter(a => a.type === 'CONTENT_LINE')
    const contentTotal  = contentAllocs.reduce((s, a) => s + (Number(a.value) || 0), 0)
    if (contentAllocs.length > 0 && contentTotal !== form.total_target)
      return toast.error(`Tuyến nội dung tổng phải bằng tổng video sản xuất (${form.total_target}), hiện ${contentTotal}`)
    const invalidGoalField = firstInvalidGoalField(goalDrafts, goalReason)
    if (invalidGoalField) {
      setShowGoalErrors(true)
      toast.error('Kiểm tra lại các đầu mục KPI/OKR bổ sung')
      requestAnimationFrame(() => document.getElementById(invalidGoalField)?.focus())
      return
    }
    upsertMut.mutate({
      body: {
        ...form,
        allocations: allocations
          .filter(a => Number(a.value) > 0)
          .map(a => ({
            type: a.type,
            content_line_id: a.content_line_id || null,
            product_line_id: null,
            quantity: Number(a.value),
          })),
      },
      goals: goalDrafts,
      reason: goalReason,
    })
  }

  const myTeamIds = new Set(myTeams.map(t => t.id))

  let visibleKpis = editorKpis ?? []
  if (isLeader) {
    // Leader: xem KPI của cả team mình quản lý
    if (teamFilter) {
      visibleKpis = visibleKpis.filter(k => k.team_id === teamFilter)
    } else if (myTeamIds.size > 0) {
      visibleKpis = visibleKpis.filter(k => k.team_id && myTeamIds.has(k.team_id))
    } else if (userId) {
      visibleKpis = visibleKpis.filter(k => k.user_id === userId)
    } else {
      visibleKpis = []
    }
  } else if (!isManagerOrAdmin) {
    // Member/Editor thường: chỉ xem KPI của chính mình, không xem của người khác trong team
    visibleKpis = userId ? visibleKpis.filter(k => k.user_id === userId) : []
    if (teamFilter) {
      visibleKpis = visibleKpis.filter(k => k.team_id === teamFilter)
    }
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
        {!isManagerOrAdmin && myTeams.length === 1 && myTeams[0] && (
          <p className="text-sm text-slate-500">
            {isLeader ? 'Đặt KPI cho editor trong team' : 'KPI editor trong team'}{' '}
            <span className="font-semibold text-slate-700">{myTeams[0].name}</span>
          </p>
        )}
        {!isManagerOrAdmin && myTeams.length > 1 && (
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="h-5 w-5" aria-hidden="true" /> Đặt KPI
            </button>
          )}
        </div>
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
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Content mới</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">SP GMV</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">KPI/OKR bổ sung</th>
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
                  goalCount={kpi.team_id ? goalCountByKpi.get(`${kpi.user_id}|${kpi.team_id}`) ?? 0 : 0}
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
        title={modal === 'create' ? 'Đặt KPI' : `Đặt KPI — ${editing?.user?.full_name ?? ''}`}
        size="2xl"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-base font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={upsertMut.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              {upsertMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ServerSearchSelect
              label="Editor *"
              value={form.user_id}
              onChange={v => setForm(f => ({ ...f, user_id: v }))}
              items={selectablePeople}
              searchValue={editorSearch}
              onSearchChange={setEditorSearch}
              placeholder={
                !form.team_id
                  ? 'Chọn nhóm trước'
                  : selectablePeople.length === 0
                    ? 'Chưa có editor hoặc leader trong nhóm này'
                    : '-- Chọn nhân sự hoặc leader --'
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
              onChange={v => setForm(f => ({ ...f, team_id: v, user_id: '' }))}
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
              onChange={v => setForm(f => ({ ...f, team_id: v, user_id: '' }))}
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
                {contentLines.length > 0 && (
                  <div className="px-4 py-2.5 bg-white">

                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="text-xs mr-3 font-semibold uppercase tracking-wide text-slate-400">Phân bổ theo tuyến nội dung</span>
                      <strong className={cn(
                        'tabular-nums',
                        lineTotal === 0 ? 'text-slate-700' : lineDiff === 0 ? 'text-emerald-600' : 'text-red-500',
                      )}>
                        {lineTotal}
                      </strong>
                      {' / '}
                      <strong className="tabular-nums text-slate-700">{form.total_target || 0}</strong>
                      {lineTotal > 0 && lineDiff !== 0 && (
                        <span className="text-red-500">{lineDiff > 0 ? ` · còn thiếu ${lineDiff}` : ` · thừa ${-lineDiff}`}</span>
                      )}
                    </p>
                  </div>
                )}
                {contentLines.map(line => (
                  <div key={line.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white">
                    <label htmlFor={`kpi-line-${line.id}`} className="text-sm text-slate-600 flex-1 leading-snug min-w-0 truncate">
                      {line.name}
                    </label>
                    <input
                      id={`kpi-line-${line.id}`}
                      type="number" min={0}
                      value={lineQty(line.id) || ''}
                      onChange={e => setLineQty(line.id, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-20 shrink-0 border border-gray-200 rounded-lg px-2 py-1 text-right font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-colors"
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

          <PerformanceGoalsEditor
            drafts={goalDrafts}
            onChange={setGoalDrafts}
            reason={goalReason}
            onReasonChange={setGoalReason}
            showErrors={showGoalErrors}
            assigneeReady={goalsAssigneeReady}
            loading={goalsLoading}
            loadError={assigneeGoals.isError}
            onRetryLoad={() => assigneeGoals.refetch()}
            focusKey={focusGoalKey}
            onAdded={setFocusGoalKey}
            teamId={formTeamId}
          />

          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
            <strong>Tổng video sản xuất</strong> được dùng làm chỉ tiêu auto-assign task hàng ngày.
            KPI sáng tạo chỉ thông báo, không tạo task tự động.
          </p>
        </div>
      </DarkModal>

      {/* Xác nhận xóa */}
      <ConfirmDialog
        open={!!deletingId}
        title="Xóa KPI"
        message="KPI cố định sẽ bị xóa vĩnh viễn; các đầu mục KPI linh hoạt của nhân sự trong tháng được lưu trữ (vẫn giữ lịch sử). OKR không bị ảnh hưởng. Bạn có chắc không?"
        confirmLabel="Xóa"
        isLoading={deleteMut.isPending}
        onConfirm={() => {
          const kpi = editorKpis?.find(k => k.id === deletingId)
          if (kpi) deleteMut.mutate(kpi)
        }}
        onCancel={() => setDeletingId(null)}
        danger
      />

      {viewingKpi && (
        <EditorKpiDetailModal kpi={viewingKpi} onClose={() => setViewingKpi(null)} />
      )}
    </div>
  )
}
