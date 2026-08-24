'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE, kpiTone, type Tone } from './tokens'

const STATUS_LABEL: Record<Tone, string> = {
  success: 'Đạt mục tiêu!',
  brand: 'Gần đạt',
  warning: 'Đang tiến hành',
  danger: 'Cần cố gắng',
  info: '', neutral: '', violet: '',
}

export function KpiProgress({ completed, total_target }: { completed: number; total_target: number }) {
  const pct = total_target > 0 ? Math.min(100, Math.round((completed / total_target) * 100)) : 0
  const tone = kpiTone(pct)
  const t = TONE[tone]
  const data = [{ value: pct, fill: t.hex }]

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
          <span className={cn('text-lg font-extrabold leading-none', t.text)}>{pct}%</span>
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Tiến độ KPI</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-slate-900 leading-none">{completed}</span>
          <span className="text-sm text-slate-400">/ {total_target} task</span>
        </div>
        <p className={cn('flex items-center gap-1 text-xs font-semibold mt-1.5', t.text)}>
          {pct >= 100 && <CheckCircle2 className="w-3.5 h-3.5" />}
          {STATUS_LABEL[tone]}
        </p>
      </div>
    </div>
  )
}
