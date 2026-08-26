'use client'

import {
  Users, Target, Video, FileText, Package,
  BarChart3, XCircle, CheckCircle2, Send, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductVideoStats } from '@/lib/api/task-auto'
import { StatusBar } from './StatusBar'
import { KpiProgress } from './KpiProgress'
import { DashboardCard, MetricStat, PeriodBadge, MonthPacingHint } from './DashboardUI'
import { VideoByLineCard } from './VideoByLineCard'
import { ProductVideoBreakdownCard } from './ProductVideoBreakdownCard'
import { TONE, CATEGORY, rateTone } from './tokens'

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `Tháng ${m}/${y}`
}

// ─── Team Performance Summary ────────────────────────────────────────────────

function TeamPerformanceSummary({ tasks, members, periodLabel }: { tasks: any; members: any[]; periodLabel: string }) {
  const total    = tasks.total ?? 0
  const approved = tasks.approved ?? 0
  const rejected = tasks.rejected ?? 0
  const submitted = tasks.submitted ?? 0
  const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0
  const activeMembers  = members.filter(m => (m.in_progress + m.submitted + (m.pending ?? 0)) > 0).length

  return (
    <DashboardCard
      icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-50"
      title="Hiệu suất Team"
      right={<PeriodBadge label={periodLabel} />}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4">
        <MetricStat
          icon={CheckCircle2} label="Tỷ lệ hoàn thành" value={`${completionRate}%`}
          sub={`${approved}/${total} task`}
          tone={rateTone(completionRate)}
        />
        <MetricStat
          icon={Send} label="Chờ duyệt" value={submitted} sub="task đã nộp"
          tone="violet" active={submitted > 0}
        />
        <MetricStat
          icon={XCircle} label="Bị từ chối" value={rejected} sub="cần xử lý lại"
          tone="danger" active={rejected > 0}
        />
        <MetricStat
          icon={Activity} label="Đang hoạt động" value={activeMembers} sub={`/ ${members.length} thành viên`}
          tone="brand"
        />
      </div>

      <div className="px-5 pb-4 pt-1">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', TONE[rateTone(completionRate)].bar)}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </DashboardCard>
  )
}

// ─── Member KPI cell ─────────────────────────────────────────────────────────

function MemberKpiCell({ approved, kpiTarget }: { approved: number; kpiTarget: number }) {
  if (!kpiTarget) return <span className="text-xs text-slate-300 pr-2">Chưa có KPI</span>
  const pct = Math.min(100, Math.round((approved / kpiTarget) * 100))
  const t   = TONE[rateTone(pct)]

  return (
    <div className="flex items-center gap-2 pr-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', t.bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-bold tabular-nums whitespace-nowrap', t.text)}>
        {approved}/{kpiTarget}
      </span>
    </div>
  )
}

// ─── Count badge ─────────────────────────────────────────────────────────────

function CountBadge({ value, color, bg }: { value: number; color: string; bg: string }) {
  if (value <= 0) return <span className="block text-right text-slate-200 text-sm font-bold pr-1">—</span>
  return (
    <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold', bg, color)}>
      {value}
    </span>
  )
}

// ─── KPI target tile ─────────────────────────────────────────────────────────

function KpiTargetTile({ icon: Icon, label, value, category }: {
  icon: any; label: string; value: number; category: keyof typeof CATEGORY
}) {
  const c = CATEGORY[category]
  return (
    <div className={cn('rounded-xl border px-3 py-3.5 text-center', c.bg, c.border)}>
      <div className={cn('flex items-center justify-center gap-1 mb-2', c.text)}>
        <Icon className="w-3.5 h-3.5" />
        <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className={cn('text-2xl font-extrabold', c.text)}>{value ?? 0}</p>
      <p className="text-[10px] text-slate-400 mt-1">mục tiêu tháng</p>
    </div>
  )
}

// ─── TeamDashboard ────────────────────────────────────────────────────────────

