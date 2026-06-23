'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

export function KpiProgress({ completed, total_target }: { completed: number; total_target: number }) {
  const pct = total_target > 0 ? Math.min(100, Math.round((completed / total_target) * 100)) : 0
  const barColor = pct >= 100 ? '#10b981' : pct >= 70 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#f87171'
  const textColor = pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-indigo-600' : pct >= 40 ? 'text-amber-500' : 'text-red-500'
  const statusLabel = pct >= 100 ? '✓ Đạt mục tiêu!' : pct >= 70 ? 'Gần đạt' : pct >= 40 ? 'Đang tiến hành' : 'Cần cố gắng'

  const data = [{ value: pct, fill: barColor }]

  return (
    <div className="flex items-center gap-5">
      {/* Radial chart */}
      <div className="relative w-24 h-24 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="68%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            data={data}
            barSize={10}
          >
            <RadialBar
              background={{ fill: '#f1f5f9' }}
              dataKey="value"
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={cn('text-lg font-extrabold leading-none', textColor)}>{pct}%</span>
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Tiến độ KPI</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-slate-900 leading-none">{completed}</span>
          <span className="text-sm text-slate-400">/ {total_target} task</span>
        </div>
        <p className={cn('text-xs font-semibold mt-1.5', textColor)}>{statusLabel}</p>
      </div>
    </div>
  )
}
