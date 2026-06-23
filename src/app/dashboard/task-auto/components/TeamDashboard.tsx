'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ListTodo, CheckCircle2, TrendingUp, Users, Target, ArrowRight, Video, FileText, Package, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatCard } from './StatCard'
import { StatusBar } from './StatusBar'
import { KpiProgress } from './KpiProgress'

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `Tháng ${m}/${y}`
}

function MiniProgressBar({ value, max, color, bg }: { value: number; max: number; color: string; bg: string }) {
  if (!max || max <= 0) return <span className="block text-center text-xs text-slate-300">—</span>
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className={cn('w-16 h-1.5 rounded-full overflow-hidden', bg)}>
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-slate-400">{value}/{max}</span>
    </div>
  )
}

function MemberBadge({ value, activeColor, activeBg }: { value: number; activeColor: string; activeBg: string }) {
  if (value <= 0) return <span className="block text-right text-slate-300 text-sm">—</span>
  return (
    <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold', activeBg, activeColor)}>
      {value}
    </span>
  )
}

export function TeamDashboard({ d }: { d: any }) {
  const tasks   = d.tasks ?? { total: 0 }
  const members: any[] = d.members ?? []
  const kpi = d.kpi

  const memberBarData = members.map((m: any) => ({
    name: m.full_name?.split(' ').slice(-2).join(' ') ?? m.email?.split('@')[0] ?? '?',
    'Đang làm': m.in_progress ?? 0,
    'Đã nộp':   m.submitted ?? 0,
    'Đã duyệt': m.approved ?? 0,
  }))

  const barChartHeight = Math.max(160, members.length * 52)

  return (
    <div className="space-y-5">

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tổng task team" value={tasks.total ?? 0}       icon={ListTodo}     iconBg="bg-indigo-50 text-indigo-600" />
        <StatCard label="Đang làm"       value={tasks.in_progress ?? 0} icon={TrendingUp}   iconBg="bg-amber-50 text-amber-600" />
        <StatCard label="Đã nộp"         value={tasks.submitted ?? 0}   icon={CheckCircle2} iconBg="bg-purple-50 text-purple-600" />
        <StatCard label="Đã duyệt"       value={tasks.approved ?? 0}    icon={CheckCircle2} iconBg="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Status + KPI */}
      <div className={cn('grid grid-cols-1 gap-3', kpi ? 'lg:grid-cols-2' : '')}>

        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-900">Phân bố trạng thái</h2>
            <Link href="/dashboard/task-auto/tasks"
              className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
              Chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <StatusBar tasks={tasks} />
        </div>

        {kpi && (
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900">KPI Team — {formatMonth(kpi.month)}</h2>
              </div>
              <Link href="/dashboard/task-auto/kpi"
                className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
                Xem KPI <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <KpiProgress completed={kpi.completed} total_target={kpi.total_target} />

            {/* KPI 3-section breakdown */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1.5">
                  <Video className="w-3.5 h-3.5 text-orange-500" />
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Video win</p>
                </div>
                <p className="text-2xl font-extrabold text-orange-700">{kpi.video_win ?? 0}</p>
                <p className="text-[10px] text-orange-400 mt-0.5">mục tiêu</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Content</p>
                </div>
                <p className="text-2xl font-extrabold text-emerald-700">{kpi.content_new ?? 0}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">mới tháng này</p>
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1.5">
                  <Package className="w-3.5 h-3.5 text-violet-600" />
                  <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">Sản phẩm</p>
                </div>
                <p className="text-2xl font-extrabold text-violet-700">{kpi.product_planned ?? 0}</p>
                <p className="text-[10px] text-violet-400 mt-0.5">kế hoạch</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Member table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Thành viên ({members.length})</h2>
          </div>
          <Link href="/dashboard/task-auto/teams"
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
            Quản lý <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Thành viên</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-amber-500">Đang làm</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-purple-500">Đã nộp</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-emerald-600">Duyệt</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-orange-500">
                  <span className="flex items-center justify-end gap-1"><Video className="w-3 h-3" /> Win</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600">
                  <span className="flex items-center justify-end gap-1"><FileText className="w-3 h-3" /> Content</span>
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-violet-600">
                  <span className="flex items-center justify-end gap-1"><Package className="w-3 h-3" /> SP</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Chưa có thành viên
                  </td>
                </tr>
              ) : members.map((m: any) => (
                <tr key={m.user_id} className="hover:bg-slate-50/60 transition-colors">
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
                  <td className="px-3 py-3 text-center">
                    <MemberBadge value={m.in_progress} activeColor="text-amber-700" activeBg="bg-amber-100" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <MemberBadge value={m.submitted} activeColor="text-purple-700" activeBg="bg-purple-100" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <MemberBadge value={m.approved} activeColor="text-emerald-700" activeBg="bg-emerald-100" />
                  </td>
                  <td className="px-4 py-3">
                    <MiniProgressBar value={m.approved} max={m.kpi_video_win} color="bg-orange-400" bg="bg-orange-100" />
                  </td>
                  <td className="px-4 py-3">
                    <MiniProgressBar value={0} max={m.kpi_content_new} color="bg-emerald-400" bg="bg-emerald-100" />
                  </td>
                  <td className="px-5 py-3">
                    <MiniProgressBar value={0} max={m.kpi_product_planned} color="bg-violet-400" bg="bg-violet-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
