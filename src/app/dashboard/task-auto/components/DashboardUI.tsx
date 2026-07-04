'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ElementType, ReactNode } from 'react'

// ─── DashboardCard ────────────────────────────────────────────────────────────
// Shared card shell + header used across Global / Team / Personal dashboards
// so every panel shares the same chrome (icon badge, title, action link).

interface DashboardCardProps {
  icon: ElementType
  iconColor: string
  iconBg: string
  title: string
  subtitle?: string
  action?: { href: string; label: string }
  right?: ReactNode
  children: ReactNode
  className?: string
}

export function DashboardCard({
  icon: Icon, iconColor, iconBg, title, subtitle, action, right, children, className,
}: DashboardCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-200/60 overflow-hidden transition-shadow duration-200 hover:shadow-md hover:shadow-slate-200/60',
      className,
    )}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            <Icon className={cn('w-[18px] h-[18px]', iconColor)} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
          >
            {action.label} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children}
    </div>
  )
}

// ─── MetricStat ───────────────────────────────────────────────────────────────
// Compact icon + value cell used inside performance-summary strips.

type Tone = 'emerald' | 'amber' | 'red' | 'violet' | 'slate' | 'indigo'

const TONE_STYLES: Record<Tone, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-500' },
  red:     { bg: 'bg-red-50',     text: 'text-red-500' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-300' },
}

interface MetricStatProps {
  icon: ElementType
  label: string
  value: ReactNode
  sub?: string
  tone?: Tone
  active?: boolean
}

export function MetricStat({ icon: Icon, label, value, sub, tone = 'slate', active = true }: MetricStatProps) {
  const t = TONE_STYLES[active ? tone : 'slate']
  return (
    <div className="px-4 py-5 text-center">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2', t.bg)}>
        <Icon className={cn('w-4 h-4', t.text)} />
      </div>
      <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
      <p className={cn('text-2xl font-black tracking-tight', t.text)}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
