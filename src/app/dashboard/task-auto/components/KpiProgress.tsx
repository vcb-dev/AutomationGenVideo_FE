'use client'

import { cn } from '@/lib/utils'

export function KpiProgress({ completed, total_target }: { completed: number; total_target: number }) {
  const pct = total_target > 0 ? Math.min(100, Math.round((completed / total_target) * 100)) : 0
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-indigo-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{completed} / {total_target} task</span>
        <span className={cn('font-bold', pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-indigo-600' : 'text-amber-600')}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn(color, 'h-full rounded-full transition-all')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
