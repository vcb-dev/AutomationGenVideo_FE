'use client'

import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import { ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUSES = [
  { key: 'pending',     color: '#94a3b8', label: 'Chờ xử lý' },
  { key: 'assigned',    color: '#3b82f6', label: 'Đã giao' },
  { key: 'in_progress', color: '#f59e0b', label: 'Đang làm' },
  { key: 'submitted',   color: '#8b5cf6', label: 'Đã nộp' },
  { key: 'approved',    color: '#10b981', label: 'Đã duyệt' },
  { key: 'rejected',    color: '#ef4444', label: 'Từ chối' },
] as const

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-800">{d.name}</p>
      <p className="text-xs text-slate-500">{d.value} task · {d.payload.pct}%</p>
    </div>
  )
}

export function StatusBar({ tasks }: { tasks: Record<string, number> }) {
  const total = STATUSES.reduce((sum, s) => sum + (tasks[s.key] ?? 0), 0)

  const chartData = STATUSES
    .map(s => ({
      name: s.label,
      value: tasks[s.key] ?? 0,
      fill: s.color,
      color: s.color,
      pct: total > 0 ? Math.round(((tasks[s.key] ?? 0) / total) * 100) : 0,
    }))
    .filter(d => d.value > 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <ListTodo className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">Chưa có task nào</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut chart */}
      <div className="relative w-36 h-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={66}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            />
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-slate-900">{total}</span>
          <span className="text-[10px] text-slate-400 -mt-0.5">tasks</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full grid grid-cols-2 gap-x-6 gap-y-2.5">
        {STATUSES.map(s => {
          const count = tasks[s.key] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={s.key} className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: s.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1 mb-1">
                  <span className="text-xs text-slate-500 truncate">{s.label}</span>
                  <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color: count > 0 ? s.color : '#cbd5e1' }}>
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
  )
}
