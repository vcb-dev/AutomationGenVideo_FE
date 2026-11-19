'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { TONE, kpiTone, type Tone } from './tokens'

const STATUS_LABEL: Record<Tone, string> = {
  success: 'Đã đạt mục tiêu',
  brand: 'Đúng tiến độ',
  warning: 'Cần tăng tốc',
  danger: 'Đang chậm',
  info: '', neutral: '', violet: '',
}

/** Vòng tiến độ KPI tháng + số đạt/mục tiêu + nhãn trạng thái bằng chữ (không chỉ dựa vào màu). */
export function KpiProgress({ completed, total_target, unit = 'video' }: { completed: number; total_target: number; unit?: string }) {
  const pct = total_target > 0 ? Math.min(100, Math.round((completed / total_target) * 100)) : 0
  const tone = kpiTone(pct)
  const t = TONE[tone]
  const data = [{ value: pct, fill: t.hex }]

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28 shrink-0" role="img" aria-label={`Đạt ${pct}% KPI tháng`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="74%" outerRadius="100%"
            startAngle={90} endAngle={-270}
            data={data} barSize={10}
          >
            <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold leading-none tabular-nums text-slate-900">{pct}%</span>
          <span className="mt-1 text-[11px] text-slate-500">hoàn thành</span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Đã duyệt / mục tiêu</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold leading-none tabular-nums text-slate-900">{completed.toLocaleString('vi-VN')}</span>
          <span className="text-sm text-slate-500 tabular-nums">/ {total_target.toLocaleString('vi-VN')} {unit}</span>
        </p>
        <span className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', t.bg, t.text)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden />
          {STATUS_LABEL[tone]}
        </span>
      </div>
    </div>
  )
}
