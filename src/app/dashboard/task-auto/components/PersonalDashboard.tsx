'use client'

import {
  Target, Send, Zap,
  AlertTriangle, Clock, Award, TrendingUp,
} from 'lucide-react'
import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ProductVideoStats } from '@/lib/api/task-auto'
import { useAuthStore } from '@/store/auth-store'
import { DashboardCard, KpiTile, LiveAlertTiles, SectionHeader } from './DashboardUI'
import { VideoByLineCard } from './VideoByLineCard'
import { ContentByClassificationCard } from './ContentByClassificationCard'
import { ProductVideoBreakdownCard } from './ProductVideoBreakdownCard'
import { DailyVideoPlanCard } from './DailyVideoPlanCard'
import { TONE, CATEGORY, kpiTone, type Tone, type Category } from './tokens'

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `Tháng ${m}/${y}`
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

const formatCount = (n: number) => n.toLocaleString('vi-VN')

function KpiMetricRow({ label, actual, target, category }: {
  label: string; actual: number; target: number; category: Category
}) {
  const c = CATEGORY[category]
  const hasTarget = target > 0
  const pct = hasTarget ? Math.min(100, Math.round((actual / target) * 100)) : 0
  const reached = hasTarget && actual >= target

  return (
    <div className="px-5 py-3 border-b border-slate-100 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-600 min-w-0 truncate">{label}</span>
        <span className="flex items-baseline gap-1 whitespace-nowrap shrink-0">
          <span className={cn('text-base font-extrabold tabular-nums', reached ? 'text-emerald-600' : 'text-slate-900')}>
            {formatCount(actual)}
          </span>
          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            / {hasTarget ? formatCount(target) : '—'}
          </span>
          {hasTarget && (
            <span className="sr-only">{reached ? 'đã đạt mục tiêu' : `mới đạt ${pct} phần trăm mục tiêu`}</span>
          )}
        </span>
      </div>
      {hasTarget && (
        <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', reached ? 'bg-emerald-500' : c.bar)}
            style={{ width: `${Math.max(pct, actual > 0 ? 4 : 0)}%` }}
          />
        </div>
      )}
    </div>
  )
}

/** Các chỉ tiêu KPI tháng có số đạt hoặc mục tiêu (ẩn dòng 0/0 cho gọn). */
function kpiRows(kpi: any) {
  const rows = [
    { label: 'Tổng video sản xuất', actual: kpi.total_actual ?? kpi.completed ?? 0, target: kpi.total_target ?? 0, category: 'video' },
    { label: 'Content mới làm được', actual: kpi.content_new_actual ?? 0, target: kpi.content_new ?? 0, category: 'content' },
    { label: 'Content phân tích theo PAAST', actual: kpi.content_paast_analyzed_actual ?? 0, target: kpi.content_paast_analyzed ?? 0, category: 'content' },
    { label: 'Content win được team cover lại', actual: kpi.content_win_cover_actual ?? 0, target: kpi.content_win_cover ?? 0, category: 'content' },
    { label: 'Số sản phẩm GMV', actual: kpi.product_gmv_actual ?? 0, target: kpi.product_gmv ?? 0, category: 'product' },
    { label: 'Số sản phẩm Traffic', actual: kpi.product_traffic_actual ?? 0, target: kpi.product_traffic ?? 0, category: 'product' },
    { label: 'Số sản phẩm Profit', actual: kpi.product_profit_actual ?? 0, target: kpi.product_profit ?? 0, category: 'product' },
    { label: 'Số sản phẩm sưu tầm và test win', actual: kpi.product_collect_test_win_actual ?? 0, target: kpi.product_collect_test_win ?? 0, category: 'product' },
  ] satisfies { label: string; actual: number; target: number; category: Category }[]

  return rows.filter(r => r.actual > 0 || r.target > 0)
}

function KpiMetricsCard({ kpi }: { kpi: any }) {
  return (
    <DashboardCard
      title="Chỉ tiêu KPI tháng"
      subtitle={`${formatMonth(kpi.month)} · số đạt / mục tiêu, không theo bộ lọc ngày`}
      action={{ href: '/dashboard/task-auto/kpi', label: 'Xem KPI' }}
      className="h-full"
    >
      <div>
        {kpiRows(kpi).map(r => <KpiMetricRow key={r.label} {...r} />)}
      </div>
    </DashboardCard>
  )
}

// ─── PersonalDashboard ──────────────────────────────────────────────────────

