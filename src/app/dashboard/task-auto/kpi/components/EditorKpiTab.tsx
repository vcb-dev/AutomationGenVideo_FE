'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Loader2, Users, CalendarDays } from 'lucide-react'
import { DarkModal, DarkInput, DarkSelect, EmptyState, CustomSelect } from '@/components/task-auto'
import {
  getEditorKpis, createEditorKpi, updateEditorKpi,
  getApprovals, getTeams,
  getEditorWeekendKpis, upsertEditorWeekendKpi, deleteEditorWeekendKpi,
} from '@/lib/api/task-auto'
import type { EditorKpi, EditorWeekendKpi } from '@/types/task-auto'

// ── Helpers ──────────────────────────────────────────────────────────────────

function LoadingRows({ cols }: { cols: number }) {
  return <>
    {Array.from({ length: 4 }).map((_, i) => (
      <tr key={i}>{Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
      ))}</tr>
    ))}
  </>
}

function getSundaysInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  const sundays: string[] = []
  const d = new Date(y, m - 1, 1)
  while (d.getMonth() === m - 1) {
    if (d.getDay() === 0) sundays.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return sundays
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `CN ${d}/${m}/${y}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  month: string
  onMonthChange: (v: string) => void
  canEdit: boolean
  isLeader?: boolean
  userId?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditorKpiTab({ month, canEdit, isLeader, userId }: Props) {
  const qc = useQueryClient()

  // ── Monthly KPI state ──────────────────────────────────────────────────────
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [editing, setEditing] = useState<EditorKpi | null>(null)
  const [form, setForm] = useState({ user_id: '', month, kpi_auto: 0, kpi_extra: 0 })
  const [teamFilter, setTeamFilter] = useState('')

  // ── Sunday KPI state ───────────────────────────────────────────────────────
  const [sundayModal, setSundayModal] = useState<null | 'create' | 'edit'>(null)
  const [sundayEditing, setSundayEditing] = useState<EditorWeekendKpi | null>(null)
  const [sundayForm, setSundayForm] = useState({ user_id: '', date: '', kpi: 0 })

  const isManagerOrAdmin = canEdit && !isLeader

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: editorKpis, isLoading } = useQuery({
    queryKey: ['task-auto', 'editor-kpis', month],
    queryFn: () => getEditorKpis(month),
  })

  const { data: weekendKpis, isLoading: weekendLoading } = useQuery({
    queryKey: ['task-auto', 'editor-weekend-kpis', month],
    queryFn: () => getEditorWeekendKpis(month),
  })

  const { data: approvedEditors } = useQuery({
    queryKey: ['task-auto', 'approvals', 'APPROVED'],
    queryFn: () => getApprovals('APPROVED'),
    enabled: modal !== null || sundayModal !== null,
  })

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
    enabled: isManagerOrAdmin || (!!isLeader && (modal !== null || sundayModal !== null)),
  })

  const leaderTeam = isLeader && userId ? teams?.find(t => t.leader_id === userId) : undefined
  const leaderTeamMemberIds = new Set(leaderTeam?.members?.map(m => m.user_id) ?? [])

  const filteredTeamMemberIds = teamFilter
    ? new Set(teams?.find(t => t.id === teamFilter)?.members?.map(m => m.user_id) ?? [])
    : null

  const allApproved = approvedEditors ?? []
  const selectableEditors = isLeader
    ? allApproved.filter(a => leaderTeamMemberIds.has(a.user_id))
    : allApproved

  // ── Monthly KPI mutations ──────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: createEditorKpi,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'editor-kpis'] }); toast.success('Đã thêm KPI editor'); setModal(null) },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể thêm KPI editor'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<EditorKpi> }) => updateEditorKpi(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'editor-kpis'] }); toast.success('Đã cập nhật KPI editor'); setModal(null) },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể cập nhật KPI editor'),
  })

  const openCreate = () => { setForm({ user_id: '', month, kpi_auto: 0, kpi_extra: 0 }); setEditing(null); setModal('create') }
  const openEdit = (kpi: EditorKpi) => { setForm({ user_id: kpi.user_id, month: kpi.month, kpi_auto: kpi.total_target, kpi_extra: kpi.kpi_extra }); setEditing(kpi); setModal('edit') }
  const handleSubmit = () => {
    if (!form.user_id) return toast.error('Chọn editor')
    const body = { user_id: form.user_id, month: form.month, kpi_auto: form.kpi_auto, kpi_extra: form.kpi_extra }
    if (modal === 'create') createMut.mutate(body as any)
    else if (editing) updateMut.mutate({ id: editing.id, body: body as any })
  }
  const saving = createMut.isPending || updateMut.isPending

  // ── Sunday KPI mutations ───────────────────────────────────────────────────
  const upsertSundayMut = useMutation({
    mutationFn: upsertEditorWeekendKpi,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'editor-weekend-kpis'] }); toast.success(sundayModal === 'create' ? 'Đã thêm KPI Chủ nhật' : 'Đã cập nhật KPI Chủ nhật'); setSundayModal(null) },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể lưu KPI Chủ nhật'),
  })
  const deleteSundayMut = useMutation({
    mutationFn: deleteEditorWeekendKpi,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-auto', 'editor-weekend-kpis'] }); toast.success('Đã xoá KPI Chủ nhật') },
    onError: () => toast.error('Không thể xoá KPI Chủ nhật'),
  })

  const openSundayCreate = () => {
    const sundays = getSundaysInMonth(month)
    setSundayForm({ user_id: '', date: sundays[0] ?? '', kpi: 0 })
    setSundayEditing(null)
    setSundayModal('create')
  }
  const openSundayEdit = (k: EditorWeekendKpi) => {
    setSundayForm({ user_id: k.user_id, date: k.date, kpi: k.kpi })
    setSundayEditing(k)
    setSundayModal('edit')
  }
  const handleSundaySubmit = () => {
    if (!sundayForm.user_id) return toast.error('Chọn editor')
    if (!sundayForm.date) return toast.error('Chọn ngày Chủ nhật')
    upsertSundayMut.mutate(sundayForm)
  }
  const savingSunday = upsertSundayMut.isPending

  // ── Display helpers ────────────────────────────────────────────────────────
  const formatMonth = (yyyymm: string) => { const [y, m] = yyyymm.split('-'); return `Tháng ${m}/${y}` }
  const colCount = 5 + (isManagerOrAdmin ? 1 : 0) + (canEdit ? 1 : 0)
  const sundayColCount = 4 + (canEdit ? 1 : 0)
  const sundays = getSundaysInMonth(month)

  let visibleKpis = editorKpis ?? []
  if (isLeader && leaderTeamMemberIds.size > 0) {
    visibleKpis = visibleKpis.filter(k => leaderTeamMemberIds.has(k.user_id))
  } else if (filteredTeamMemberIds) {
    visibleKpis = visibleKpis.filter(k => filteredTeamMemberIds.has(k.user_id))
  }

  let visibleWeekendKpis = weekendKpis ?? []
  if (isLeader && leaderTeamMemberIds.size > 0) {
    visibleWeekendKpis = visibleWeekendKpis.filter(k => leaderTeamMemberIds.has(k.user_id))
  } else if (filteredTeamMemberIds) {
    visibleWeekendKpis = visibleWeekendKpis.filter(k => filteredTeamMemberIds.has(k.user_id))
  }

  const userTeamMap = new Map<string, string>()
  teams?.forEach(t => t.members?.forEach(m => userTeamMap.set(m.user_id, t.name)))

  return (
    <div className="space-y-8">

      {/* ══════════════════ PHẦN 1: KPI THÁNG ══════════════════ */}
      <div>
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {isManagerOrAdmin && (
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400 shrink-0" />
              <CustomSelect
                value={teamFilter}
                onChange={setTeamFilter}
                options={[
                  { value: '', label: 'Tất cả nhóm' },
                  ...(teams?.map(t => ({ value: t.id, label: t.name })) ?? []),
                ]}
                className="min-w-[210px]"
                searchable
              />
            </div>
          )}
          {isLeader && leaderTeam && (
            <p className="text-base text-slate-500">
              Đặt KPI cho editor trong team <span className="font-semibold text-slate-700">{leaderTeam.name}</span>
            </p>
          )}
          {canEdit && (
            <div className="ml-auto">
              <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold transition-colors">
                <Plus className="w-5 h-5" /> Thêm KPI Editor
              </button>
            </div>
          )}
        </div>

        {/* ── Bảng KPI tháng ── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Editor</th>
                  {isManagerOrAdmin && <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nhóm</th>}
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tháng</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">KPI Auto/tháng</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">KPI Sáng tạo/tháng</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Người đặt</th>
                  {canEdit && <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hành động</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && <LoadingRows cols={colCount} />}
                {!isLoading && visibleKpis.length === 0 && (
                  <tr><td colSpan={colCount}><EmptyState title={`Không có KPI editor nào${teamFilter ? ' trong nhóm này' : ''} tháng ${formatMonth(month)}`} /></td></tr>
                )}
                {visibleKpis.map(kpi => (
                  <tr key={kpi.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 text-sm">{kpi.user?.full_name ?? '-'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{kpi.user?.email ?? ''}</p>
                    </td>
                    {isManagerOrAdmin && (
                      <td className="px-5 py-4 whitespace-nowrap">
                        {userTeamMap.get(kpi.user_id) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            <Users className="w-3 h-3" />{userTeamMap.get(kpi.user_id)}
                          </span>
                        ) : <span className="text-sm text-slate-400 italic">—</span>}
                      </td>
                    )}
                    <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{formatMonth(kpi.month)}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="font-bold text-indigo-600 text-base">{kpi.total_target}</span>
                      <span className="text-xs text-slate-400 ml-1">task</span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="font-semibold text-amber-600 text-base">{kpi.kpi_extra}</span>
                      <span className="text-xs text-slate-400 ml-1">task</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{kpi.set_by?.full_name ?? '-'}</td>
                    {canEdit && (
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(kpi)} className="p-2 rounded-xl hover:bg-indigo-50 text-indigo-600 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════ PHẦN 2: KPI CHỦ NHẬT ══════════════════ */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-violet-500" />
            <h3 className="text-base font-bold text-slate-800">
              KPI Chủ nhật — {formatMonth(month)}
            </h3>
            <span className="text-xs text-slate-400">
              ({sundays.length} Chủ nhật: {sundays.map(formatDate).join(', ')})
            </span>
          </div>
          {canEdit && (
            <div className="ml-auto">
              <button onClick={openSundayCreate} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 py-3 text-base font-semibold transition-colors">
                <Plus className="w-5 h-5" /> Thêm KPI Chủ nhật
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Editor</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Chủ nhật</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">KPI ngày đó</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Người đặt</th>
                  {canEdit && <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hành động</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weekendLoading && <LoadingRows cols={sundayColCount} />}
                {!weekendLoading && visibleWeekendKpis.length === 0 && (
                  <tr><td colSpan={sundayColCount}><EmptyState title={`Chưa có KPI Chủ nhật nào${teamFilter ? ' trong nhóm này' : ''} tháng ${formatMonth(month)}`} /></td></tr>
                )}
                {visibleWeekendKpis.map(k => (
                  <tr key={k.id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 text-sm">{k.user?.full_name ?? '-'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{k.user?.email ?? ''}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">
                        <CalendarDays className="w-3 h-3" />{formatDate(k.date)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="font-bold text-violet-600 text-base">{k.kpi}</span>
                      <span className="text-xs text-slate-400 ml-1">task</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{k.set_by?.full_name ?? '-'}</td>
                    {canEdit && (
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openSundayEdit(k)} className="p-2 rounded-xl hover:bg-violet-50 text-violet-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Xoá KPI Chủ nhật của ${k.user?.full_name} ngày ${formatDate(k.date)}?`)) deleteSundayMut.mutate(k.id) }}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══ Modal thêm/sửa KPI tháng ══ */}
      <DarkModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Thêm KPI Editor' : 'Chỉnh sửa KPI Editor'}
        size="lg"
        footer={<>
          <button onClick={() => setModal(null)} className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-3 text-base font-semibold transition-colors">Hủy</button>
          <button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {modal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
          </button>
        </>}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <DarkSelect label="Editor *" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
                <option value="">-- Chọn editor --</option>
                {selectableEditors.length === 0 && <option disabled>{isLeader ? 'Chưa có editor trong team' : 'Chưa có editor được phê duyệt'}</option>}
                {selectableEditors.map(a => (
                  <option key={a.user_id} value={a.user_id}>{a.user?.full_name ?? a.user_id} ({a.user?.email ?? ''})</option>
                ))}
              </DarkSelect>
              {selectableEditors.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">{isLeader ? 'Cần gán Editor cho thành viên trong tab Nhóm của tôi trước.' : 'Cần phê duyệt Editor trước khi đặt KPI.'}</p>
              )}
            </div>
            <DarkInput label="Tháng *" type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <DarkInput label="KPI Auto / tháng" type="number" min={0} value={form.kpi_auto} onChange={e => setForm(f => ({ ...f, kpi_auto: Number(e.target.value) }))} />
              <p className="text-xs text-slate-400 mt-1">Hệ thống sẽ tự tạo task mỗi ngày theo tỉ lệ này</p>
            </div>
            <div>
              <DarkInput label="KPI Sáng tạo / tháng" type="number" min={0} value={form.kpi_extra} onChange={e => setForm(f => ({ ...f, kpi_extra: Number(e.target.value) }))} />
              <p className="text-xs text-slate-400 mt-1">Chỉ thông báo mỗi ngày, không tạo task</p>
            </div>
          </div>
        </div>
      </DarkModal>

      {/* ══ Modal thêm/sửa KPI Chủ nhật ══ */}
      <DarkModal
        open={sundayModal !== null}
        onClose={() => setSundayModal(null)}
        title={sundayModal === 'create' ? 'Thêm KPI Chủ nhật' : 'Chỉnh sửa KPI Chủ nhật'}
        size="md"
        footer={<>
          <button onClick={() => setSundayModal(null)} className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-3 text-base font-semibold transition-colors">Hủy</button>
          <button onClick={handleSundaySubmit} disabled={savingSunday} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 py-3 text-base font-semibold flex items-center gap-2 transition-colors disabled:opacity-60">
            {savingSunday && <Loader2 className="w-4 h-4 animate-spin" />}
            {sundayModal === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
          </button>
        </>}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <DarkSelect label="Editor *" value={sundayForm.user_id} onChange={e => setSundayForm(f => ({ ...f, user_id: e.target.value }))}>
                <option value="">-- Chọn editor --</option>
                {selectableEditors.length === 0 && <option disabled>{isLeader ? 'Chưa có editor trong team' : 'Chưa có editor được phê duyệt'}</option>}
                {selectableEditors.map(a => (
                  <option key={a.user_id} value={a.user_id}>{a.user?.full_name ?? a.user_id}</option>
                ))}
              </DarkSelect>
            </div>
            <div>
              <DarkSelect label="Chủ nhật *" value={sundayForm.date} onChange={e => setSundayForm(f => ({ ...f, date: e.target.value }))}>
                <option value="">-- Chọn ngày --</option>
                {sundays.map(s => <option key={s} value={s}>{formatDate(s)}</option>)}
              </DarkSelect>
            </div>
          </div>
          <div>
            <DarkInput
              label="KPI ngày đó"
              type="number"
              min={0}
              value={sundayForm.kpi}
              onChange={e => setSundayForm(f => ({ ...f, kpi: Number(e.target.value) }))}
            />
            <p className="text-xs text-slate-400 mt-1">Số task giao riêng cho Chủ nhật này — trừ vào tổng KPI tháng như bình thường</p>
          </div>
        </div>
      </DarkModal>
    </div>
  )
}
