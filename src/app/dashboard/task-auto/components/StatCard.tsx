'use client'

import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: number | string
  icon: React.ElementType
  iconBg: string
  accent?: string
  valueCls?: string
  sub?: string
}

export function StatCard({ label, value, icon: Icon, iconBg, accent, valueCls, sub }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
      {accent && <div className={cn('h-1 w-full', accent)} />}
      <div className="px-4 py-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-none mb-2">{label}</p>
          <p className={cn('text-3xl font-black leading-none', valueCls ?? 'text-slate-800')}>{value ?? 0}</p>
          {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
