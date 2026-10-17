'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, CalendarDays, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAutoAssignSettings,
  getMemberAutoAssignSchedules,
  updateMemberAutoAssignSchedule,
} from '@/lib/api/task-auto'
import { MemberAutoAssignSchedule, TeamAutoAssignSchedules } from '@/types/task-auto'
import { ToggleSwitch } from './SettingsCard'

const WEEKDAYS = [
  { value: 1, short: 'T2', label: 'Thứ 2' },
  { value: 2, short: 'T3', label: 'Thứ 3' },
  { value: 3, short: 'T4', label: 'Thứ 4' },
  { value: 4, short: 'T5', label: 'Thứ 5' },
  { value: 5, short: 'T6', label: 'Thứ 6' },
  { value: 6, short: 'T7', label: 'Thứ 7' },
  { value: 7, short: 'CN', label: 'Chủ nhật' },
]

const QUERY_KEY = ['task-auto', 'member-auto-assign-schedules']

type ScheduleUpdate = Partial<Pick<MemberAutoAssignSchedule, 'auto_assign_enabled' | 'auto_assign_weekdays'>>

export function MemberScheduleCard() {
  const qc = useQueryClient()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())

  const { data: teams = [], isLoading } = useQuery({ queryKey: QUERY_KEY, queryFn: getMemberAutoAssignSchedules })
  const { data: settings } = useQuery({ queryKey: ['task-auto', 'auto-assign-settings'], queryFn: getAutoAssignSettings })

  const replaceMember = (memberId: string, patch: (m: MemberAutoAssignSchedule) => MemberAutoAssignSchedule) =>
    qc.setQueryData<TeamAutoAssignSchedules[]>(QUERY_KEY, (old) =>
      old?.map((t) => ({ ...t, members: t.members.map((m) => (m.id === memberId ? patch(m) : m)) })),
    )

  const togglePending = (memberId: string, on: boolean) =>
    setPending((prev) => {
      const next = new Set(prev)
      if (on) next.add(memberId)
      else next.delete(memberId)
      return next
    })

  const updateMut = useMutation({
    mutationFn: ({ memberId, body }: { memberId: string; body: ScheduleUpdate }) =>
      updateMemberAutoAssignSchedule(memberId, body),
    onMutate: async ({ memberId, body }) => {
      togglePending(memberId, true)
      await qc.cancelQueries({ queryKey: QUERY_KEY })
      const previous = qc.getQueryData<TeamAutoAssignSchedules[]>(QUERY_KEY)
      replaceMember(memberId, (m) => ({ ...m, ...body }))
      return { previous }
    },
    onSuccess: (saved) => {
      replaceMember(saved.id, () => saved)
      toast.success('Đã lưu lịch chia task', { id: 'member-auto-assign-saved' })
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEY, ctx.previous)
      toast.error('Không thể lưu lịch chia task')
    },
    onSettled: (_data, _err, { memberId }) => togglePending(memberId, false),
  })

  const team = teams.find((t) => t.id === teamId) ?? teams[0]
  const enabledCount = team?.members.filter((m) => m.auto_assign_enabled).length ?? 0

  const toggleDay = (m: MemberAutoAssignSchedule, day: number) => {
    const days = m.auto_assign_weekdays.includes(day)
      ? m.auto_assign_weekdays.filter((d) => d !== day)
      : [...m.auto_assign_weekdays, day].sort((a, b) => a - b)
    updateMut.mutate({ memberId: m.id, body: { auto_assign_weekdays: days } })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-7 sm:py-6 border-b border-gray-100">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-indigo-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-xl">Chia task tự động theo thành viên</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Bật/tắt từng người và chọn ngày được chia việc. Lượt chạy {settings?.schedule_time ?? '17:00'} chia việc cho ngày hôm sau.
            </p>
          </div>
        </div>
        {teams.length > 1 && (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Team
            <select
              value={team?.id ?? ''}
              onChange={(e) => setTeamId(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="p-4 sm:p-7 space-y-4">
        {settings && !settings.is_active && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            <span>Hệ thống tự động phân công đang tắt — chưa chia task cho ai dù thành viên đang bật.</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" aria-label="Đang tải" />
          </div>
        ) : !team ? (
          <p className="text-sm text-slate-500 py-6 text-center">Bạn chưa lead team nào.</p>
        ) : !team.members.length ? (
          <p className="text-sm text-slate-500 py-6 text-center">Team {team.name} chưa có thành viên.</p>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{enabledCount}/{team.members.length}</span> thành viên {team.name} đang bật chia task tự động
            </p>
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
              {team.members.map((m) => {
                const busy = pending.has(m.id)
                return (
                  <li key={m.id} className="flex flex-col gap-3 px-3 py-3.5 sm:px-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 lg:flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800 truncate">{m.full_name}</span>
                        {!m.is_editor && (
                          <span className="whitespace-nowrap rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                            Chưa duyệt editor — không được chia
                          </span>
                        )}
                        {busy && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" aria-label="Đang lưu" />}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                      {m.auto_assign_enabled && !m.auto_assign_weekdays.length && (
                        <p className="text-xs font-medium text-amber-700 mt-0.5">Chưa chọn ngày nào — không được chia</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <ToggleSwitch
                          checked={m.auto_assign_enabled}
                          onChange={(v) => updateMut.mutate({ memberId: m.id, body: { auto_assign_enabled: v } })}
                          disabled={busy}
                          label={`Chia task tự động cho ${m.full_name}`}
                        />
                        <span className={cn('w-8 text-sm font-medium', m.auto_assign_enabled ? 'text-indigo-700' : 'text-slate-500')}>
                          {m.auto_assign_enabled ? 'Bật' : 'Tắt'}
                        </span>
                      </div>

                      <div role="group" aria-label={`Ngày chia task cho ${m.full_name}`} className="flex flex-wrap gap-1.5 sm:gap-2">
                        {WEEKDAYS.map((d) => {
                          const on = m.auto_assign_weekdays.includes(d.value)
                          return (
                            <button
                              key={d.value}
                              type="button"
                              aria-pressed={on}
                              aria-label={d.label}
                              title={d.label}
                              disabled={busy || !m.auto_assign_enabled}
                              onClick={() => toggleDay(m, d.value)}
                              className={cn(
                                'h-9 min-w-9 sm:min-w-10 rounded-lg border px-1.5 sm:px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40',
                                on
                                  ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                                  : 'bg-white border-dashed border-gray-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600',
                              )}
                            >
                              {d.short}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
