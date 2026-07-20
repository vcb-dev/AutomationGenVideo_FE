'use client'

import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2, Target, ArrowRight, Video, FileText, Package,
  CalendarClock, Flame, Send, XCircle, Zap, BarChart3, Award,
  AlertTriangle, Clock,
} from 'lucide-react'
import Link from 'next/link'
import type { ElementType } from 'react'
import { cn } from '@/lib/utils'
import { getTasks } from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import type { Task, TaskStatus } from '@/types/task-auto'
import { StatCard } from './StatCard'
import { StatusBar } from './StatusBar'
import { DashboardCard, MetricStat } from './DashboardUI'

// ─── helpers ────────────────────────────────────────────────────────────────

const ALLOC_COLORS = [
  { color: 'text-blue-600',  bg: 'bg-blue-50' },
  { color: 'text-teal-600',  bg: 'bg-teal-50' },
  { color: 'text-green-600', bg: 'bg-green-50' },
  { color: 'text-amber-600', bg: 'bg-amber-50' },
  { color: 'text-violet-600', bg: 'bg-violet-50' },
  { color: 'text-rose-600',  bg: 'bg-rose-50' },
]

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `Tháng ${m}/${y}`
}

function isOverdue(task: Task) {
  if (!task.deadline) return false
  if (['APPROVED', 'CANCELLED'].includes(task.status)) return false
  return new Date(task.deadline) < new Date()
}

function getDeadlineLabel(deadline: string | null) {
  if (!deadline) return null
  const d = new Date(deadline)
  const diffMs = d.getTime() - Date.now()
  const diffH  = Math.floor(diffMs / 3_600_000)
  const diffM  = Math.floor(diffMs / 60_000)
  if (diffMs < 0) {
    const h = Math.abs(diffH)
    return { text: h > 0 ? `Quá ${h}h` : `Quá ${Math.abs(diffM)}p`, danger: true }
  }
  if (diffH < 1)  return { text: `Còn ${diffM}p`,  danger: true }
  if (diffH < 4)  return { text: `Còn ${diffH}h`,  danger: true }
  if (diffH < 12) return { text: `Còn ${diffH}h`,  danger: false }
  return { text: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), danger: false }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 11) return 'Chào buổi sáng'
  if (h < 13) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

const INSIGHT_STYLES: Record<string, { cls: string; icon: ElementType }> = {
  danger:  { cls: 'bg-red-50 border border-red-100 text-red-600',       icon: AlertTriangle },
  warning: { cls: 'bg-amber-50 border border-amber-100 text-amber-700', icon: Clock },
  info:    { cls: 'bg-indigo-50 border border-indigo-100 text-indigo-600', icon: Target },
  success: { cls: 'bg-emerald-50 border border-emerald-100 text-emerald-600', icon: Award },
  neutral: { cls: 'bg-slate-50 border border-slate-100 text-slate-500', icon: Target },
}

function getInsight({ overdue, todayDeadline, rejected, hasKpi, remaining }: {
  overdue: number; todayDeadline: number; rejected: number; hasKpi: boolean; remaining: number
}) {
  if (overdue > 0)
    return { tone: 'danger', text: `Bạn có ${overdue} nhiệm vụ quá hạn — xử lý ngay để tránh ảnh hưởng KPI.` }
  if (rejected > 0)
    return { tone: 'danger', text: `${rejected} nhiệm vụ bị từ chối đang chờ chỉnh sửa và nộp lại.` }
  if (todayDeadline > 0)
    return { tone: 'warning', text: `Có ${todayDeadline} nhiệm vụ đến hạn hôm nay — hãy hoàn thành đúng giờ.` }
  if (hasKpi && remaining > 0)
    return { tone: 'info', text: `Cần hoàn thành thêm ${remaining} nhiệm vụ để đạt KPI tháng này.` }
  if (hasKpi)
    return { tone: 'success', text: 'Bạn đã đạt KPI tháng này — xuất sắc!' }
  return { tone: 'neutral', text: 'Chưa có KPI tháng này. Liên hệ Leader để được thiết lập.' }
}

