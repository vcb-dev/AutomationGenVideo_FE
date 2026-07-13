'use client'

import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import {
  ListTodo, Clock, AlertTriangle, CheckCircle2, XCircle, Send,
  CalendarCheck2, FileText, Users, UserCheck, BarChart3, UserPlus, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DashboardCard, MetricStat } from './DashboardUI'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlobalData {
  tasks:             Record<string, number> & { total: number }
  today_deadline:    number
  overdue:           number
  monthly_completed: number
  contents:          { available: number; in_task: number; used: number; archived: number }
  editors:           { total: number; approved: number; pending_approval: number }
}

export function buildGlobal(d: any): GlobalData {
  return {
    tasks:             d.tasks             ?? { total: 0 },
    today_deadline:    d.today_deadline    ?? 0,
    overdue:           d.overdue           ?? 0,
    monthly_completed: d.monthly_completed ?? 0,
    contents:          d.contents          ?? { available: 0, in_task: 0, used: 0, archived: 0 },
    editors:           d.editors           ?? { total: 0, approved: 0, pending_approval: 0 },
  }
}

// ─── STATUS config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = [
  { key: 'pending',     label: 'Chờ xử lý', color: '#94a3b8' },
  { key: 'assigned',    label: 'Đã giao',    color: '#3b82f6' },
  { key: 'in_progress', label: 'Đang làm',   color: '#f59e0b' },
  { key: 'submitted',   label: 'Đã nộp',     color: '#8b5cf6' },
  { key: 'approved',    label: 'Đã duyệt',   color: '#10b981' },
  { key: 'rejected',    label: 'Từ chối',    color: '#ef4444' },
] as const

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function TaskTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/10">
      <p className="text-xs font-semibold text-slate-800">{d.name}</p>
      <p className="text-xs text-slate-500">{d.value} task · {d.payload.pct}%</p>
    </div>
  )
}

// ─── System Performance Summary ───────────────────────────────────────────────

function SystemPerformanceSummary({ tasks, today_deadline, overdue, monthly_completed }: {
  tasks: GlobalData['tasks']
  today_deadline: number
  overdue: number
  monthly_completed: number
}) {
  const total          = tasks.total ?? 0
  const cancelled      = tasks.cancelled ?? 0
  const approved       = tasks.approved ?? 0
  const submitted      = tasks.submitted ?? 0
  const rejected       = tasks.rejected ?? 0
  const effective      = total - cancelled
  const completionRate = effective > 0 ? Math.round((approved / effective) * 100) : 0
  const rejectionRate  = effective > 0 ? Math.round((rejected / effective) * 100) : 0

  return (
    <DashboardCard
      icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-50"
      title="Hiệu suất hệ thống"
      right={<span className="text-xs font-medium text-slate-400">Tổng toàn thời gian</span>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-slate-100 sm:divide-y-0">
        <MetricStat
          icon={CheckCircle2} label="Tỷ lệ hoàn thành" value={`${completionRate}%`}
          sub={`${approved}/${effective} task`}
          tone={completionRate >= 70 ? 'emerald' : completionRate >= 40 ? 'amber' : 'red'}
        />
        <MetricStat
          icon={AlertTriangle} label="Quá hạn" value={overdue} sub="task"
          tone="red" active={overdue > 0}
        />
        <MetricStat
          icon={Clock} label="Đến hạn hôm nay" value={today_deadline} sub="task"
          tone="amber" active={today_deadline > 0}
        />
        <MetricStat
          icon={Send} label="Chờ duyệt" value={submitted} sub="đã nộp"
          tone="violet" active={submitted > 0}
        />
        <MetricStat
          icon={CalendarCheck2} label="Hoàn thành tháng" value={monthly_completed} sub="task đã duyệt"
          tone="emerald"
        />
        <MetricStat
          icon={XCircle} label="Tỷ lệ từ chối" value={`${rejectionRate}%`} sub={`${rejected} task`}
          tone={rejectionRate > 20 ? 'red' : rejectionRate > 10 ? 'amber' : 'slate'}
          active={rejectionRate > 10}
        />
      </div>

      <div className="px-5 pb-4 pt-1">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700',
              completionRate >= 70 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-amber-400' : 'bg-red-400',
            )}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </DashboardCard>
  )
}

// ─── Content Inventory Card ───────────────────────────────────────────────────

