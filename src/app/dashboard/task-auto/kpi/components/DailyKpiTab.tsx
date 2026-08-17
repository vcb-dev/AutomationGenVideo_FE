'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Users, Info, Save, Wand2 } from 'lucide-react'
import { CustomSelect, DarkInput, EmptyState } from '@/components/task-auto'
import { getEditorDailyKpis, upsertEditorDailyKpis, getTeams } from '@/lib/api/task-auto'
import { EditorDailyKpi } from '@/types/task-auto'
import { cn } from '@/lib/utils'

// Ngày local của trình duyệt dạng YYYY-MM-DD — không dùng toISOString vì buổi sáng VN còn là hôm trước theo UTC
const todayStr = () => new Date().toLocaleDateString('en-CA')

interface Props {
  canEdit: boolean
  isLeader?: boolean
  userId?: string
  selectedTeamId?: string
  onTeamChange?: (id: string) => void
}

export function DailyKpiTab({ canEdit, isLeader, userId, selectedTeamId, onTeamChange }: Props) {
  const qc = useQueryClient()
  const [date, setDate] = useState(todayStr())
  // user_id → target đang gõ (chưa lưu); undefined = chưa sửa, hiển thị giá trị đã lưu
  const [drafts, setDrafts] = useState<Record<string, number>>({})
  const [fillAll, setFillAll] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['task-auto', 'teams'],
    queryFn: getTeams,
  })

  // Leader chỉ set được cho team mình lead (khớp quyền BE); admin/manager chọn team bất kỳ
  const selectableTeams = isLeader
    ? (teams?.filter(t => t.leader_id === userId) ?? [])
    : (teams ?? [])

  const [teamId, setTeamId] = useState('')
  useEffect(() => {
    if (teamId && selectableTeams.some(t => t.id === teamId)) return
    const preferred = selectableTeams.find(t => t.id === selectedTeamId)
    const fallback = preferred ?? selectableTeams[0]
    if (fallback) setTeamId(fallback.id)
  }, [teamId, selectedTeamId, selectableTeams])

  // Đổi team/ngày → bỏ các chỉnh sửa dở dang, hiển thị lại số đã lưu
  useEffect(() => { setDrafts({}) }, [teamId, date])

  const { data: savedKpis, isLoading } = useQuery({
    queryKey: ['task-auto', 'editor-daily-kpis', teamId, date],
    queryFn: () => getEditorDailyKpis({ team_id: teamId, date }),
    enabled: !!teamId && !!date,
  })

  const team = teams?.find(t => t.id === teamId)
  const members = team?.members ?? []
  const savedByUser = new Map<string, EditorDailyKpi>(
    (savedKpis ?? []).map(k => [k.user_id, k]),
  )

  const valueOf = (uid: string) => drafts[uid] ?? savedByUser.get(uid)?.target ?? 0
  const hasChanges = members.some(m =>
    drafts[m.user_id] !== undefined &&
    drafts[m.user_id] !== (savedByUser.get(m.user_id)?.target ?? 0),
  )

  const saveMut = useMutation({
    mutationFn: () => upsertEditorDailyKpis({
      team_id: teamId,
      date,
      entries: members.map(m => ({ user_id: m.user_id, target: valueOf(m.user_id) })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'editor-daily-kpis'] })
      setDrafts({})
      toast.success(`Đã lưu KPI ngày ${date.split('-').reverse().join('/')}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể lưu KPI ngày'),
  })

  const handleTeamChange = (id: string) => {
    setTeamId(id)
    onTeamChange?.(id)
  }

  const applyFillAll = () => {
    const n = Math.max(0, Number(fillAll) || 0)
    setDrafts(Object.fromEntries(members.map(m => [m.user_id, n])))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 text-sm text-amber-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          KPI ngày là <strong>số video mục tiêu của từng người cho đúng ngày đã chọn</strong>. Số này thay thế
          mục tiêu tự tính từ KPI tháng khi auto-assign giao task (chạy từ chiều hôm trước), và hiển thị làm
          &quot;MT Ngày&quot; trên dashboard. Để <strong>0</strong> = không set → hệ thống dùng logic cũ.
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400 shrink-0" />
          <CustomSelect
            value={teamId}
            onChange={handleTeamChange}
            options={selectableTeams.map(t => ({ value: t.id, label: t.name }))}
            className="min-w-[200px]"
            searchable
          />
        </div>
        <DarkInput
          type="date"
          value={date}
          onChange={e => e.target.value && setDate(e.target.value)}
          className="w-44"
        />
        {canEdit && members.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="number" min={0}
              value={fillAll}
              onChange={e => setFillAll(e.target.value)}
              placeholder="Số chung"
              className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={applyFillAll}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              <Wand2 className="w-4 h-4" /> Áp cho tất cả
            </button>
          </div>
        )}
        {canEdit && (
          <button
            onClick={() => saveMut.mutate()}
            disabled={!hasChanges || saveMut.isPending}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu KPI ngày
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
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">KPI ngày</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Người đặt</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300 inline-block" />
                  </td>
                </tr>
              )}
              {!isLoading && (!teamId || members.length === 0) && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title={teamId ? 'Nhóm này chưa có thành viên' : 'Chọn nhóm để set KPI ngày'} />
                  </td>
                </tr>
              )}
              {!isLoading && members.map(m => {
                const saved = savedByUser.get(m.user_id)
                const val = valueOf(m.user_id)
                const dirty = drafts[m.user_id] !== undefined && drafts[m.user_id] !== (saved?.target ?? 0)
                return (
                  <tr key={m.user_id} className={cn(dirty && 'bg-indigo-50/40')}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-slate-800">{m.user?.full_name ?? m.user_id}</p>
                      {m.user?.email && <p className="text-xs text-slate-400">{m.user.email}</p>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canEdit ? (
                        <input
                          type="number" min={0}
                          value={val || ''}
                          onChange={e => setDrafts(d => ({
                            ...d,
                            [m.user_id]: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)),
                          }))}
                          placeholder="0"
                          className={cn(
                            'w-24 border rounded-lg px-2 py-1.5 text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                            val > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white border-gray-200 text-slate-400',
                          )}
                        />
                      ) : (
                        <span className={cn('text-sm font-bold', val > 0 ? 'text-indigo-700' : 'text-slate-300')}>
                          {val > 0 ? val : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{saved?.set_by?.full_name ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {saved?.updated_at ? new Date(saved.updated_at).toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
