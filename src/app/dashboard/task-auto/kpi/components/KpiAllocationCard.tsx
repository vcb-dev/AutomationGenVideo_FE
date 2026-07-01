'use client'

import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export interface AllocCardItem {
  percent: number
  content_line?: { name: string } | null
  product_line?: { name: string } | null
}

export function AllocCardSection({
  items, label, icon,
  barColor, bgColor, borderColor, labelColor, totalColor,
}: {
  items: AllocCardItem[]
  label: string
  icon: React.ReactNode
  barColor: string
  bgColor: string
  borderColor: string
  labelColor: string
  totalColor: string
}) {
  const total   = items.reduce((s, a) => s + a.percent, 0)
  const isValid = total === 100

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', bgColor, borderColor)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={labelColor}>{icon}</span>
          <span className={cn('text-xs font-bold uppercase tracking-wider', labelColor)}>{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isValid
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          }
          <span className={cn(
            'text-xs font-black px-2 py-0.5 rounded-full',
            isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          )}>
            {total}%
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-2">Chưa có phân bổ</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((a, i) => {
            const name = a.content_line?.name ?? a.product_line?.name ?? '—'
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700 truncate">{name}</span>
                  <span className={cn('text-sm font-black shrink-0', totalColor)}>{a.percent}%</span>
                </div>
                <div className="h-2 bg-white/70 rounded-full overflow-hidden border border-black/5">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${a.percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
