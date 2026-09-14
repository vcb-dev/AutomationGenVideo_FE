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
import { ContentByClassificationCard } from './ContentByClassificationCard'
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
        'group flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all hover:shadow-sm active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
        task.status === 'REJECTED'
          ? 'bg-red-50/80 border-red-100 hover:border-red-300'
          : overdue
            ? 'bg-red-50/60 border-red-100 hover:border-red-200'
            : 'bg-slate-50/50 border-slate-100/80 hover:border-indigo-200 hover:bg-indigo-50/30',
      )}
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} aria-hidden />

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
      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" aria-hidden />
    </Link>
  )
}

// ─── Daily Progress ─────────────────────────────────────────────────────────

/** Cao tối đa của danh sách task (px) — chốt cứng để card không "tràn" theo số lượng task; phần
 * dư cuộn trong khung, thay vì đẩy card dài mãi làm lệch lưới 2 cột cạnh biểu đồ. */
const TASK_LIST_MAX_H = 'max-h-80'

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
  const { data: todayData, isLoading } = useQuery({
    queryKey: ['task-auto', 'tasks-today', userId, today],
    queryFn: () => getTasks({ assignee_id: userId, deadline_date: today, limit: 30 }),
    enabled: !!userId,
    refetchInterval: 60_000,
  })

  // Task bị từ chối cần nộp lại có thể có hạn chót cũ (không rơi vào "hôm nay") nhưng vẫn cấp
  // bách hơn mọi task khác — trước đây hiện ở 1 card riêng chiếm hẳn 1 hàng ngang, giờ gộp thẳng
  // vào danh sách + chip của "Tiến độ hôm nay" cho gọn.
  const { data: rejectedData } = useQuery({
    queryKey: ['task-auto', 'tasks-rejected', userId],
    queryFn: () => getTasks({ assignee_id: userId, status: 'REJECTED', limit: 5 }),
    enabled: !!userId,
    refetchInterval: 60_000,
  })

  const merged: Task[] = todayData?.data ?? []
  const rejectedTotal = rejectedData?.total ?? 0
  // Chỉ những task bị từ chối CHƯA có mặt trong danh sách hôm nay mới cần chèn thêm — tránh trùng
  // dòng khi task vừa bị từ chối vừa có hạn chót đúng hôm nay (đã nằm sẵn trong `merged`).
  const extraRejected = (rejectedData?.data ?? []).filter(rt => !merged.some(m => m.id === rt.id))

  const ORDER: Record<TaskStatus, number> = {
    REJECTED: 0, IN_PROGRESS: 1, ASSIGNED: 2, PENDING: 3, SUBMITTED: 4, APPROVED: 5, CANCELLED: 6,
  }
  const sorted = [...merged].sort((a, b) => {
    const aO = isOverdue(a) ? -1 : 0, bO = isOverdue(b) ? -1 : 0
    if (aO !== bO) return aO - bO
    return (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9)
  })
  // Task bị từ chối (kể cả hạn chót không phải hôm nay) luôn hiện đầu danh sách — cấp bách nhất.
  const displayList = [...extraRejected, ...sorted]

  const done       = merged.filter(t => ['APPROVED', 'SUBMITTED'].includes(t.status)).length
  const total      = merged.filter(t => t.status !== 'CANCELLED').length
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0
  const overdueCnt = merged.filter(isOverdue).length

  const barTone = pct === 100 ? 'success' : pct >= 60 ? 'brand' : 'warning'

  const breakdown: { key: 'in_progress' | 'submitted' | 'approved'; count: number }[] = [
    { key: 'in_progress', count: merged.filter(t => t.status === 'IN_PROGRESS').length },
    { key: 'submitted',   count: merged.filter(t => t.status === 'SUBMITTED').length },
    { key: 'approved',    count: merged.filter(t => t.status === 'APPROVED').length },
  ]

  return (
    <DashboardCard
      title="Tiến độ hôm nay"
      subtitle={dailyKpiTarget > 0 ? `${dateLabel} — Mục tiêu: ${dailyKpiTarget} video` : dateLabel}
      action={{ href: '/dashboard/task-auto/tasks', label: 'Xem tất cả' }}
      className="flex flex-col"
    >
      {/* ── Progress summary ── */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-end justify-between gap-2">
          <p className="leading-none">
            <span className="text-2xl font-black tabular-nums text-slate-900">{done}</span>
            <span className="text-sm font-semibold text-slate-500"> / {total} nhiệm vụ</span>
          </p>
          <span className={cn('text-sm font-black tabular-nums', TONE[barTone].text)}>{pct}%</span>
        </div>

        <div className="mt-2 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700', TONE[barTone].bar)}
            style={{ width: `${pct}%` }} />
        </div>

        {/* Chips: cần xử lý lại + quá hạn + phân bố trạng thái + hoàn thành — bọc xuống dòng, mỗi chip không xuống dòng giữa chừng */}
        {(total > 0 || rejectedTotal > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {rejectedTotal > 0 && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                <AlertTriangle className="w-3 h-3" aria-hidden /> {rejectedTotal} cần xử lý lại
              </span>
            )}
            {overdueCnt > 0 && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                <Flame className="w-3 h-3" aria-hidden /> {overdueCnt} quá hạn
              </span>
            )}
            {breakdown.filter(s => s.count > 0).map(s => {
              const t = TONE[STATUS[s.key].tone]
              return (
                <span key={s.key} className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold', t.bg, t.text)}>
                  {STATUS[s.key].label}: {s.count}
                </span>
              )
            })}
            {pct === 100 && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="w-3 h-3" aria-hidden /> Hoàn thành
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Task list (chiều cao chốt cứng, cuộn trong khung) ── */}
      {isLoading ? (
        <div className="flex-1 px-4 py-3 space-y-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-9 gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-1">
            <CheckCircle2 className="w-6 h-6 text-slate-300" aria-hidden />
          </div>
          <p className="text-sm font-bold text-slate-400">Không có nhiệm vụ nào hôm nay</p>
          <p className="text-xs text-slate-300">Thư giãn hoặc nhận thêm nhiệm vụ mới!</p>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col min-h-0">
          <div
            tabIndex={0}
            aria-label={`Danh sách nhiệm vụ hôm nay, ${displayList.length} mục`}
            className={cn(
              'custom-scrollbar flex-1 overflow-y-auto overscroll-contain',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300',
              TASK_LIST_MAX_H,
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 pt-3 pb-2 backdrop-blur-sm">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {extraRejected.length > 0 ? 'Nhiệm vụ hôm nay + cần xử lý lại' : 'Nhiệm vụ hôm nay'}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">
                {displayList.length}
              </span>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {displayList.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          </div>
          {/* Gợi ý còn nội dung bên dưới — chỉ khi danh sách dài hơn khung */}
          {displayList.length > 5 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>
      )}
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

      {/* ── Main 2-col: Tiến độ hôm nay | Video theo tuyến nội dung (2 card cao bằng nhau — items-stretch) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

        {user?.id && <DailyProgress userId={user.id} dailyKpiTarget={d.daily_kpi_target ?? 0} />}

        <VideoByLineCard
          data={d.video_by_line}
          periodLabel={periodLabel}
          title="Video theo tuyến nội dung"
          subtitle="Của tôi"
        />

      </div>

      {/* ── 3-col: Video theo dòng sản phẩm | Content theo phân loại | Sản phẩm được làm video ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">

        <VideoByLineCard
          data={(productStats?.video_by_product_line ?? []).map(p => ({ line: p.category, count: p.count }))}
          periodLabel={periodLabel}
          title="Video theo dòng sản phẩm"
          subtitle="Của tôi"
          icon={Video} iconColor={CATEGORY.video.text} iconBg={CATEGORY.video.bg}
          itemLabel="Dòng" unitLabel="video đã duyệt"
          emptyLabel="Chưa có video nào được duyệt theo dòng sản phẩm"
        />

        <ContentByClassificationCard
          data={d.content_by_classification}
          periodLabel={periodLabel}
          subtitle="Của tôi"
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