export function PersonalDashboard({ d, productStats, trafficCard }: {
  d: any
  /** Tải riêng qua GET /task-auto/product-video-stats (xem page.tsx) — undefined khi đang tải lần đầu. */
  productStats?: ProductVideoStats
  /** Biểu đồ "Traffic theo ngày" (TrafficTrendCard) — page.tsx dựng sẵn theo bộ lọc ngày. */
  trafficCard?: ReactNode
}) {
  const { user } = useAuthStore()
  const tasks = d.tasks ?? {}
  const kpi   = d.kpi
  const overdue = d.overdue ?? 0
  const todayDeadline = d.today_deadline ?? 0
  const traffic: number = d.traffic_month ?? 0

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
  const hasKpiCard = !!kpi && kpiRows(kpi).length > 0

  return (
    <div className="space-y-8">

      {/* ── Lời chào + việc quan trọng nhất + tiến độ KPI tháng ── */}
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{getGreeting()}, {firstName}</h2>
          <p className={cn('mt-2 inline-flex items-start gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', insightTint.bg, insightTint.text)}>
            <InsightIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {insight.text}
          </p>
        </div>
        {kpi && (
          <div className="w-full sm:w-72 shrink-0 rounded-xl bg-slate-50 px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">KPI {formatMonth(kpi.month).toLowerCase()}</span>
              <span className={cn('text-sm font-bold tabular-nums', kpiTint.text)}>{kpiPct}%</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <span className="text-xl font-bold tabular-nums text-slate-900">{kpi.completed ?? 0}</span> / {kpi.total_target ?? 0} video đã duyệt
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
              <div className={cn('h-full rounded-full transition-[width] duration-700', kpiTint.bar)} style={{ width: `${kpiPct}%` }} />
            </div>
          </div>
        )}
      </section>

      {/* ── Cần xử lý ngay (live) | Trong kỳ ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-x-5 gap-y-8">
        <section aria-label="Cần xử lý ngay" className="flex flex-col xl:col-span-2">
          <SectionHeader title="Cần xử lý ngay" description="Tính đến hiện tại" live />
          <LiveAlertTiles overdue={overdue} todayDeadline={todayDeadline} className="flex-1" />
        </section>
        <section aria-label="Trong kỳ" className="flex flex-col xl:col-span-3">
          <SectionHeader title="Trong kỳ" description="Theo bộ lọc ngày phía trên" />
          <div className="grid flex-1 grid-cols-2 md:grid-cols-3 gap-3">
            <KpiTile
              label="Đang xử lý" value={inProgressTotal} icon={Zap} tone="warning"
              hint={`${tasks.in_progress ?? 0} đang làm · ${tasks.assigned ?? 0} đã giao`}
            />
            <KpiTile
              label="Chờ duyệt" value={tasks.submitted ?? 0} icon={Send} tone="violet"
              hint="Đã nộp, chờ Leader duyệt"
            />
            <KpiTile
              label="Traffic đã báo cáo" value={formatCount(traffic)} icon={TrendingUp} tone="info"
              hint={traffic > 0 ? 'Lần báo cáo gần nhất trong kỳ' : 'Chưa nộp báo cáo trong kỳ'}
              className="col-span-2 md:col-span-1"
            />
          </div>
        </section>
      </div>

      {/* ── Traffic theo ngày & KPI tháng ── */}
      <section aria-label="Traffic và KPI tháng">
        <SectionHeader title="Traffic & KPI tháng" description="Traffic tự báo cáo theo từng ngày và mức đạt từng chỉ tiêu trong tháng" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {trafficCard && (
            <div className={cn('flex min-w-0 [&>*]:flex-1', !hasKpiCard && 'lg:col-span-2')}>
              {trafficCard}
            </div>
          )}
          {hasKpiCard && <KpiMetricsCard kpi={kpi} />}
        </div>
      </section>

      {/* ── Video theo tuyến: đã làm so với mục tiêu | kế hoạch từng ngày (cùng nói về A1–A5) ── */}
      <section aria-label="Video theo tuyến">
        <SectionHeader title="Video theo tuyến A1–A5" description="Đã duyệt so với mục tiêu, và số video cần làm mỗi ngày để kịp KPI" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <VideoByLineCard
            data={d.video_by_line}
            title="Video theo tuyến nội dung"
            subtitle="Cột đậm: đã duyệt trong kỳ · cột mờ: mục tiêu KPI"
          />
          <DailyVideoPlanCard
            month={kpi?.month}
            monthlyTarget={kpi?.total_target ?? 0}
            completed={kpi?.completed ?? 0}
            contentAllocations={kpi?.content_allocations}
          />
        </div>
      </section>

      {/* ── Sản phẩm & content ── */}
      <section aria-label="Sản phẩm và content">
        <SectionHeader title="Sản phẩm & content" description="Của tôi, trong kỳ đã chọn" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          <VideoByLineCard
            data={(productStats?.video_by_product_line ?? []).map(p => ({ line: p.category, count: p.count }))}
            title="Video theo dòng sản phẩm"
            subtitle="GMV · Traffic · Profit"
            itemLabel="Dòng" unitLabel="video đã duyệt"
            emptyLabel="Chưa có video nào được duyệt theo dòng sản phẩm"
          />
          <ContentByClassificationCard data={d.content_by_classification} subtitle="Task của tôi theo phân loại content" />
          <ProductVideoBreakdownCard
            byProduct={productStats?.products_with_video_list ?? []}
            byLine={productStats?.products_with_video_by_line ?? []}
            total={productStats?.products_with_video ?? 0}
            scopeLabel="Của tôi"
          />
        </div>
      </section>

    </div>
  )
}
