'use client'

import Link from 'next/link'
import {
  ListTodo, CheckCircle2, XCircle, Send,
  CalendarCheck2, BarChart3, ShieldCheck, ArrowRight, Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductVideoStats } from '@/lib/api/task-auto'
import { DashboardCard, MetricStat, PeriodBadge, LiveDot, StatusDonut } from './DashboardUI'
import { VideoByLineCard } from './VideoByLineCard'
import { ProductVideoBreakdownCard } from './ProductVideoBreakdownCard'
import { TONE, CATEGORY, rateTone, type Tone } from './tokens'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlobalData {
  tasks:              Record<string, number> & { total: number }
  today_deadline:     number
  overdue:             number
  monthly_completed:  number
  video_by_line:       { line: string; count: number }[]
}

export function buildGlobal(d: any): GlobalData {
  return {
    tasks:              d.tasks              ?? { total: 0 },
    today_deadline:      d.today_deadline      ?? 0,
    overdue:             d.overdue             ?? 0,
    monthly_completed:   d.monthly_completed   ?? 0,
    video_by_line:       d.video_by_line       ?? [],
  }
}

// ─── Live Alerts ────────────────────────────────────────────────────────────
// "Quá hạn" / "Đến hạn hôm nay" luôn tính theo THỜI ĐIỂM HIỆN TẠI ở BE (getGlobalDashboard),
// không phụ thuộc bộ lọc ngày của trang — cố tình đặt tách khỏi card "Hiệu suất hệ thống"
// (vốn có PeriodBadge theo bộ lọc) để không gây hiểu lầm 2 số này cũng đổi theo bộ lọc.

function AlertPill({ href, label, value, tone }: {
  href: string; label: string; value: number; tone: Tone
}) {
  const t = TONE[tone]
  return (
    <Link
      href={href}
      className={cn('group inline-flex items-center gap-1 text-sm font-bold hover:underline', t.text)}
    >
      {value} {label}
      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  )
}

