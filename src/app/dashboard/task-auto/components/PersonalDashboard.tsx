'use client'

import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2, Target, ArrowRight, Video,
  CalendarClock, Flame, Send, Zap,
  AlertTriangle, Clock, Award,
} from 'lucide-react'
import Link from 'next/link'
import type { ElementType } from 'react'
import { cn } from '@/lib/utils'
import { getTasks, type ProductVideoStats } from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import type { Task, TaskStatus } from '@/types/task-auto'
import { StatCard } from './StatCard'
import { DashboardCard } from './DashboardUI'
import { VideoByLineCard } from './VideoByLineCard'
import { ProductVideoBreakdownCard } from './ProductVideoBreakdownCard'
import { TONE, CATEGORY, STATUS, TASK_STATUS_TO_KEY, kpiTone, type Tone } from './tokens'

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

const INSIGHT_ICON: Record<Tone, ElementType> = {
  danger: AlertTriangle, warning: Clock, info: Target, success: Award, neutral: Target,
  brand: Target, violet: Target,
}

function getInsight({ overdue, todayDeadline, rejected, hasKpi, remaining }: {
  overdue: number; todayDeadline: number; rejected: number; hasKpi: boolean; remaining: number
}): { tone: Tone; text: string } {
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

// ─── Task Row ───────────────────────────────────────────────────────────────

function statusStyle(status: TaskStatus) {
  const key = TASK_STATUS_TO_KEY[status]
  const cfg = STATUS[key]
  const t   = TONE[cfg.tone]
  return { label: cfg.label, dot: t.dot, badge: cn(t.bg, t.text) }
}

function TaskRow({ task }: { task: Task }) {
  const cfg    = statusStyle(task.status)
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
            <AlertTriangle className="w-[18px] h-[18px] text-red-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-red-800 leading-tight tracking-tight">Cần xử lý lại</h2>
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

function DailyProgress({ userId, dailyKpiTarget = 0 }: { userId: string; dailyKpiTarget?: number }) {
  const today = new Date().toISOString().split('T')[0]
  const rawDateLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'numeric',
  })
  const dateLabel = rawDateLabel.charAt(0).toUpperCase() + rawDateLabel.slice(1)

  // "Tiến độ hôm nay" chỉ tính task THỰC SỰ thuộc về hôm nay: deadline rơi vào hôm nay, hoặc
  // chưa có deadline nhưng được tạo hôm nay (deadline_date ở BE đã tự áp dụng đúng quy tắc này —
  // xem tasks.service.ts findAll). Trước đây có gộp thêm MỌI task đang ở trạng thái "Đang làm"
  // bất kể deadline ngày nào, khiến task đang làm dở từ hôm trước/không liên quan hôm nay vẫn bị
  // tính vào tiến độ + mục tiêu hôm nay — sai lệch % hoàn thành và số liệu so với dailyKpiTarget.
  const { data: todayData } = useQuery({
    queryKey: ['task-auto', 'tasks-today', userId, today],
    queryFn: () => getTasks({ assignee_id: userId, deadline_date: today, limit: 30 }),
    enabled: !!userId,
    refetchInterval: 60_000,
  })

  const merged: Task[] = todayData?.data ?? []

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

  const barTone = pct === 100 ? 'success' : pct >= 60 ? 'brand' : 'warning'

  const breakdown: { key: 'in_progress' | 'submitted' | 'approved' | 'rejected'; count: number }[] = [
    { key: 'in_progress', count: merged.filter(t => t.status === 'IN_PROGRESS').length },
    { key: 'submitted',   count: merged.filter(t => t.status === 'SUBMITTED').length },
    { key: 'approved',    count: merged.filter(t => t.status === 'APPROVED').length },
    { key: 'rejected',    count: merged.filter(t => t.status === 'REJECTED').length },
  ]

  return (
    <DashboardCard
      icon={CalendarClock} iconColor="text-indigo-600" iconBg="bg-indigo-50"
      title="Tiến độ hôm nay"
      subtitle={dailyKpiTarget > 0 ? `${dateLabel} — Mục tiêu: ${dailyKpiTarget} video` : dateLabel}
      action={{ href: '/dashboard/task-auto/tasks', label: 'Xem tất cả' }}
      className="flex flex-col"
    >
      {/* Progress summary */}
      <div className="px-6 py-4 border-b border-slate-50">
        <div className="flex items-center gap-5">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-700', TONE[barTone].bar)}
                style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                <span className="font-extrabold text-slate-800 text-sm">{done}</span>
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
            {breakdown.filter(s => s.count > 0).map(s => {
              const t = TONE[STATUS[s.key].tone]
              return (
                <span key={s.key} className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', t.bg, t.text)}>
                  {STATUS[s.key].label}: {s.count}
                </span>
              )
            })}
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

export function PersonalDashboard({ d, periodLabel, productStats }: {
  d: any; periodLabel: string
  /** Tải riêng qua GET /task-auto/product-video-stats (xem page.tsx) — undefined khi đang tải lần đầu. */
  productStats?: ProductVideoStats
}) {
  const { user } = useAuthStore()
  const tasks = d.tasks ?? {}
  const kpi   = d.kpi
  const overdue = d.overdue ?? 0
  const todayDeadline = d.today_deadline ?? 0

  const kpiPct = kpi?.total_target > 0
    ? Math.min(100, Math.round((kpi.completed / kpi.total_target) * 100))
    : 0
  const kpiTint = TONE[kpiTone(kpiPct)]
  const remaining = Math.max(0, (kpi?.total_target ?? 0) - (kpi?.completed ?? 0))

  const firstName = user?.full_name?.trim().split(/\s+/).pop() ?? 'bạn'
  const insight = getInsight({ overdue, todayDeadline, rejected: tasks.rejected ?? 0, hasKpi: !!kpi, remaining })
  const InsightIcon = INSIGHT_ICON[insight.tone]
  const insightTint = TONE[insight.tone]
  const inProgressTotal = (tasks.in_progress ?? 0) + (tasks.assigned ?? 0)

  return (
    <div className="space-y-5">

      {/* ── Greeting & insight ── */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-white border border-indigo-100/60 rounded-2xl shadow-sm shadow-slate-200/60 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{getGreeting()}, {firstName}</h1>
          <div className={cn('inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1.5 rounded-full', insightTint.bg, insightTint.text)}>
            <InsightIcon className="w-3.5 h-3.5 shrink-0" />
            {insight.text}
          </div>
        </div>
        {kpi && (
          <div className="flex items-center gap-2 shrink-0 bg-white/90 border border-indigo-100 rounded-xl px-4 py-2.5 shadow-sm">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-sm text-slate-500">KPI tháng {formatMonth(kpi.month)}:</span>
            <span className={cn('text-sm font-extrabold', kpiTint.text)}>{kpiPct}%</span>
          </div>
        )}
      </div>

      {/* ── Quick stats — cần làm ngay ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Quá hạn" value={overdue} icon={Flame}
          tone="danger" active={overdue > 0}
          sub={overdue > 0 ? 'Cần xử lý ngay' : 'Không có task trễ hạn'}
        />
        <StatCard
          label="Đến hạn hôm nay" value={todayDeadline} icon={CalendarClock}
          tone="warning" active={todayDeadline > 0}
          sub="Hoàn thành trước hôm nay"
        />
        <StatCard
          label="Đang xử lý" value={inProgressTotal} icon={Zap}
          tone="info" active={inProgressTotal > 0}
          sub={`${tasks.in_progress ?? 0} đang làm · ${tasks.assigned ?? 0} đã giao`}
        />
        <StatCard
          label="Chờ duyệt" value={tasks.submitted ?? 0} icon={Send}
          tone="violet" active={(tasks.submitted ?? 0) > 0}
          sub="Đang chờ Leader duyệt"
        />
      </div>

      {/* ── Rejected tasks alert ── */}
      {(tasks.rejected ?? 0) > 0 && user?.id && (
        <RejectedTasksPanel userId={user.id} />
      )}

      {/* ── Main 2-col: Tiến độ hôm nay | Video theo tuyến nội dung ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {user?.id && <DailyProgress userId={user.id} dailyKpiTarget={d.daily_kpi_target ?? 0} />}

        <VideoByLineCard
          data={d.video_by_line}
          periodLabel={periodLabel}
          title="Video theo tuyến nội dung"
          subtitle="Của tôi"
        />

      </div>

      {/* ── 2-col: Video theo dòng sản phẩm | Sản phẩm được làm video — như màn Admin, thu hẹp về đúng chỉ số của riêng mình ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <VideoByLineCard
          data={(productStats?.video_by_product_line ?? []).map(p => ({ line: p.category, count: p.count }))}
          periodLabel={periodLabel}
          title="Video theo dòng sản phẩm"
          subtitle="Của tôi"
          icon={Video} iconColor={CATEGORY.video.text} iconBg={CATEGORY.video.bg}
          itemLabel="Dòng" unitLabel="video đã duyệt"
          emptyLabel="Chưa có video nào được duyệt theo dòng sản phẩm"
        />

        <ProductVideoBreakdownCard
          byProduct={productStats?.products_with_video_list ?? []}
          byLine={productStats?.products_with_video_by_line ?? []}
          total={productStats?.products_with_video ?? 0}
          periodLabel={periodLabel}
          scopeLabel="Của tôi"
        />

      </div>

    </div>
  )
}
