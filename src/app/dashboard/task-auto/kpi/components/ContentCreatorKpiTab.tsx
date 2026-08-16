'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Users, Info, Save } from 'lucide-react'
import { CustomSelect, EmptyState } from '@/components/task-auto'
import { getTeams, getContentCreatorKpis, upsertContentCreatorKpi } from '@/lib/api/task-auto'
import { ContentCreatorKpi } from '@/types/task-auto'
import { cn } from '@/lib/utils'

interface Props {
  month: string
  canEdit: boolean
  isLeader?: boolean
  userId?: string
  selectedTeamId?: string
  onTeamChange?: (id: string) => void
}

/**
 * Chỉ đặt target tháng cho content creator (thủ công) — số liệu thực tế (content sưu tầm,
 * bản dịch, video làm ra) đã chuyển sang tab "Tổng quan" (Content Creator/Content Team leader).
 */
export function ContentCreatorKpiTab({ month, canEdit, isLeader, userId, selectedTeamId, onTeamChange }: Props) {
  const qc = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, { content_target: number; translation_target: number }>>({})

  const { data: teams } = useQuery({ queryKey: ['task-auto', 'teams'], queryFn: getTeams })
  // Content Team chuyên biệt (mọi member) HOẶC team PRODUCTION có ít nhất 1 member được đánh dấu content creator.
  const contentTeams = (teams ?? []).filter(t =>
    t.team_kind === 'CONTENT' || t.members?.some(m => m.is_content_creator),
  )
  // Leader chỉ set được cho team mình lead (khớp quyền BE); admin/manager chọn team bất kỳ
  const selectableTeams = isLeader ? contentTeams.filter(t => t.leader_id === userId) : contentTeams

  const [teamId, setTeamId] = useState('')
  useEffect(() => {
    if (teamId && selectableTeams.some(t => t.id === teamId)) return
    const preferred = selectableTeams.find(t => t.id === selectedTeamId)
    const fallback = preferred ?? selectableTeams[0]
    if (fallback) setTeamId(fallback.id)
  }, [teamId, selectedTeamId, selectableTeams])

  // Đổi team/tháng → bỏ chỉnh sửa dở dang, hiển thị lại số đã lưu
  useEffect(() => { setDrafts({}) }, [teamId, month])

  const team = teams?.find(t => t.id === teamId)
  // Content Team chuyên biệt vẫn hiển thị mọi member như cũ; team PRODUCTION chỉ hiển thị content creator.
  const members = (team?.team_kind === 'CONTENT' ? team?.members : team?.members?.filter(m => m.is_content_creator)) ?? []

  const { data: savedKpis, isLoading } = useQuery({
    queryKey: ['task-auto', 'content-creator-kpis', month],
    queryFn: () => getContentCreatorKpis(month),
    enabled: !!teamId && !!month,
  })
  const savedByUser = new Map<string, ContentCreatorKpi>(
    (savedKpis ?? []).filter(k => k.team_id === teamId).map(k => [k.user_id, k]),
  )

  const valueOf = (uid: string) => drafts[uid] ?? {
    content_target: savedByUser.get(uid)?.content_target ?? 0,
    translation_target: savedByUser.get(uid)?.translation_target ?? 0,
  }
  const isDirty = (uid: string) => {
    const d = drafts[uid]
    if (!d) return false
    const saved = savedByUser.get(uid)
    return d.content_target !== (saved?.content_target ?? 0) || d.translation_target !== (saved?.translation_target ?? 0)
  }
  const hasChanges = members.some(m => isDirty(m.user_id))

  const saveMut = useMutation({
    mutationFn: async () => {
      const dirtyMembers = members.filter(m => isDirty(m.user_id))
      await Promise.all(dirtyMembers.map(m => {
        const v = valueOf(m.user_id)
        return upsertContentCreatorKpi({
          user_id: m.user_id,
          team_id: teamId,
          month,
          content_target: v.content_target,
          translation_target: v.translation_target,
        })
      }))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'content-creator-kpis'] })
      setDrafts({})
      toast.success('Đã lưu KPI content creator')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Không thể lưu KPI'),
  })

  const handleTeamChange = (id: string) => { setTeamId(id); onTeamChange?.(id) }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 text-sm text-amber-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Đặt target tháng cho từng content creator. Số liệu thực tế (content đã thêm, bản dịch, video được làm từ
          đó) xem ở tab <strong>Tổng quan</strong>.
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400 shrink-0" />
          {selectableTeams.length > 0 ? (
            <CustomSelect
              value={teamId}
              onChange={handleTeamChange}
              options={selectableTeams.map(t => ({ value: t.id, label: t.name }))}
              className="min-w-[220px]"
              searchable
            />
          ) : (
            <span className="text-sm text-slate-400 italic">Chưa có team nào có content creator</span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => saveMut.mutate()}
            disabled={!hasChanges || saveMut.isPending}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu target tháng
          </button>
        )}
      </div>

      {!teamId ? (
        <EmptyState icon={Users} title="Chọn Content Team để đặt target" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Content Creator</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Target content</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Target bản dịch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300 inline-block" /></td></tr>
                )}
                {!isLoading && members.length === 0 && (
                  <tr><td colSpan={3}><EmptyState title="Team chưa có thành viên" /></td></tr>
                )}
                {!isLoading && members.map(m => {
                  const v = valueOf(m.user_id)
                  const dirty = isDirty(m.user_id)
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
                            value={v.content_target || ''}
                            onChange={e => setDrafts(d => ({
                              ...d,
                              [m.user_id]: { ...valueOf(m.user_id), content_target: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) },
                            }))}
                            placeholder="0"
                            className="w-24 border rounded-lg px-2 py-1.5 text-right font-bold bg-white border-gray-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-500">{v.content_target || '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {canEdit ? (
                          <input
                            type="number" min={0}
                            value={v.translation_target || ''}
                            onChange={e => setDrafts(d => ({
                              ...d,
                              [m.user_id]: { ...valueOf(m.user_id), translation_target: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) },
                            }))}
                            placeholder="0"
                            className="w-24 border rounded-lg px-2 py-1.5 text-right font-bold bg-white border-gray-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-500">{v.translation_target || '—'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
