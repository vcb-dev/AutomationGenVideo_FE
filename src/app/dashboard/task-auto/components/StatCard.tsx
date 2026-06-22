'use client'

import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: number | string
  icon: React.ElementType
  iconBg: string
  sub?: string
}

export function StatCard({ label, value, icon: Icon, iconBg, sub }: Props) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate mb-0.5">{label}</p>
          <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        </div>
      </div>
      {sub && <p className="text-xs text-slate-400 mt-2 pl-12">{sub}</p>}
    </div>
  )
}
