'use client'

import { useQuery } from '@tanstack/react-query'
import { ListTodo, Users, User, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getDashboard } from '@/lib/api/task-auto'
import { GlobalDashboard, buildGlobal } from './components/GlobalDashboard'
import { TeamDashboard } from './components/TeamDashboard'
import { PersonalDashboard } from './components/PersonalDashboard'

export default function TaskAutoDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'dashboard'],
    queryFn: getDashboard,
    refetchInterval: 30_000,
  })

  const scopeLabel = data?.scope === 'global' ? 'Toàn hệ thống'
    : data?.scope === 'team' ? (data.team ? `Team: ${data.team.name}` : 'Team của tôi')
    : 'Cá nhân'

  const scopeIcon = data?.scope === 'personal'
    ? <User className="w-4 h-4" />
    : <Users className="w-4 h-4" />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 sticky">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Task Auto</h1>
          <p className="text-slate-500 text-sm mt-0.5">Hệ thống phân công và quản lý task tự động</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-semibold text-slate-600">
              {scopeIcon}
              {scopeLabel}
            </div>
          )}
          <Link
            href="/dashboard/task-auto/tasks"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <ListTodo className="w-4 h-4" />
            Xem tất cả task
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : !data ? null
        : data.scope === 'global' ? <GlobalDashboard d={buildGlobal(data)} />
        : data.scope === 'team'   ? <TeamDashboard d={data} />
        : <PersonalDashboard d={data} />
      }
    </div>
  )
}
