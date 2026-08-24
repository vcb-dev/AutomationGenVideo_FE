'use client'

import Link from 'next/link'
import { ArrowRight, ListTodo, BarChart3, Award } from 'lucide-react'
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import type { ElementType, ReactNode } from 'react'
import { TONE, STATUS, STATUS_CHART_KEYS, type Tone, type StatusKey } from './tokens'

// ─── DashboardCard ────────────────────────────────────────────────────────────
// Shared card shell + header used across every dashboard variant. Header is text-only
// (title + subtitle) — no icon badge, matching the flat reference design; `icon`/`iconColor`/
// `iconBg` are still accepted (existing call sites keep passing them) but intentionally unused,
// so no call site needs touching to drop the old icon-badge look.

interface DashboardCardProps {
  icon?: ElementType
  iconColor?: string
  iconBg?: string
  title: string
  subtitle?: string
  action?: { href: string; label: string }
  right?: ReactNode
  children: ReactNode
  className?: string
}

export function DashboardCard({
  title, subtitle, action, right, children, className,
}: DashboardCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-200/60 overflow-hidden transition-shadow duration-200 hover:shadow-md hover:shadow-slate-200/60',
      className,
    )}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
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

// ─── PeriodBadge ──────────────────────────────────────────────────────────────
// Shows the currently-applied date-filter period on a DashboardCard's `right` slot.

export function PeriodBadge({ label }: { label: string }) {
  return (
    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
      {label}
    </span>
  )
}

// ─── MetricStat ───────────────────────────────────────────────────────────────
// Value-first stat cell used inside performance-summary strips — big number on top, label and
// sub-label underneath. No icon: the number's color already carries the meaning (tone).

interface MetricStatProps {
  icon?: ElementType
  label: string
  value: ReactNode
  sub?: string
  tone?: Tone
  active?: boolean
  /** Tooltip giải thích chính xác chiều dữ liệu (vd "theo ngày duyệt" vs "theo ngày tạo") —
   * dùng để tránh hiểu nhầm giữa các số liệu nhìn giống nhau nhưng khác chiều thời gian lọc. */
  title?: string
}

export function MetricStat({ label, value, sub, tone = 'neutral', active = true, title }: MetricStatProps) {
  const t = TONE[active ? tone : 'neutral']
  return (
    <div className="px-4 py-4 text-center" title={title}>
      <p className={cn('text-4xl font-black tracking-tight tabular-nums leading-none', t.text)}>{value}</p>
      <p className="text-sm font-semibold text-slate-700 mt-2">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── StatusDonut ──────────────────────────────────────────────────────────────
// Donut + legend for the task-status breakdown. Single implementation shared by
// GlobalDashboard's "Phân bố task" card and StatusBar (Team/Personal), reading
// colors from the STATUS/TONE tokens instead of each screen keeping its own
// hex palette. Legend is a single-column list (dot, label, count) — no per-row bar.

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/10">
      <p className="text-xs font-semibold text-slate-800">{d.name}</p>
      <p className="text-xs text-slate-500">{d.value} task · {d.payload.pct}%</p>
    </div>
  )
}

const DONUT_SIZE = {
  sm: { box: 'w-36 h-36', inner: 44, outer: 66, totalCls: 'text-2xl', unitCls: 'text-[10px] -mt-0.5' },
  md: { box: 'w-44 h-44', inner: 54, outer: 80, totalCls: 'text-3xl', unitCls: 'text-xs' },
} as const

interface StatusDonutProps {
  tasks: Record<string, number>
  size?: keyof typeof DONUT_SIZE
  layout?: 'row' | 'column'
  keys?: StatusKey[]
}

export function StatusDonut({ tasks, size = 'sm', layout = 'row', keys = STATUS_CHART_KEYS }: StatusDonutProps) {
  const total = keys.reduce((sum, k) => sum + (tasks[k] ?? 0), 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-300">
        <ListTodo className="w-8 h-8 mb-2" />
        <p className="text-sm text-slate-400">Chưa có task nào</p>
      </div>
    )
  }

  const cfg = DONUT_SIZE[size]
  const chartData = keys
    .map(k => ({
      key: k,
      name: STATUS[k].label,
      value: tasks[k] ?? 0,
      fill: TONE[STATUS[k].tone].hex,
      pct: Math.round(((tasks[k] ?? 0) / total) * 100),
    }))
    .filter(d => d.value > 0)

  const donut = (
    <div className={cn('relative shrink-0', cfg.box)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%" cy="50%"
            innerRadius={cfg.inner} outerRadius={cfg.outer}
            paddingAngle={2} dataKey="value"
            strokeWidth={0} startAngle={90} endAngle={-270}
          />
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={cn('font-extrabold text-slate-900 leading-none tracking-tight', cfg.totalCls)}>{total}</span>
        <span className={cn('text-slate-400', cfg.unitCls)}>tasks</span>
      </div>
    </div>
  )

  const legend = (
    <div className="w-full flex flex-col gap-2">
      {keys.map(k => {
        const count = tasks[k] ?? 0
        const tone = TONE[STATUS[k].tone]
        return (
          <div key={k} className="flex items-center gap-2.5">
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', count > 0 ? tone.dot : 'bg-slate-200')} />
            <span className="text-sm text-slate-600 flex-1 min-w-0 truncate">{STATUS[k].label}</span>
            <span className={cn('text-sm font-bold shrink-0 tabular-nums', count > 0 ? tone.text : 'text-slate-300')}>
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )

  return layout === 'column' ? (
    <div className="flex-1 flex flex-col items-center gap-5">
      {donut}
      {legend}
    </div>
  ) : (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {donut}
      <div className="flex-1 w-full">{legend}</div>
    </div>
  )
}

// ─── MonthPacingHint ──────────────────────────────────────────────────────────
// "Còn N task, cần X/ngày trong Y ngày tới" — shared by Team and Personal KPI cards
// (previously copy-pasted in both files with the exact same pacing math).

export function MonthPacingHint({ completed, target, achievedLabel = 'Đã đạt KPI tháng này!' }: {
  completed: number; target: number; achievedLabel?: string
}) {
  if (!target) return null
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft    = daysInMonth - now.getDate() + 1
  const remaining   = Math.max(0, target - completed)

  if (remaining === 0) return (
    <div className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg', TONE.success.bg, TONE.success.text)}>
      <Award className="w-3.5 h-3.5" /> {achievedLabel}
    </div>
  )

  const rateNeeded = daysLeft > 0 ? remaining / daysLeft : 0
  const urgent = rateNeeded > 3
  const t = TONE[urgent ? 'warning' : 'neutral']

  return (
    <div className={cn('flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg', t.bg, urgent ? t.text : 'text-slate-500')}>
      <BarChart3 className="w-3.5 h-3.5 shrink-0" />
      <span>
        Còn <span className="font-bold">{remaining}</span> task,{' '}
        cần{' '}
        <span className={cn('font-bold', urgent ? 'text-amber-600' : 'text-indigo-600')}>
          {rateNeeded.toFixed(1)}/ngày
        </span>{' '}
        trong {daysLeft} ngày tới
      </span>
    </div>
  )
}

// ─── LiveDot ──────────────────────────────────────────────────────────────────
// Small pulsing indicator marking a metric as "live/now", not scoped to any date filter.

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
    </span>
  )
}