export function TeamDashboard({ d, periodLabel, productStats }: {
  d: any; periodLabel: string
  /** Tải riêng qua GET /task-auto/product-video-stats (xem page.tsx) — undefined khi đang tải lần đầu. */
  productStats?: ProductVideoStats
}) {
  const tasks: any    = d.tasks ?? { total: 0 }
  const members: any[] = d.members ?? []
  const kpi = d.kpi

  return (
    <div className="space-y-5">

      {/* ── Team Performance ── */}
      <TeamPerformanceSummary tasks={tasks} members={members} periodLabel={periodLabel} />

      {/* ── Phân bố trạng thái | Video theo tuyến nội dung ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Donut chart phân bố */}
        <DashboardCard
          icon={BarChart3} iconColor="text-slate-500" iconBg="bg-slate-100"
          title="Phân bố trạng thái"
          action={{ href: '/dashboard/task-auto/tasks', label: 'Xem tất cả' }}
          className="flex flex-col"
        >
          <div className="px-5 py-4 flex-1">
            <StatusBar tasks={tasks} />
          </div>
          {/* Rejected warning */}
          {(tasks.rejected ?? 0) > 0 && (
            <div className="mx-4 mb-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-xs text-red-600 font-semibold">
                {tasks.rejected} task bị từ chối — nhắc thành viên xử lý lại
              </span>
            </div>
          )}
        </DashboardCard>

        {/* Video theo tuyến nội dung — theo đúng bộ lọc ngày ở trên, không khoá cứng theo tháng KPI */}
        <VideoByLineCard
          data={d.video_by_line}
          periodLabel={periodLabel}
          subtitle={d.team?.name}
        />

      </div>

      {/* ── Video theo dòng sản phẩm | Sản phẩm được làm video — như màn Admin, thu hẹp về đúng team này ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <VideoByLineCard
          data={(productStats?.video_by_product_line ?? []).map(p => ({ line: p.category, count: p.count }))}
          periodLabel={periodLabel}
          title="Video theo dòng sản phẩm"
          subtitle={d.team?.name}
          icon={Video} iconColor={CATEGORY.video.text} iconBg={CATEGORY.video.bg}
          itemLabel="Dòng" unitLabel="video đã duyệt"
          emptyLabel="Chưa có video nào được duyệt theo dòng sản phẩm"
        />

        <ProductVideoBreakdownCard
          byProduct={productStats?.products_with_video_list ?? []}
          byLine={productStats?.products_with_video_by_line ?? []}
          total={productStats?.products_with_video ?? 0}
          periodLabel={periodLabel}
          scopeLabel={d.team?.name ?? 'Team'}
        />

      </div>

      {/* ── KPI Team ── */}
      {kpi && (
        <DashboardCard
          icon={Target} iconColor="text-indigo-600" iconBg="bg-indigo-50"
          title={`KPI Team — ${formatMonth(kpi.month)}`}
          action={{ href: '/dashboard/task-auto/kpi', label: 'Xem KPI' }}
        >
          <div className="px-5 py-4 space-y-4">
            {/* Progress circle */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-xl border border-indigo-100/60 space-y-3">
              <KpiProgress completed={kpi.completed} total_target={kpi.total_target} />
              <MonthPacingHint completed={kpi.completed} target={kpi.total_target} achievedLabel="Team đã đạt KPI tháng này!" />
            </div>

            {/* KPI targets breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <KpiTargetTile icon={Video} label="Video win" value={kpi.video_win ?? 0} category="video" />
              <KpiTargetTile icon={FileText} label="Content" value={kpi.content_new ?? 0} category="content" />
              <KpiTargetTile icon={Package} label="Sản phẩm" value={kpi.product_planned ?? 0} category="product" />
            </div>
          </div>
        </DashboardCard>
      )}

      {/* ── Member table ── */}
      <DashboardCard
        icon={Users} iconColor="text-indigo-600" iconBg="bg-indigo-50"
        title={`Thành viên (${members.length})`}
        action={{ href: '/dashboard/task-auto/teams', label: 'Quản lý' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thành viên</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Chờ</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wide">Đang làm</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">Đã nộp</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Đã duyệt</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-red-400 uppercase tracking-wide">Từ chối</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-indigo-500 uppercase tracking-wide min-w-[140px]">KPI tháng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Chưa có thành viên
                  </td>
                </tr>
              ) : members.map((m: any) => {
                const kpiPct    = m.kpi_target > 0 ? (m.kpi_completed / m.kpi_target) * 100 : 100
                const isBehind  = m.kpi_target > 0 && kpiPct < 40
                const isWarning = m.kpi_target > 0 && kpiPct >= 40 && kpiPct < 70
                const rejected  = m.rejected ?? 0

                return (
                  <tr key={m.user_id}
                    className={cn(
                      'hover:bg-slate-50/60 transition-colors',
                      isBehind  ? 'bg-red-50/30'   : '',
                      isWarning ? 'bg-amber-50/30'  : '',
                    )}
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ring-2 ring-white">
                          {m.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm leading-none truncate">{m.full_name}</p>
                          <p className="text-xs text-slate-400 mt-1 truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Pending */}
                    <td className="px-3 py-3.5 text-center">
                      <CountBadge value={m.pending ?? 0} color="text-slate-600" bg="bg-slate-100" />
                    </td>
                    {/* In progress */}
                    <td className="px-3 py-3.5 text-center">
                      <CountBadge value={m.in_progress} color="text-amber-700" bg="bg-amber-100" />
                    </td>
                    {/* Submitted */}
                    <td className="px-3 py-3.5 text-center">
                      <CountBadge value={m.submitted} color="text-violet-700" bg="bg-violet-100" />
                    </td>
                    {/* Approved */}
                    <td className="px-3 py-3.5 text-center">
                      <CountBadge value={m.approved} color="text-emerald-700" bg="bg-emerald-100" />
                    </td>
                    {/* Rejected */}
                    <td className="px-3 py-3.5 text-center">
                      <CountBadge value={rejected} color="text-red-600" bg="bg-red-100" />
                    </td>
                    {/* KPI progress */}
                    <td className="px-4 py-3.5">
                      <MemberKpiCell approved={m.kpi_completed} kpiTarget={m.kpi_target} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        {members.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-50 flex flex-wrap items-center gap-4 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 inline-block" /> Chậm KPI (&lt;40%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-100 inline-block" /> Cần cố gắng (40–70%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-100 inline-block" /> Đang tốt (≥70%)</span>
          </div>
        )}
      </DashboardCard>

    </div>
  )
}
