'use client'

import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import { ListTodo, Clock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { StatCard } from './StatCard'

interface GlobalData {
  tasks: Record<string, number> & { total: number }
  today_deadline: number
  overdue: number
  monthly_completed: number
}

export function buildGlobal(d: any): GlobalData {
  return {
    tasks: d.tasks ?? { total: 0 },
    today_deadline: d.today_deadline ?? 0,
    overdue: d.overdue ?? 0,
    monthly_completed: d.monthly_completed ?? 0,
  }
}

const STATUS_CONFIG = [
  { key: 'pending',     label: 'Chờ xử lý', color: '#94a3b8' },
  { key: 'assigned',    label: 'Đã giao',    color: '#3b82f6' },
  { key: 'in_progress', label: 'Đang làm',   color: '#f59e0b' },
  { key: 'submitted',   label: 'Đã nộp',     color: '#8b5cf6' },
  { key: 'approved',    label: 'Đã duyệt',   color: '#10b981' },
  { key: 'rejected',    label: 'Từ chối',    color: '#ef4444' },
] as const

function TaskTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-800">{d.name}</p>
      <p className="text-xs text-slate-500">{d.value} task · {d.payload.pct}%</p>
    </div>
  )
}

export function GlobalDashboard({ d }: { d: GlobalData }) {
  const tasks = d.tasks
  const total = tasks.total || 1

  const taskChartData = STATUS_CONFIG
    .map(s => ({
      name: s.label,
      value: tasks[s.key] ?? 0,
      fill: s.color,
      color: s.color,
      pct: Math.round(((tasks[s.key] ?? 0) / total) * 100),
    }))
    .filter(item => item.value > 0)

  return (
    <div className="space-y-5">

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Tổng task"
          value={tasks.total}
          icon={ListTodo}
          iconBg="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Đến hạn hôm nay"
          value={d.today_deadline}
          icon={Clock}
          iconBg="bg-amber-50 text-amber-600"
          sub={d.today_deadline > 0 ? 'Cần xử lý hôm nay' : undefined}
        />
        <StatCard
          label="Quá hạn"
          value={d.overdue}
          icon={AlertTriangle}
          iconBg={d.overdue > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}
          sub={d.overdue > 0 ? 'Cần xử lý ngay!' : undefined}
        />
        <StatCard
          label="Hoàn thành trong kỳ"
          value={d.monthly_completed}
          icon={CheckCircle2}
          iconBg="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Status donut chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-slate-900">Phân bố trạng thái task</h2>
          <Link
            href="/dashboard/task-auto/tasks"
            className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
          >
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {taskChartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <ListTodo className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Chưa có task nào trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Donut */}
            <div className="relative w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={86}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                  />
                  <Tooltip content={<TaskTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-extrabold text-slate-900">{tasks.total}</p>
                <p className="text-xs text-slate-400 mt-0.5">task</p>
              </div>
            </div>

            {/* Legend grid */}
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3.5 w-full">
              {STATUS_CONFIG.map(s => {
                const count = tasks[s.key] ?? 0
                const pct = tasks.total > 0 ? Math.round((count / tasks.total) * 100) : 0
                return (
                  <div key={s.key} className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: s.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1 mb-1">
                        <span className="text-xs text-slate-500 truncate">{s.label}</span>
                        <span className="text-sm font-bold shrink-0" style={{ color: count > 0 ? s.color : '#cbd5e1' }}>
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