// Không dùng chrome kiểu DashboardCard (icon-badge header, viền, bóng đổ) — đây là dải cảnh báo
// "sống", cố tình phẳng và nhẹ hơn các card dữ liệu bên dưới để không tạo cảm giác "card lồng
// trong card" khi mỗi mục cảnh báo lại là một khối bo góc riêng.
function LiveAlertsBar({ overdue, todayDeadline }: { overdue: number; todayDeadline: number }) {
  const hasAlerts = overdue > 0 || todayDeadline > 0

  if (!hasAlerts) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <p className="text-sm text-slate-400">Không có task quá hạn hoặc đến hạn hôm nay — tính đến hiện tại.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-red-50 pl-4 pr-3.5 py-3">
      <div className="flex items-center gap-1.5 shrink-0">
        <LiveDot />
        <span className="text-xs font-bold uppercase tracking-wide text-red-700">Cảnh báo trực tiếp</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {overdue > 0 && (
          <AlertPill href="/dashboard/task-auto/tasks" label="task đang quá hạn" value={overdue} tone="danger" />
        )}
        {todayDeadline > 0 && (
          <AlertPill href="/dashboard/task-auto/tasks" label="task đến hạn hôm nay" value={todayDeadline} tone="warning" />
        )}
      </div>

      <span className="text-xs text-red-300 ml-auto hidden sm:inline">tính đến hiện tại, không theo bộ lọc ngày</span>
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
  const completionTone = rateTone(completionRate)

  return (
    <DashboardCard
      icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-50"
      title="Hiệu suất hệ thống"
      subtitle="Cùng cách lọc ngày với tab Nhiệm vụ — theo hạn chót, trừ task quá hạn"
      right={<PeriodBadge label={periodLabel} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-4">
        <MetricStat
          icon={CheckCircle2} label="Tỷ lệ hoàn thành" value={`${completionRate}%`}
          sub={`${approved}/${effective} task`}
          tone={completionTone}
          title="Trong số task hiển thị trong kỳ đang chọn (khớp tab Nhiệm vụ), bao nhiêu % đã Đã duyệt"
        />
        <MetricStat
          icon={Send} label="Chờ duyệt" value={submitted} sub="đã nộp"
          tone="violet" active={submitted > 0}
          title="Task trong kỳ đang chọn, hiện đang ở trạng thái Đã nộp (chờ duyệt) — khớp cột 'Đã nộp' ở tab Nhiệm vụ"
        />
        <MetricStat
          icon={CalendarCheck2} label="Hoàn thành trong kỳ" value={monthly_completed} sub="task đã duyệt"
          tone="success"
          title="Task Đã duyệt trong kỳ đang chọn — khớp đúng cột 'Đã duyệt' ở tab Nhiệm vụ (Kanban)"
        />
        <MetricStat
          icon={XCircle} label="Tỷ lệ từ chối" value={`${rejectionRate}%`} sub={`${rejected} task`}
          tone={rejectionRate > 20 ? 'danger' : rejectionRate > 10 ? 'warning' : 'neutral'}
          active={rejectionRate > 10}
          title="Trong số task hiển thị trong kỳ đang chọn (khớp tab Nhiệm vụ), bao nhiêu % bị Từ chối"
        />
      </div>

      <div className="px-5 pb-4 pt-1">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', TONE[completionTone].bar)}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </DashboardCard>
  )
}

// ─── GlobalDashboard ──────────────────────────────────────────────────────────

export function GlobalDashboard({ d, periodLabel, scopeLabel = 'Toàn hệ thống', productStats }: {
  d: GlobalData; periodLabel: string
  /** "Toàn hệ thống" / "Team: X" / "Thành viên: Y" — phản ánh đúng ScopeFilter đang chọn ở page.tsx,
   * để subtitle các card không nói "Toàn hệ thống" trong khi đã bị khoan sâu về 1 team/1 người. */
  scopeLabel?: string
  /** Tải riêng qua GET /task-auto/product-video-stats (xem page.tsx) — undefined khi đang tải lần đầu. */
  productStats?: ProductVideoStats
}) {
  const tasks = d.tasks

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
          <div className="p-5 flex-1 flex flex-col justify-center">
            <StatusDonut tasks={tasks} size="md" layout="row" />
          </div>
        </DashboardCard>

        {/* Video theo tuyến nội dung */}
        <VideoByLineCard
          data={d.video_by_line}
          periodLabel={periodLabel}
          subtitle={scopeLabel}
        />

      </div>

      {/* ── 2-col: Video theo dòng sản phẩm | Sản phẩm được làm video (theo sản phẩm/theo dòng) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Video theo dòng sản phẩm (GMV/Traffic/Profit) — đếm theo task, 1 sản phẩm làm lại nhiều video vẫn tính đủ */}
        <VideoByLineCard
          data={(productStats?.video_by_product_line ?? []).map(p => ({ line: p.category, count: p.count }))}
          periodLabel={periodLabel}
          title="Video theo dòng sản phẩm"
          subtitle={scopeLabel}
          icon={Video} iconColor={CATEGORY.video.text} iconBg={CATEGORY.video.bg}
          itemLabel="Dòng" unitLabel="video đã duyệt"
          emptyLabel="Chưa có video nào được duyệt theo dòng sản phẩm"
        />

        {/* Sản phẩm được làm video — đếm SẢN PHẨM RIÊNG BIỆT, không đếm theo video — mặc định liệt kê
            từng sản phẩm, có thể chuyển sang xem gộp theo dòng sản phẩm */}
        <ProductVideoBreakdownCard
          byProduct={productStats?.products_with_video_list ?? []}
          byLine={productStats?.products_with_video_by_line ?? []}
          total={productStats?.products_with_video ?? 0}
          periodLabel={periodLabel}
          scopeLabel={scopeLabel}
        />

      </div>

    </div>
  )
}
