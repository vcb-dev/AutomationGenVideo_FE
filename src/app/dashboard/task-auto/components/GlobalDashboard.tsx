'use client'

import Link from 'next/link'
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import {
  ListTodo, Clock, AlertTriangle, CheckCircle2, XCircle, Send,
  CalendarCheck2, BarChart3, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardCard, MetricStat, PeriodBadge, LiveDot } from './DashboardUI'
import { VideoByLineCard } from './VideoByLineCard'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlobalData {
  tasks:             Record<string, number> & { total: number }
  today_deadline:    number
  overdue:           number
  monthly_completed: number
  video_by_line:     { line: string; count: number }[]
}

export function buildGlobal(d: any): GlobalData {
  return {
    tasks:             d.tasks             ?? { total: 0 },
    today_deadline:    d.today_deadline    ?? 0,
    overdue:           d.overdue           ?? 0,
    monthly_completed: d.monthly_completed ?? 0,
    video_by_line:     d.video_by_line     ?? [],
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

// ─── Live Alerts ────────────────────────────────────────────────────────────
// "Quá hạn" / "Đến hạn hôm nay" luôn tính theo THỜI ĐIỂM HIỆN TẠI ở BE (getGlobalDashboard),
// không phụ thuộc bộ lọc ngày của trang — cố tình đặt tách khỏi card "Hiệu suất hệ thống"
// (vốn có PeriodBadge theo bộ lọc) để không gây hiểu lầm 2 số này cũng đổi theo bộ lọc.

function AlertTile({ href, icon: Icon, label, value, tone }: {
  href: string; icon: typeof AlertTriangle; label: string; value: number
  tone: 'red' | 'amber'
}) {
  const styles = tone === 'red'
    ? { bg: 'bg-white hover:bg-red-50/60 border-red-100', iconBg: 'bg-red-100 text-red-600', valueCls: 'text-red-600' }
    : { bg: 'bg-white hover:bg-amber-50/60 border-amber-100', iconBg: 'bg-amber-100 text-amber-600', valueCls: 'text-amber-600' }
  return (
    <Link
      href={href}
      className={cn('group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors', styles.bg)}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', styles.iconBg)}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-xl font-black leading-none tabular-nums', styles.valueCls)}>{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
    </Link>
  )
}

function LiveAlertsBar({ overdue, todayDeadline }: { overdue: number; todayDeadline: number }) {
  const hasAlerts = overdue > 0 || todayDeadline > 0

  return (
    <div className={cn(
      'rounded-2xl border px-5 py-4',
      hasAlerts ? 'border-red-100 bg-gradient-to-r from-red-50/70 via-amber-50/30 to-white' : 'border-slate-200/70 bg-white',
    )}>
      <div className="flex items-center gap-2 mb-3">
        {hasAlerts ? <LiveDot /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
        <p className={cn('text-xs font-bold uppercase tracking-wide', hasAlerts ? 'text-red-700' : 'text-slate-500')}>
          {hasAlerts ? 'Cảnh báo trực tiếp' : 'Không có cảnh báo'}
        </p>
        <span className="text-xs text-slate-400 font-medium">· tính đến hiện tại, không theo bộ lọc ngày</span>
      </div>

      {hasAlerts ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {overdue > 0 && (
            <AlertTile href="/dashboard/task-auto/tasks" icon={AlertTriangle} label="Task đang quá hạn" value={overdue} tone="red" />
          )}
          {todayDeadline > 0 && (
            <AlertTile href="/dashboard/task-auto/tasks" icon={Clock} label="Task đến hạn hôm nay" value={todayDeadline} tone="amber" />
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Mọi task đang trong hạn — không có task quá hạn hoặc đến hạn hôm nay.</p>
      )}
    </div>
  )
}

// ─── System Performance Summary ───────────────────────────────────────────────

function SystemPerformanceSummary({ tasks, monthly_completed, periodLabel }: {
  tasks: GlobalData['tasks']
  monthly_completed: number
  periodLabel: string
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
      subtitle="Cùng cách lọc ngày với tab Nhiệm vụ — theo hạn chót, trừ task quá hạn"
      right={<PeriodBadge label={periodLabel} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-slate-100 sm:divide-y-0">
        <MetricStat
          icon={CheckCircle2} label="Tỷ lệ hoàn thành" value={`${completionRate}%`}
          sub={`${approved}/${effective} task`}
          tone={completionRate >= 70 ? 'emerald' : completionRate >= 40 ? 'amber' : 'red'}
          title="Trong số task hiển thị trong kỳ đang chọn (khớp tab Nhiệm vụ), bao nhiêu % đã Đã duyệt"
        />
        <MetricStat
          icon={Send} label="Chờ duyệt" value={submitted} sub="đã nộp"
          tone="violet" active={submitted > 0}
          title="Task trong kỳ đang chọn, hiện đang ở trạng thái Đã nộp (chờ duyệt) — khớp cột 'Đã nộp' ở tab Nhiệm vụ"
        />
        <MetricStat
          icon={CalendarCheck2} label="Hoàn thành trong kỳ" value={monthly_completed} sub="task đã duyệt"
          tone="emerald"
          title="Task Đã duyệt trong kỳ đang chọn — khớp đúng cột 'Đã duyệt' ở tab Nhiệm vụ (Kanban)"
        />
        <MetricStat
          icon={XCircle} label="Tỷ lệ từ chối" value={`${rejectionRate}%`} sub={`${rejected} task`}
          tone={rejectionRate > 20 ? 'red' : rejectionRate > 10 ? 'amber' : 'slate'}
          active={rejectionRate > 10}
          title="Trong số task hiển thị trong kỳ đang chọn (khớp tab Nhiệm vụ), bao nhiêu % bị Từ chối"
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

// ─── GlobalDashboard ──────────────────────────────────────────────────────────

export function GlobalDashboard({ d, periodLabel }: { d: GlobalData; periodLabel: string }) {
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

      {/* ── Live alerts — luôn "hiện tại", tách khỏi số liệu theo bộ lọc ngày bên dưới ── */}
      <LiveAlertsBar overdue={d.overdue} todayDeadline={d.today_deadline} />

      {/* ── System performance (theo bộ lọc ngày) ── */}
      <SystemPerformanceSummary
        tasks={tasks}
        monthly_completed={d.monthly_completed}
        periodLabel={periodLabel}
      />

      {/* ── 2-col: Task donut | Video theo tuyến nội dung ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Task distribution */}
        <DashboardCard
          icon={ListTodo} iconColor="text-indigo-600" iconBg="bg-indigo-50"
          title="Phân bố task"
          subtitle="Theo hạn chót, khớp tab Nhiệm vụ — trừ task quá hạn"
          action={{ href: '/dashboard/task-auto/tasks', label: 'Xem tất cả' }}
          className="flex flex-col"
        >
          <div className="p-5 flex-1 flex flex-col">
            {taskChartData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <ListTodo className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Chưa có task nào</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center gap-5">
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
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Video theo tuyến nội dung */}
        <VideoByLineCard
          data={d.video_by_line}
          periodLabel={periodLabel}
          subtitle="Toàn hệ thống"
        />

      </div>

    </div>
  )
}
