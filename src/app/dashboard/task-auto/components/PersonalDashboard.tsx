'use client'

import { useQuery } from '@tanstack/react-query'
import {
  ListTodo, Clock, CheckCircle2, AlertTriangle, TrendingUp,
  Target, ArrowRight, Video, FileText, Package, CalendarClock,
  Flame, Send,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getTasks } from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import type { Task, TaskStatus } from '@/types/task-auto'

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconBg, accent, valueCls,
}: {
  label: string; value: number; icon: any
  iconBg: string; accent: string; valueCls?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
      <div className={cn('h-1 w-full', accent)} />
      <div className="px-4 py-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-none mb-2">{label}</p>
          <p className={cn('text-3xl font-black leading-none', valueCls ?? 'text-slate-800')}>{value ?? 0}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
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
        overdue
          ? 'bg-red-50/60 border-red-100 hover:border-red-200'
          : 'bg-slate-50/50 border-slate-100/80 hover:border-indigo-200 hover:bg-indigo-50/30',
      )}
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold truncate leading-tight', overdue ? 'text-red-700' : 'text-slate-800')}>
          {title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
            {cfg.label}
          </span>
          {task.product?.sku && (
            <span className="text-[11px] text-slate-400 font-mono truncate">{task.product.sku}</span>
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
  metrics: { label: string; value: number; highlight?: boolean }[]
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
            <span className={cn('text-lg font-black tabular-nums', m.highlight ? color : 'text-slate-800')}>
              {m.value ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Daily Progress ─────────────────────────────────────────────────────────

function DailyProgress({ userId }: { userId: string }) {
  const today = new Date().toISOString().split('T')[0]
  const dateLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'numeric',
  })

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
  const pctCls  = pct === 100 ? 'text-emerald-600' : pct >= 60 ? 'text-indigo-600' : 'text-amber-500'
  const trackCls = pct === 100 ? 'bg-emerald-100' : pct >= 60 ? 'bg-indigo-100' : 'bg-amber-100'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">Tiến độ hôm nay</h2>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">{dateLabel}</p>
            </div>
          </div>
          <Link href="/dashboard/task-auto/tasks"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
            Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

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
    </div>
  )
}

// ─── PersonalDashboard ──────────────────────────────────────────────────────

export function PersonalDashboard({ d }: { d: any }) {
  const { user } = useAuthStore()
  const tasks = d.tasks ?? {}
  const kpi   = d.kpi

  const kpiPct  = kpi?.total_target > 0
    ? Math.min(100, Math.round((kpi.completed / kpi.total_target) * 100))
    : 0
  const kpiPctCls = kpiPct === 100 ? 'text-emerald-600' : kpiPct >= 60 ? 'text-indigo-600' : kpiPct >= 30 ? 'text-amber-500' : 'text-red-500'
  const remaining = Math.max(0, (kpi?.total_target ?? 0) - (kpi?.completed ?? 0))

  return (
    <div className="space-y-5">

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Tổng task"       value={tasks.total ?? 0}       icon={ListTodo}      iconBg="bg-indigo-50 text-indigo-600"  accent="bg-indigo-400" />
        <StatCard label="Đang làm"        value={tasks.in_progress ?? 0} icon={TrendingUp}    iconBg="bg-amber-50 text-amber-500"    accent="bg-amber-400"  valueCls="text-amber-600" />
        <StatCard label="Đã nộp"          value={tasks.submitted ?? 0}   icon={Send}          iconBg="bg-violet-50 text-violet-600"  accent="bg-violet-400" valueCls="text-violet-600" />
        <StatCard label="Đã duyệt"        value={tasks.approved ?? 0}    icon={CheckCircle2}  iconBg="bg-emerald-50 text-emerald-600" accent="bg-emerald-500" valueCls="text-emerald-700" />
        <StatCard label="Đến hạn hôm nay" value={d.today_deadline ?? 0}  icon={Clock}         iconBg="bg-blue-50 text-blue-500"      accent="bg-blue-400" />
        <StatCard label="Quá hạn"         value={d.overdue ?? 0}         icon={AlertTriangle} iconBg="bg-red-50 text-red-500"        accent="bg-red-400"    valueCls={d.overdue > 0 ? 'text-red-600' : 'text-slate-800'} />
      </div>

      {/* ── Main 2-col ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Left: Daily */}
        {user?.id && <DailyProgress userId={user.id} />}

        {/* Right: KPI */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Target className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">KPI cá nhân</h2>
                  {kpi && <p className="text-xs text-slate-400 mt-0.5">{formatMonth(kpi.month)}</p>}
                </div>
              </div>
              <Link href="/dashboard/task-auto/kpi"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
                Chi tiết <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {kpi ? (
            <div className="px-6 py-5 space-y-5">

              {/* Progress banner */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100/60">
                {/* Circle-ish % indicator */}
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-black text-slate-900 leading-none">{kpi.completed}</span>
                    <span className="text-base text-slate-400 font-medium">/ {kpi.total_target} task</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {remaining > 0
                      ? <>Cần hoàn thành thêm <span className="font-black text-indigo-600">{remaining}</span> task</>
                      : <span className="flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Đã đạt KPI!</span>
                    }
                  </p>
                </div>
              </div>

              {/* KPI Groups */}
              <div className="space-y-3">
                <KpiGroup
                  icon={Video} title="Video" color="text-orange-600" bg="bg-orange-50"
                  metrics={[
                    { label: 'Win ≥10k view', value: kpi.video_win, highlight: true },
                    { label: 'Fail', value: kpi.video_fail },
                  ]}
                />

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
                      { label: 'Kế hoạch', value: kpi.product_planned, highlight: true },
                      { label: 'Thu thập', value: kpi.product_win_collect },
                    ]}
                  />
                </div>
              </div>

              {/* Traffic / GMV / Profit */}
              {(kpi.video_traffic || kpi.video_gmv || kpi.video_profit) ? (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Traffic',  value: kpi.video_traffic,  color: 'text-blue-600',   bg: 'bg-blue-50' },
                    { label: 'GMV',      value: kpi.video_gmv,      color: 'text-teal-600',   bg: 'bg-teal-50' },
                    { label: 'Profit',   value: kpi.video_profit,   color: 'text-green-600',  bg: 'bg-green-50' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={cn('rounded-xl px-3 py-3 text-center', bg)}>
                      <p className="text-xs text-slate-500 font-semibold mb-1">{label}</p>
                      <p className={cn('text-2xl font-black', color)}>{value ?? 0}</p>
                    </div>
                  ))}
                </div>
              ) : null}
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
        </div>
      </div>
    </div>
  )
}
