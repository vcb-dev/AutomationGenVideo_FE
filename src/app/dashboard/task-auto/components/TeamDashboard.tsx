'use client'

import {
  Users, Target, ArrowRight, Video, FileText, Package,
  BarChart3, Award, XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusBar } from './StatusBar'
import { KpiProgress } from './KpiProgress'

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `Tháng ${m}/${y}`
}

// ─── Month Pacing Hint ───────────────────────────────────────────────────────

function MonthPacingHint({ completed, target }: { completed: number; target: number }) {
  if (!target) return null
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft    = daysInMonth - now.getDate() + 1
  const remaining   = Math.max(0, target - completed)

  if (remaining === 0) return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
      <Award className="w-3.5 h-3.5" /> Team đã đạt KPI tháng này!
    </div>
  )

  const rateNeeded = daysLeft > 0 ? remaining / daysLeft : 0
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

// ─── Team Performance Summary ────────────────────────────────────────────────

function TeamPerformanceSummary({ tasks, members }: { tasks: any; members: any[] }) {
  const total    = tasks.total ?? 0
  const approved = tasks.approved ?? 0
  const rejected = tasks.rejected ?? 0
  const submitted = tasks.submitted ?? 0
  const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0
  const activeMembers  = members.filter(m => (m.in_progress + m.submitted + (m.pending ?? 0)) > 0).length

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Hiệu suất Team</h2>
        <span className="text-xs text-slate-400 ml-auto">Tổng toàn thời gian</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
        <div className="px-4 py-4 text-center">
          <p className="text-xs font-semibold text-slate-400 mb-1">Tỷ lệ hoàn thành</p>
          <p className={cn('text-2xl font-black',
            completionRate >= 70 ? 'text-emerald-600' : completionRate >= 40 ? 'text-amber-500' : 'text-red-500',
          )}>
            {completionRate}%
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{approved}/{total} task</p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-xs font-semibold text-slate-400 mb-1">Chờ duyệt</p>
          <p className={cn('text-2xl font-black', submitted > 0 ? 'text-violet-600' : 'text-slate-300')}>
            {submitted}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">task đã nộp</p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-xs font-semibold text-slate-400 mb-1">Bị từ chối</p>
          <p className={cn('text-2xl font-black', rejected > 0 ? 'text-red-500' : 'text-slate-300')}>
            {rejected}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">cần xử lý lại</p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-xs font-semibold text-slate-400 mb-1">Đang hoạt động</p>
          <p className="text-2xl font-black text-indigo-600">{activeMembers}</p>
          <p className="text-xs text-slate-400 mt-0.5">/ {members.length} thành viên</p>
        </div>
      </div>

      <div className="px-5 pb-3">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700',
              completionRate >= 70 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-amber-400' : 'bg-red-400',
            )}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Member KPI cell ─────────────────────────────────────────────────────────

function MemberKpiCell({ approved, kpiTarget }: { approved: number; kpiTarget: number }) {
  if (!kpiTarget) return <span className="text-xs text-slate-300 pr-2">Chưa có KPI</span>
  const pct     = Math.min(100, Math.round((approved / kpiTarget) * 100))
  const barCls  = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
  const textCls = pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="flex items-center gap-2 pr-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', barCls)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-bold tabular-nums whitespace-nowrap', textCls)}>
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

// ─── TeamDashboard ────────────────────────────────────────────────────────────

export function TeamDashboard({ d }: { d: any }) {
  const tasks: any    = d.tasks ?? { total: 0 }
  const members: any[] = d.members ?? []
  const kpi = d.kpi

  return (
    <div className="space-y-5">

      {/* ── Team Performance ── */}
      <TeamPerformanceSummary tasks={tasks} members={members} />

      {/* ── Status distribution + KPI ── */}
      <div className={cn('grid grid-cols-1 gap-4', kpi ? 'lg:grid-cols-2' : '')}>

        {/* Donut chart phân bố */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-slate-500" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Phân bố trạng thái</h2>
            </div>
            <Link href="/dashboard/task-auto/tasks"
              className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-500">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-5 py-4">
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
        </div>

        {/* KPI Card */}
        {kpi && (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">KPI Team — {formatMonth(kpi.month)}</h2>
              </div>
              <Link href="/dashboard/task-auto/kpi"
                className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-500">
                Xem KPI <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Progress circle */}
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-xl border border-indigo-100/60 space-y-3">
                <KpiProgress completed={kpi.completed} total_target={kpi.total_target} />
                <MonthPacingHint completed={kpi.completed} target={kpi.total_target} />
              </div>

              {/* KPI targets breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-orange-50 border border-orange-100/80 px-3 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Video className="w-3.5 h-3.5 text-orange-500" />
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Video win</p>
                  </div>
                  <p className="text-2xl font-extrabold text-orange-700">{kpi.video_win ?? 0}</p>
                  <p className="text-[10px] text-orange-400 mt-1">mục tiêu tháng</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100/80 px-3 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Content</p>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-700">{kpi.content_new ?? 0}</p>
                  <p className="text-[10px] text-emerald-400 mt-1">mục tiêu tháng</p>
                </div>
                <div className="rounded-xl bg-violet-50 border border-violet-100/80 px-3 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Package className="w-3.5 h-3.5 text-violet-600" />
                    <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">Sản phẩm</p>
                  </div>
                  <p className="text-2xl font-extrabold text-violet-700">{kpi.product_planned ?? 0}</p>
                  <p className="text-[10px] text-violet-400 mt-1">mục tiêu tháng</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Member table ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Thành viên ({members.length})</h2>
          </div>
          <Link href="/dashboard/task-auto/teams"
            className="text-xs text-indigo-600 font-semibold hover:text-indigo-500 flex items-center gap-1">
            Quản lý <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Thành viên</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400">Chờ</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-amber-500">Đang làm</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-violet-500">Đã nộp</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-emerald-600">Đã duyệt</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-red-400">Từ chối</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-indigo-500 min-w-[140px]">KPI tháng</th>
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
                const kpiPct    = m.kpi_target > 0 ? (m.approved / m.kpi_target) * 100 : 100
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
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                          {m.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-none">{m.full_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Pending */}
                    <td className="px-3 py-3 text-center">
                      <CountBadge value={m.pending ?? 0} color="text-slate-600" bg="bg-slate-100" />
                    </td>
                    {/* In progress */}
                    <td className="px-3 py-3 text-center">
                      <CountBadge value={m.in_progress} color="text-amber-700" bg="bg-amber-100" />
                    </td>
                    {/* Submitted */}
                    <td className="px-3 py-3 text-center">
                      <CountBadge value={m.submitted} color="text-violet-700" bg="bg-violet-100" />
                    </td>
                    {/* Approved */}
                    <td className="px-3 py-3 text-center">
                      <CountBadge value={m.approved} color="text-emerald-700" bg="bg-emerald-100" />
                    </td>
                    {/* Rejected */}
                    <td className="px-3 py-3 text-center">
                      <CountBadge value={rejected} color="text-red-600" bg="bg-red-100" />
                    </td>
                    {/* KPI progress */}
                    <td className="px-4 py-3">
                      <MemberKpiCell approved={m.approved} kpiTarget={m.kpi_target} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        {members.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-50 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 inline-block" /> Chậm KPI (&lt;40%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-100 inline-block" /> Cần cố gắng (40–70%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-100 inline-block" /> Đang tốt (≥70%)</span>
          </div>
        )}
      </div>

    </div>
  )
}
