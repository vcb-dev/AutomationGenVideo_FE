'use client'

import { cn } from '@/lib/utils'

const STATUSES = [
  { key: 'pending',     color: 'bg-slate-300',   label: 'Chờ xử lý' },
  { key: 'assigned',    color: 'bg-blue-400',    label: 'Đã giao' },
  { key: 'in_progress', color: 'bg-amber-400',   label: 'Đang làm' },
  { key: 'submitted',   color: 'bg-purple-400',  label: 'Đã nộp' },
  { key: 'approved',    color: 'bg-emerald-500', label: 'Đã duyệt' },
  { key: 'rejected',    color: 'bg-red-400',     label: 'Từ chối' },
] as const

export function StatusBar({ tasks }: { tasks: Record<string, number> }) {
  const total = STATUSES.reduce((sum, s) => sum + (tasks[s.key] ?? 0), 0) || 1

  return (
    <div className="space-y-3">
      <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden gap-px">
        {STATUSES.map(s => {
          const count = tasks[s.key] ?? 0
          const pct = (count / total) * 100
          if (pct < 1) return null
          return (
            <div
              key={s.key}
              className={cn(s.color, 'transition-all')}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${count}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {STATUSES.map(s => {
          const count = tasks[s.key] ?? 0
          return (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={cn('w-2 h-2 rounded-full shrink-0', s.color)} />
              {s.label}
              <strong className={cn('font-semibold', count > 0 ? 'text-slate-800' : 'text-slate-300')}>{count}</strong>
            </span>
          )
        })}
      </div>
    </div>
  )
}