function ContentInventoryCard({ contents }: { contents: GlobalData['contents'] }) {
  const total = (contents.available + contents.in_task + contents.used + contents.archived) || 1

  const rows = [
    { label: 'Sẵn sàng',    value: contents.available, color: 'bg-emerald-500', text: 'text-emerald-700' },
    { label: 'Đang dùng',   value: contents.in_task,   color: 'bg-amber-400',   text: 'text-amber-700' },
    { label: 'Đã dùng',     value: contents.used,      color: 'bg-blue-400',    text: 'text-blue-700' },
    { label: 'Lưu trữ',     value: contents.archived,  color: 'bg-slate-300',   text: 'text-slate-500' },
  ]

  return (
    <DashboardCard
      icon={FileText} iconColor="text-emerald-600" iconBg="bg-emerald-50"
      title="Kho nội dung" subtitle="Content scripts"
      right={<span className="text-2xl font-black text-slate-700 tracking-tight">{total - contents.archived}</span>}
      className="flex flex-col"
    >
      <div className="px-5 py-4 space-y-3 flex-1">
        {rows.map(r => {
          const pct = Math.round((r.value / total) * 100)
          return (
            <div key={r.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{r.label}</span>
                <span className={cn('text-sm font-bold tabular-nums', r.text)}>{r.value}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all duration-500', r.color)}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Availability highlight */}
      <div className="mx-4 mb-4 flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-2.5">
        <span className="text-xs font-semibold text-emerald-700">Tỷ lệ có sẵn</span>
        <span className="text-base font-black text-emerald-600 tracking-tight">
          {Math.round((contents.available / total) * 100)}%
        </span>
      </div>
    </DashboardCard>
  )
}

// ─── Editor Pipeline Card ─────────────────────────────────────────────────────

function EditorPipelineCard({ editors }: { editors: GlobalData['editors'] }) {
  return (
    <DashboardCard
      icon={Users} iconColor="text-indigo-600" iconBg="bg-indigo-50"
      title="Editor" subtitle="Tài khoản hệ thống"
      right={<span className="text-2xl font-black text-slate-700 tracking-tight">{editors.total}</span>}
      className="flex flex-col"
    >
      <div className="px-5 py-4 space-y-3 flex-1">
        {/* Approved editors */}
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-700 font-semibold">Đã phê duyệt</p>
            <p className="text-xs text-emerald-500">editor đang hoạt động</p>
          </div>
          <span className="text-xl font-black text-emerald-600 tracking-tight">{editors.approved}</span>
        </div>

        {/* Pending approval */}
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-xl',
          editors.pending_approval > 0 ? 'bg-amber-50' : 'bg-slate-50',
        )}>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            editors.pending_approval > 0 ? 'bg-amber-100' : 'bg-slate-100',
          )}>
            <UserPlus className={cn('w-4 h-4', editors.pending_approval > 0 ? 'text-amber-600' : 'text-slate-400')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-semibold', editors.pending_approval > 0 ? 'text-amber-700' : 'text-slate-500')}>
              Chờ phê duyệt
            </p>
            <p className={cn('text-xs', editors.pending_approval > 0 ? 'text-amber-500' : 'text-slate-400')}>
              {editors.pending_approval > 0 ? 'Cần xem xét và phê duyệt' : 'Không có yêu cầu nào'}
            </p>
          </div>
          <span className={cn('text-xl font-black tracking-tight', editors.pending_approval > 0 ? 'text-amber-600' : 'text-slate-300')}>
            {editors.pending_approval}
          </span>
        </div>
      </div>

      {editors.pending_approval > 0 && (
        <div className="px-4 pb-4">
          <Link href="/dashboard/task-auto/teams"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-amber-500/20">
            Xem yêu cầu phê duyệt <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </DashboardCard>
  )
}

// ─── GlobalDashboard ──────────────────────────────────────────────────────────

export function GlobalDashboard({ d }: { d: GlobalData }) {
  const tasks = d.tasks
  const total = tasks.total || 1

  const taskChartData = STATUS_CONFIG
    .map(s => ({
      name:  s.label,
      value: tasks[s.key] ?? 0,
      fill:  s.color,
      color: s.color,
      pct:   Math.round(((tasks[s.key] ?? 0) / total) * 100),
    }))
    .filter(item => item.value > 0)

  return (
    <div className="space-y-5">

      {/* ── System performance ── */}
      <SystemPerformanceSummary
        tasks={tasks}
        today_deadline={d.today_deadline}
        overdue={d.overdue}
        monthly_completed={d.monthly_completed}
      />

      {/* ── 3-col: Task donut | Content | Editor ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Task distribution */}
        <DashboardCard
          icon={ListTodo} iconColor="text-indigo-600" iconBg="bg-indigo-50"
          title="Phân bố task"
          action={{ href: '/dashboard/task-auto/tasks', label: 'Xem tất cả' }}
        >
          <div className="p-5">
            {taskChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <ListTodo className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Chưa có task nào</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                {/* Donut */}
                <div className="relative w-44 h-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskChartData}
                        cx="50%" cy="50%"
                        innerRadius={54} outerRadius={80}
                        paddingAngle={2} dataKey="value"
                        strokeWidth={0} startAngle={90} endAngle={-270}
                      />
                      <Tooltip content={<TaskTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{tasks.total}</p>
                    <p className="text-xs text-slate-400">tasks</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="w-full grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {STATUS_CONFIG.map(s => {
                    const count = tasks[s.key] ?? 0
                    const pct   = tasks.total > 0 ? Math.round((count / tasks.total) * 100) : 0
                    return (
                      <div key={s.key} className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: s.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-1 mb-1">
                            <span className="text-xs text-slate-500 truncate">{s.label}</span>
                            <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color: count > 0 ? s.color : '#cbd5e1' }}>
                              {count}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: s.color }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Urgent alerts */}
                {(d.overdue > 0 || d.today_deadline > 0) && (
                  <div className="w-full space-y-1.5">
                    {d.overdue > 0 && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="text-xs text-red-600 font-semibold">{d.overdue} task đang quá hạn</span>
                      </div>
                    )}
                    {d.today_deadline > 0 && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-700 font-semibold">{d.today_deadline} task đến hạn hôm nay</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Content inventory */}
        <ContentInventoryCard contents={d.contents} />

        {/* Editor pipeline */}
        <EditorPipelineCard editors={d.editors} />

      </div>

    </div>
  )
}
