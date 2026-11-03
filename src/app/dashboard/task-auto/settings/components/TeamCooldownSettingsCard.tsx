'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Save, TimerReset } from 'lucide-react'
import { getTeamAutoAssignSettings, updateTeamAutoAssignSetting } from '@/lib/api/task-auto'
import type { TeamAutoAssignSetting } from '@/types/task-auto'

const QUERY_KEY = ['task-auto', 'team-auto-assign-settings']

export function TeamCooldownSettingsCard() {
  const qc = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, number>>({})
  const { data: teams = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getTeamAutoAssignSettings,
  })

  useEffect(() => {
    setDrafts(Object.fromEntries(teams.map((team) => [team.team_id, team.cooldown_days])))
  }, [teams])

  const updateMut = useMutation({
    mutationFn: ({ teamId, days }: { teamId: string; days: number }) =>
      updateTeamAutoAssignSetting(teamId, days),
    onSuccess: (saved) => {
      qc.setQueryData<TeamAutoAssignSetting[]>(QUERY_KEY, (old) =>
        old?.map((team) => team.team_id === saved.team_id ? { ...team, ...saved } : team),
      )
      toast.success(`Đã lưu giãn cách cho ${saved.team_name}`)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể lưu giãn cách của team')
    },
  })

  return (
    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm">
      <div className="flex items-center gap-4 px-4 py-5 sm:px-7 sm:py-6 border-b border-gray-100">
        <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center">
          <TimerReset className="w-6 h-6 text-indigo-600" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-xl">Giãn cách sản phẩm theo team</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Số ngày phải chờ trước khi giao lại cùng sản phẩm cho cùng một editor.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" aria-label="Đang tải" />
          </div>
        ) : teams.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Bạn chưa quản lý team nào.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
            {teams.map((team) => {
              const days = drafts[team.team_id] ?? team.cooldown_days
              const busy = updateMut.isPending && updateMut.variables?.teamId === team.team_id
              const changed = days !== team.cooldown_days
              return (
                <li key={team.team_id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{team.team_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {days === 0 ? 'Không áp dụng giãn cách' : `Có thể giao lại khi đủ ${days} ngày lịch`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`cooldown-${team.team_id}`} className="text-sm font-medium text-slate-600">
                      Số ngày
                    </label>
                    <input
                      id={`cooldown-${team.team_id}`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={days}
                      onChange={(event) => setDrafts((old) => ({
                        ...old,
                        [team.team_id]: Math.max(0, Math.trunc(Number(event.target.value) || 0)),
                      }))}
                      className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-right text-sm tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={!changed || busy}
                      onClick={() => updateMut.mutate({ teamId: team.team_id, days })}
                      className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Lưu
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
