'use client'

import { cn } from '@/lib/utils'
import { TONE, type Tone } from './tokens'

interface Props {
  label: string
  value: number | string
  icon?: React.ElementType
  tone: Tone
  sub?: string
  /** false → tile renders in its dimmed/neutral state regardless of `tone` (e.g. "0 quá hạn" = good news, not a red tile). */
  active?: boolean
}

/** Value-first standalone stat tile — flat, no icon badge, matching DashboardCard/MetricStat's look. */
export function StatCard({ label, value, tone, sub, active = true }: Props) {
  const t = TONE[active ? tone : 'neutral']
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-200/60 px-5 py-4">
      <p className={cn('text-3xl font-black tracking-tight tabular-nums leading-none', t.text)}>{value ?? 0}</p>
      <p className="text-sm font-semibold text-slate-700 mt-2">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