// ─── STATUS config ──────────────────────────────────────────────────────────

const STATUS_CFG: Record<TaskStatus, { label: string; dot: string; badge: string }> = {
  PENDING:     { label: 'Chờ xử lý', dot: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-500' },
  ASSIGNED:    { label: 'Đã giao',   dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-600' },
  IN_PROGRESS: { label: 'Đang làm',  dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700' },
  SUBMITTED:   { label: 'Đã nộp',    dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-700' },
  APPROVED:    { label: 'Đã duyệt',  dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  REJECTED:    { label: 'Từ chối',   dot: 'bg-red-400',     badge: 'bg-red-50 text-red-600' },
  CANCELLED:   { label: 'Đã hủy',    dot: 'bg-slate-200',   badge: 'bg-slate-50 text-slate-400' },
}

// ─── Task Row ───────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const cfg    = STATUS_CFG[task.status]
  const overdue = isOverdue(task)
  const dl     = getDeadlineLabel(task.deadline)
  const title  = task.content?.title || task.product?.name || `Task #${task.id.slice(-6)}`

  return (
    <Link
      href={`/dashboard/task-auto/tasks?id=${task.id}`}
      className={cn(
        'group flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all hover:shadow-sm',
        task.status === 'REJECTED'
          ? 'bg-red-50/80 border-red-100 hover:border-red-300'
          : overdue
            ? 'bg-red-50/60 border-red-100 hover:border-red-200'
            : 'bg-slate-50/50 border-slate-100/80 hover:border-indigo-200 hover:bg-indigo-50/30',
      )}
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold truncate leading-tight', task.status === 'REJECTED' ? 'text-red-700' : overdue ? 'text-red-700' : 'text-slate-800')}>
          {title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
            {cfg.label}
          </span>
          {task.product?.sku && (
            <span className="text-[11px] text-slate-400 font-mono truncate">{task.product.sku}</span>
          )}
          {task.status === 'REJECTED' && task.reject_reason && (
            <span className="text-[11px] text-red-500 truncate max-w-[120px]" title={task.reject_reason}>
              {task.reject_reason}
            </span>
          )}
        </div>
      </div>

      {dl && task.status !== 'APPROVED' && (
        <span className={cn(
          'text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap',
          dl.danger ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500',
        )}>
          {dl.text}
        </span>
      )}
      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
    </Link>
  )
}

// ─── KPI Metric group ───────────────────────────────────────────────────────

function KpiGroup({
  icon: Icon, title, color, bg, metrics,
}: {
  icon: any; title: string; color: string; bg: string
  metrics: { label: string; value: number; highlight?: boolean; danger?: boolean }[]
}) {
  return (
    <div className={cn('rounded-xl p-4', bg)}>
      <div className={cn('flex items-center gap-2 mb-3', color)}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-black uppercase tracking-widest">{title}</span>
      </div>
      <div className="grid gap-y-2">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center justify-between">
            <span className="text-sm text-slate-600">{m.label}</span>
            <span className={cn('text-lg font-black tabular-nums',
              m.danger ? 'text-red-500' : m.highlight ? color : 'text-slate-800',
            )}>
              {m.value ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Allocation strip (product / content line) ──────────────────────────────

function AllocationStrip({ title, items }: { title: string; items: { id: string; name: string; weight: number }[] }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-2">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((a, i) => {
          const { color, bg } = ALLOC_COLORS[i % ALLOC_COLORS.length]
          return (
            <div key={a.id} className={cn('rounded-xl px-3 py-3 text-center', bg)}>
              <p className="text-xs text-slate-500 font-semibold mb-1 truncate">{a.name}</p>
              <p className={cn('text-2xl font-black', color)}>{a.weight}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month Pacing Hint ──────────────────────────────────────────────────────

function MonthPacingHint({ completed, target }: { completed: number; target: number }) {
  if (!target) return null
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth  = now.getDate()
  const daysLeft    = daysInMonth - dayOfMonth + 1
  const remaining   = Math.max(0, target - completed)

  if (remaining === 0) return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
      <Award className="w-3.5 h-3.5" /> Đã đạt KPI tháng này!
    </div>
  )

  const rateNeeded = daysLeft > 0 ? (remaining / daysLeft) : 0
  const urgent = rateNeeded > 3

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg',
      urgent ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500',
    )}>
      <BarChart3 className="w-3.5 h-3.5 shrink-0" />
      <span>
        Còn <span className="font-bold">{remaining}</span> task,{' '}
        cần{' '}
        <span className={cn('font-bold', urgent ? 'text-amber-600' : 'text-indigo-600')}>
          {rateNeeded.toFixed(1)}/ngày
        </span>{' '}
        trong {daysLeft} ngày tới
      </span>
    </div>
  )
}

// ─── Lifetime Performance ────────────────────────────────────────────────────

function PerformanceSummary({ tasks }: { tasks: Record<string, number> }) {
  const total    = (tasks.total ?? 0) - (tasks.cancelled ?? 0)
  const approved = tasks.approved ?? 0
  const rejected = tasks.rejected ?? 0
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0

  return (
    <DashboardCard
      icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-50"
      title="Hiệu suất cá nhân" subtitle="Tổng toàn thời gian"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 lg:divide-x divide-slate-100">
        <div className="lg:col-span-2 grid grid-cols-2 divide-x divide-slate-100 border-b lg:border-b-0 border-slate-100">
          <MetricStat
            icon={CheckCircle2} label="Tỷ lệ duyệt" value={`${approvalRate}%`} sub={`${approved}/${total} task`}
            tone={approvalRate >= 80 ? 'emerald' : approvalRate >= 50 ? 'amber' : 'red'}
          />
          <MetricStat
            icon={XCircle} label="Tỷ lệ từ chối" value={`${rejectionRate}%`} sub={`${rejected} bị từ chối`}
            tone={rejectionRate > 20 ? 'red' : rejectionRate > 10 ? 'amber' : 'slate'}
            active={rejectionRate > 10}
          />
        </div>
        <div className="lg:col-span-3 px-5 py-4">
          <StatusBar tasks={tasks} />
        </div>
      </div>
    </DashboardCard>
  )
}

// ─── Rejected Tasks Panel ────────────────────────────────────────────────────

function RejectedTasksPanel({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['task-auto', 'tasks-rejected', userId],
    queryFn: () => getTasks({ assignee_id: userId, status: 'REJECTED', limit: 5 }),
    enabled: !!userId,
    refetchInterval: 60_000,
  })

  const tasks = data?.data ?? []
  if (tasks.length === 0) return null

  return (
    <div className="bg-red-50/60 rounded-2xl border border-red-200 shadow-sm shadow-red-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-red-100/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <XCircle className="w-[18px] h-[18px] text-red-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-red-800 leading-tight tracking-tight">Cần xử lý lại</h2>
            <p className="text-xs text-red-500 mt-0.5">Task bị từ chối — cần chỉnh sửa và nộp lại</p>
          </div>
          <span className="ml-1 px-2.5 py-0.5 text-xs font-bold bg-red-200 text-red-700 rounded-full">
            {tasks.length}
          </span>
        </div>
        <Link href="/dashboard/task-auto/tasks?status=REJECTED"
          className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-500 flex items-center gap-1">
          Xem tất cả <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-3 space-y-1.5">
        {tasks.map(t => <TaskRow key={t.id} task={t} />)}
      </div>
    </div>
  )
}

// ─── Daily Progress ─────────────────────────────────────────────────────────

function DailyProgress({ userId }: { userId: string }) {
  const today = new Date().toISOString().split('T')[0]
  const rawDateLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'numeric',
  })
  const dateLabel = rawDateLabel.charAt(0).toUpperCase() + rawDateLabel.slice(1)

  const { data: todayData } = useQuery({
    queryKey: ['task-auto', 'tasks-today', userId, today],
    queryFn: () => getTasks({ assignee_id: userId, deadline_date: today, limit: 30 }),
    enabled: !!userId,
    refetchInterval: 60_000,
  })
  const { data: inProgressData } = useQuery({
    queryKey: ['task-auto', 'tasks-inprogress', userId],
    queryFn: () => getTasks({ assignee_id: userId, status: 'IN_PROGRESS', limit: 20 }),
    enabled: !!userId,
    refetchInterval: 60_000,
  })

  const seenIds = new Set<string>()
  const merged: Task[] = []
  for (const t of [...(todayData?.data ?? []), ...(inProgressData?.data ?? [])]) {
    if (!seenIds.has(t.id)) { seenIds.add(t.id); merged.push(t) }
  }

  const ORDER: Record<TaskStatus, number> = {
    REJECTED: 0, IN_PROGRESS: 1, ASSIGNED: 2, PENDING: 3, SUBMITTED: 4, APPROVED: 5, CANCELLED: 6,
  }
  const sorted = [...merged].sort((a, b) => {
    const aO = isOverdue(a) ? -1 : 0, bO = isOverdue(b) ? -1 : 0
    if (aO !== bO) return aO - bO
    return (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9)
  })

  const done       = merged.filter(t => ['APPROVED', 'SUBMITTED'].includes(t.status)).length
  const total      = merged.filter(t => t.status !== 'CANCELLED').length
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0
  const overdueCnt = merged.filter(isOverdue).length

  const barCls  = pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-amber-400'

  return (
    <DashboardCard
      icon={CalendarClock} iconColor="text-indigo-600" iconBg="bg-indigo-50"
      title="Tiến độ hôm nay" subtitle={dateLabel}
      action={{ href: '/dashboard/task-auto/tasks', label: 'Xem tất cả' }}
      className="flex flex-col"
    >
      {/* Progress summary */}
      <div className="px-6 py-4 border-b border-slate-50">
        <div className="flex items-center gap-5">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-700', barCls)}
                style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                <span className="font-black text-slate-800 text-sm">{done}</span>
                <span className="text-slate-400"> / {total} nhiệm vụ</span>
              </span>
              <div className="flex items-center gap-2">
                {overdueCnt > 0 && (
                  <span className="flex items-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full">
                    <Flame className="w-3 h-3" /> {overdueCnt} quá hạn
                  </span>
                )}
                {pct === 100 && total > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Hoàn thành!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        {total > 0 && (
          <div className="flex gap-3 mt-3 pt-3 border-t border-slate-50">
            {[
              { label: 'Đang làm', count: merged.filter(t => t.status === 'IN_PROGRESS').length, cls: 'text-amber-600 bg-amber-50' },
              { label: 'Đã nộp',   count: merged.filter(t => t.status === 'SUBMITTED').length,   cls: 'text-violet-600 bg-violet-50' },
              { label: 'Đã duyệt', count: merged.filter(t => t.status === 'APPROVED').length,    cls: 'text-emerald-600 bg-emerald-50' },
              { label: 'Từ chối',  count: merged.filter(t => t.status === 'REJECTED').length,    cls: 'text-red-600 bg-red-50' },
            ].filter(s => s.count > 0).map(s => (
              <span key={s.label} className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', s.cls)}>
                {s.label}: {s.count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="px-4 py-3 flex-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">Không có nhiệm vụ nào hôm nay</p>
            <p className="text-xs text-slate-300">Thư giãn hoặc nhận thêm nhiệm vụ mới!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sorted.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        )}
      </div>
    </DashboardCard>
  )
}

// ─── PersonalDashboard ──────────────────────────────────────────────────────

export function PersonalDashboard({ d }: { d: any }) {
  const { user } = useAuthStore()
  const tasks = d.tasks ?? {}
  const kpi   = d.kpi
  const overdue = d.overdue ?? 0
  const todayDeadline = d.today_deadline ?? 0

  const kpiPct  = kpi?.total_target > 0
    ? Math.min(100, Math.round((kpi.completed / kpi.total_target) * 100))
    : 0
  const kpiPctCls = kpiPct === 100 ? 'text-emerald-600' : kpiPct >= 60 ? 'text-indigo-600' : kpiPct >= 30 ? 'text-amber-500' : 'text-red-500'
  const remaining = Math.max(0, (kpi?.total_target ?? 0) - (kpi?.completed ?? 0))

  const videoTotal   = (kpi?.video_win ?? 0) + (kpi?.video_fail ?? 0)
  const videoWinRate = videoTotal > 0
    ? Math.round(((kpi?.video_win ?? 0) / videoTotal) * 100)
    : null

  const firstName = user?.full_name?.trim().split(/\s+/).pop() ?? 'bạn'
  const insight = getInsight({ overdue, todayDeadline, rejected: tasks.rejected ?? 0, hasKpi: !!kpi, remaining })
  const inProgressTotal = (tasks.in_progress ?? 0) + (tasks.assigned ?? 0)

  return (
    <div className="space-y-5">

      {/* ── Greeting & insight ── */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-white border border-indigo-100/60 rounded-2xl shadow-sm shadow-slate-200/60 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{getGreeting()}, {firstName}</h1>
          <div className={cn('inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1.5 rounded-full', INSIGHT_STYLES[insight.tone].cls)}>
            {(() => { const Icon = INSIGHT_STYLES[insight.tone].icon; return <Icon className="w-3.5 h-3.5 shrink-0" /> })()}
            {insight.text}
          </div>
        </div>
        {kpi && (
          <div className="flex items-center gap-2 shrink-0 bg-white/90 border border-indigo-100 rounded-xl px-4 py-2.5 shadow-sm">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-sm text-slate-500">KPI tháng {formatMonth(kpi.month)}:</span>
            <span className={cn('text-sm font-black', kpiPctCls)}>{kpiPct}%</span>
          </div>
        )}
      </div>

      {/* ── Quick stats — cần làm ngay ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Quá hạn" value={overdue} icon={Flame}
          iconBg={overdue > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-300'}
          accent={overdue > 0 ? 'bg-red-500' : 'bg-slate-100'}
          valueCls={overdue > 0 ? 'text-red-600' : 'text-slate-300'}
          sub={overdue > 0 ? 'Cần xử lý ngay' : 'Không có task trễ hạn'}
        />
        <StatCard
          label="Đến hạn hôm nay" value={todayDeadline} icon={CalendarClock}
          iconBg={todayDeadline > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-300'}
          accent={todayDeadline > 0 ? 'bg-amber-400' : 'bg-slate-100'}
          valueCls={todayDeadline > 0 ? 'text-amber-600' : 'text-slate-300'}
          sub="Hoàn thành trước hôm nay"
        />
        <StatCard
          label="Đang xử lý" value={inProgressTotal} icon={Zap}
          iconBg="bg-blue-50 text-blue-600"
          accent="bg-blue-500"
          valueCls={inProgressTotal > 0 ? 'text-blue-600' : 'text-slate-300'}
          sub={`${tasks.in_progress ?? 0} đang làm · ${tasks.assigned ?? 0} đã giao`}
        />
        <StatCard
          label="Chờ duyệt" value={tasks.submitted ?? 0} icon={Send}
          iconBg="bg-violet-50 text-violet-600"
          accent="bg-violet-500"
          valueCls={(tasks.submitted ?? 0) > 0 ? 'text-violet-600' : 'text-slate-300'}
          sub="Đang chờ Leader duyệt"
        />
      </div>

      {/* ── Rejected tasks alert ── */}
      {(tasks.rejected ?? 0) > 0 && user?.id && (
        <RejectedTasksPanel userId={user.id} />
      )}

      {/* ── Main 2-col ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Left: Daily */}
        {user?.id && <DailyProgress userId={user.id} />}

        {/* Right: KPI */}
        <DashboardCard
          icon={Target} iconColor="text-indigo-600" iconBg="bg-indigo-50"
          title="KPI cá nhân" subtitle={kpi ? formatMonth(kpi.month) : undefined}
          action={{ href: '/dashboard/task-auto/kpi', label: 'Chi tiết' }}
        >
          {kpi ? (
            <div className="px-6 py-5 space-y-4">

              {/* Progress banner */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100/60">
                {/* Circle % indicator */}
                <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
                  <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none"
                      stroke={kpiPct === 100 ? '#10b981' : kpiPct >= 60 ? '#6366f1' : kpiPct >= 30 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - kpiPct / 100)}`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="text-center z-10">
                    <p className={cn('text-lg font-black leading-none', kpiPctCls)}>{kpiPct}%</p>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 leading-none">{kpi.completed}</span>
                    <span className="text-base text-slate-400 font-medium">/ {kpi.total_target} task</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {remaining > 0
                      ? <>Cần hoàn thành thêm <span className="font-black text-indigo-600">{remaining}</span> task</>
                      : <span className="flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Đã đạt KPI!</span>
                    }
                  </p>
                  {/* Pacing hint */}
                  <MonthPacingHint completed={kpi.completed} target={kpi.total_target} />
                </div>
              </div>

              {/* KPI Groups */}
              <div className="space-y-3">
                <div className="bg-orange-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3 text-orange-600">
                    <Video className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Video</span>
                    {videoWinRate !== null && (
                      <span className="ml-auto text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        Win rate: {videoWinRate}%
                      </span>
                    )}
                  </div>
                  <div className="grid gap-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Win ≥10k view</span>
                      <span className="text-lg font-black tabular-nums text-orange-600">{kpi.video_win ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Thất bại</span>
                      <span className="text-lg font-black tabular-nums text-red-500">{kpi.video_fail ?? 0}</span>
                    </div>
                    {videoWinRate !== null && (
                      <div className="mt-1 h-1.5 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700',
                            videoWinRate >= 70 ? 'bg-emerald-500' : videoWinRate >= 50 ? 'bg-orange-400' : 'bg-red-400')}
                          style={{ width: `${videoWinRate}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <KpiGroup
                    icon={FileText} title="Content" color="text-emerald-600" bg="bg-emerald-50"
                    metrics={[
                      { label: 'Content mới', value: kpi.content_new, highlight: true },
                      { label: 'Sưu tầm', value: kpi.content_collected },
                      { label: 'Win cover', value: kpi.content_win_cover },
                    ]}
                  />
                  <KpiGroup
                    icon={Package} title="Sản phẩm" color="text-violet-600" bg="bg-violet-50"
                    metrics={[
                      { label: 'Theo kế hoạch', value: kpi.product_planned, highlight: true },
                      { label: 'Sưu tầm win', value: kpi.product_win_collect },
                    ]}
                  />
                </div>

                {/* KPI Extra */}
                {(kpi.kpi_extra ?? 0) > 0 && (
                  <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3">
                    <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-sm font-semibold text-purple-700 flex-1">KPI Sáng tạo</span>
                    <span className="text-lg font-black text-purple-600">{kpi.kpi_extra}</span>
                  </div>
                )}
              </div>

              {/* Phân bổ tuyến nội dung / dòng sản phẩm */}
              <AllocationStrip title="Phân bổ tuyến nội dung" items={kpi.content_allocations ?? []} />
              <AllocationStrip title="Phân bổ dòng sản phẩm" items={kpi.product_allocations ?? []} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-1">
                <Target className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-sm font-bold text-slate-500">Chưa có KPI tháng này</p>
              <p className="text-xs text-slate-400">Liên hệ Leader để được đặt KPI</p>
              <Link href="/dashboard/task-auto/kpi"
                className="mt-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
                Xem trang KPI <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ── Lifetime performance ── */}
      <PerformanceSummary tasks={tasks} />

    </div>
  )
}
