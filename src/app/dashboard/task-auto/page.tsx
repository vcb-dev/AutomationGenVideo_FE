'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '@/lib/api/task-auto'
import {
  ListTodo, Clock, CheckCircle2, AlertTriangle,
  FileText, Users, Zap, Settings, ArrowRight, Loader2,
  Target, TrendingUp, User,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── Shared components ──────────────────────────────

function StatCard({
  label, value, icon: Icon, iconBg, sub,
}: {
  label: string; value: number | string; icon: React.ElementType; iconBg: string; sub?: string
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-4xl font-black text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

function StatusBar({ tasks }: { tasks: Record<string, number> }) {
  const statuses = [
    { key: 'pending', color: 'bg-slate-400', label: 'Chờ xử lý' },
    { key: 'assigned', color: 'bg-blue-500', label: 'Đã giao' },
    { key: 'in_progress', color: 'bg-amber-500', label: 'Đang làm' },
    { key: 'submitted', color: 'bg-purple-500', label: 'Đã nộp' },
    { key: 'approved', color: 'bg-emerald-500', label: 'Đã duyệt' },
    { key: 'rejected', color: 'bg-red-500', label: 'Từ chối' },
  ] as const
  const total = Object.values(tasks).reduce((a, b) => a + b, 0) || 1
  return (
    <div className="space-y-3">
      <div className="flex h-3 bg-gray-100 rounded-full overflow-hidden gap-0.5">
        {statuses.map(s => {
          const count = tasks[s.key] || 0
          const pct = (count / total) * 100
          if (pct < 0.5) return null
          return <div key={s.key} className={cn(s.color, 'transition-all')} style={{ width: `${pct}%` }} title={`${s.label}: ${count}`} />
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {statuses.map(s => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={cn('w-2 h-2 rounded-full', s.color)} />
            {s.label}: <strong className="text-slate-800">{tasks[s.key] || 0}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function KpiProgress({ completed, total_target }: { completed: number; total_target: number }) {
  const pct = total_target > 0 ? Math.min(100, Math.round((completed / total_target) * 100)) : 0
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-indigo-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{completed} / {total_target} task</span>
        <span className={cn('font-bold', pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-indigo-600' : 'text-amber-600')}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn(color, 'h-full rounded-full transition-all')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Global view (ADMIN / MANAGER) ─────────────────

function GlobalDashboard({ d }: { d: NonNullable<ReturnType<typeof buildGlobal>> }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Tổng task" value={d.tasks.total} icon={ListTodo} iconBg="bg-indigo-50 text-indigo-600" />
        <StatCard label="Đến hạn hôm nay" value={d.today_deadline} icon={Clock} iconBg="bg-amber-50 text-amber-600" />
        <StatCard label="Quá hạn" value={d.overdue} icon={AlertTriangle} iconBg="bg-red-50 text-red-600" />
        <StatCard label="Hoàn thành tháng" value={d.monthly_completed} icon={CheckCircle2} iconBg="bg-emerald-50 text-emerald-600" />
        <StatCard label="Content sẵn sàng" value={d.contents.available} icon={FileText} iconBg="bg-blue-50 text-blue-600" />
        <StatCard label="Editor đã duyệt" value={d.editors.approved} icon={Users} iconBg="bg-purple-50 text-purple-600" />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">Phân bố trạng thái task</h2>
          <Link href="/dashboard/task-auto/tasks" className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
            Chi tiết <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <StatusBar tasks={d.tasks as Record<string, number>} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-slate-900 text-sm">Kho Content</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Sẵn sàng', value: d.contents.available, color: 'text-emerald-600' },
              { label: 'Đang dùng', value: d.contents.in_task, color: 'text-amber-600' },
              { label: 'Đã dùng', value: d.contents.used, color: 'text-slate-500' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/task-auto/catalog" className="mt-3 block text-xs text-indigo-600 font-semibold hover:underline">Xem catalog →</Link>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-slate-900 text-sm">Editor</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Tổng', value: d.editors.total, color: 'text-slate-800' },
              { label: 'Đã duyệt', value: d.editors.approved, color: 'text-emerald-600' },
              { label: 'Chờ duyệt', value: d.editors.pending_approval, color: 'text-amber-600' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/task-auto/teams" className="mt-3 block text-xs text-indigo-600 font-semibold hover:underline">Quản lý đội nhóm →</Link>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 shadow-sm text-white">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" />
            <h3 className="font-bold text-sm">Auto Assign</h3>
          </div>
          <p className="text-indigo-100 text-xs leading-relaxed mb-4">Hệ thống tự động phân công task cho editor theo cài đặt lịch.</p>
          <Link href="/dashboard/task-auto/settings"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-colors">
            <Settings className="w-3.5 h-3.5" /> Cài đặt
          </Link>
        </div>
      </div>
    </div>
  )
}

function buildGlobal(d: any) {
  return {
    tasks: d.tasks ?? { total: 0 },
    today_deadline: d.today_deadline ?? 0,
    overdue: d.overdue ?? 0,
    monthly_completed: d.monthly_completed ?? 0,
    contents: d.contents ?? { available: 0, in_task: 0, used: 0, archived: 0 },
    editors: d.editors ?? { total: 0, approved: 0, pending_approval: 0 },
  }
}

// ── Team view (LEADER) ────────────────────────────

function TeamDashboard({ d }: { d: any }) {
  const tasks = d.tasks ?? { total: 0 }
  const members: any[] = d.members ?? []
  const kpi = d.kpi

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Tổng task team" value={tasks.total ?? 0} icon={ListTodo} iconBg="bg-indigo-50 text-indigo-600" />
        <StatCard label="Đang làm" value={tasks.in_progress ?? 0} icon={TrendingUp} iconBg="bg-amber-50 text-amber-600" />
        <StatCard label="Đã nộp" value={tasks.submitted ?? 0} icon={CheckCircle2} iconBg="bg-purple-50 text-purple-600" />
        <StatCard label="Đã duyệt" value={tasks.approved ?? 0} icon={CheckCircle2} iconBg="bg-emerald-50 text-emerald-600" />
      </div>

      {/* KPI + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Phân bố trạng thái</h2>
            <Link href="/dashboard/task-auto/tasks" className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
              Chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <StatusBar tasks={tasks as Record<string, number>} />
        </div>

        {kpi && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-indigo-500" />
              <h2 className="font-bold text-slate-900">KPI Team — {formatMonth(kpi.month)}</h2>
            </div>
            <KpiProgress completed={kpi.completed} total_target={kpi.total_target} />
            <p className="text-xs text-slate-400 mt-2">Tổng mục tiêu tháng: <strong className="text-slate-700">{kpi.total_target}</strong> task</p>
            <Link href="/dashboard/task-auto/kpi" className="mt-3 block text-xs text-indigo-600 font-semibold hover:underline">Xem KPI chi tiết →</Link>
          </div>
        )}
      </div>

      {/* Member table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h2 className="font-bold text-slate-900">Thành viên ({members.length})</h2>
          </div>
          <Link href="/dashboard/task-auto/teams" className="text-xs text-indigo-600 font-semibold hover:underline">
            Quản lý nhóm →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Thành viên</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang làm</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã nộp</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duyệt</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">KPI tháng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">Chưa có thành viên</td></tr>
              )}
              {members.map((m: any) => (
                <tr key={m.user_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                        {m.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{m.full_name}</p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn('text-sm font-semibold', m.pending > 0 ? 'text-slate-600' : 'text-slate-300')}>{m.pending}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn('text-sm font-semibold', m.in_progress > 0 ? 'text-amber-600' : 'text-slate-300')}>{m.in_progress}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn('text-sm font-semibold', m.submitted > 0 ? 'text-purple-600' : 'text-slate-300')}>{m.submitted}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn('text-sm font-semibold', m.approved > 0 ? 'text-emerald-600' : 'text-slate-300')}>{m.approved}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {m.kpi_target > 0 ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', m.approved >= m.kpi_target ? 'bg-emerald-500' : 'bg-indigo-400')}
                            style={{ width: `${Math.min(100, Math.round((m.approved / m.kpi_target) * 100))}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{m.approved}/{m.kpi_target}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Personal view (EDITOR / MEMBER) ──────────────

function PersonalDashboard({ d }: { d: any }) {
  const tasks = d.tasks ?? { total: 0 }
  const kpi = d.kpi

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Tổng task" value={tasks.total ?? 0} icon={ListTodo} iconBg="bg-indigo-50 text-indigo-600" />
        <StatCard label="Đang làm" value={tasks.in_progress ?? 0} icon={TrendingUp} iconBg="bg-amber-50 text-amber-600" />
        <StatCard label="Đã nộp" value={tasks.submitted ?? 0} icon={CheckCircle2} iconBg="bg-purple-50 text-purple-600" />
        <StatCard label="Đã duyệt" value={tasks.approved ?? 0} icon={CheckCircle2} iconBg="bg-emerald-50 text-emerald-600" />
        <StatCard label="Đến hạn hôm nay" value={d.today_deadline ?? 0} icon={Clock} iconBg="bg-blue-50 text-blue-600" />
        <StatCard label="Quá hạn" value={d.overdue ?? 0} icon={AlertTriangle} iconBg="bg-red-50 text-red-600" />
      </div>

      {/* Status bar + KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Trạng thái task của tôi</h2>
            <Link href="/dashboard/task-auto/tasks" className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <StatusBar tasks={tasks as Record<string, number>} />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-indigo-500" />
            <h2 className="font-bold text-slate-900">KPI cá nhân{kpi ? ` — ${formatMonth(kpi.month)}` : ''}</h2>
          </div>
          {kpi ? (
            <div className="space-y-4">
              <KpiProgress completed={kpi.completed} total_target={kpi.total_target} />
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: 'Ngày thường', value: kpi.kpi_day },
                  { label: 'Cuối tuần', value: kpi.kpi_weekend },
                  { label: 'Sáng tạo', value: kpi.kpi_extra },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-lg font-black text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <Target className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Chưa có KPI tháng này</p>
              <p className="text-xs mt-1">Liên hệ Leader để được đặt KPI</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `Tháng ${m}/${y}`
}

// ── Main page ─────────────────────────────────────

export default function TaskAutoDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'dashboard'],
    queryFn: getDashboard,
    refetchInterval: 30_000,
  })

  const scopeLabel = data?.scope === 'global' ? 'Toàn hệ thống'
    : data?.scope === 'team' ? (data.team ? `Team: ${data.team.name}` : 'Team của tôi')
    : 'Cá nhân'

  const scopeIcon = data?.scope === 'global' ? <Users className="w-4 h-4" />
    : data?.scope === 'team' ? <Users className="w-4 h-4" />
    : <User className="w-4 h-4" />

  return (
    <div className="space-y-8">
      {/* Header */}
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
        : data.scope === 'team' ? <TeamDashboard d={data} />
        : <PersonalDashboard d={data} />
      }
    </div>
  )
}
