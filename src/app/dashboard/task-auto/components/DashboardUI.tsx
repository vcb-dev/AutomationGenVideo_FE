'use client'

import Link from 'next/link'
import { ArrowRight, ArrowUpRight, ListTodo, CalendarClock, Award, Flame } from 'lucide-react'
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import type { ElementType, ReactNode } from 'react'
import { TONE, STATUS, STATUS_CHART_KEYS, type Tone, type StatusKey } from './tokens'

// ─── DashboardCard ────────────────────────────────────────────────────────────
// Khung card dùng chung cho mọi biến thể Tổng quan. `icon`/`iconColor`/`iconBg` vẫn nhận (call site cũ
// còn truyền) nhưng cố ý không vẽ để header gọn.

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
    <section className={cn(
      'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden',
      className,
    )}>
      <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-6 text-slate-900 break-words">{title}</h3>
          {subtitle && <p className="text-xs leading-5 text-slate-500 line-clamp-2">{subtitle}</p>}
        </div>
        {(action || right) && (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {right}
            {action && (
              <Link
                href={action.href}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {action.label} <ArrowRight className="w-3 h-3" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({ title, description, live, right, className }: {
  title: string
  description?: ReactNode
  /** Đánh dấu số liệu "tính đến hiện tại" (không theo bộ lọc ngày) bằng chấm đỏ nhấp nháy. */
  live?: boolean
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-1 mb-3', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          {live && <LiveDot />}
          {title}
        </h2>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {right}
    </div>
  )
}

// ─── KpiTile ──────────────────────────────────────────────────────────────────
// Số luôn màu trung tính — chỉ khi `alert` mới tô màu tone, để đỏ/vàng thật sự mang nghĩa "cần chú ý".

interface KpiTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ElementType
  tone?: Tone
  /** true → nền + số tô theo tone (trạng thái cần chú ý). */
  alert?: boolean
  /** 0–100 → vẽ thanh tiến độ dưới số; `progressTone` mặc định = tone. */
  progress?: number
  progressTone?: Tone
  href?: string
  /** Tooltip giải thích chính xác cách tính (chiều thời gian lọc, công thức…). */
  title?: string
  className?: string
}

export function KpiTile({
  label, value, hint, icon: Icon, tone = 'neutral', alert = false,
  progress, progressTone, href, title, className,
}: KpiTileProps) {
  const t = TONE[tone]
  const bar = TONE[progressTone ?? tone]

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-[13px] font-semibold leading-5', alert ? t.text : 'text-slate-600')}>{label}</p>
        {Icon && (
          <span className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            alert ? 'bg-white/80' : t.bg, t.text === 'text-slate-800' ? 'text-slate-500' : t.text,
          )}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className={cn(
        'mt-1 text-[28px] font-bold leading-none tracking-tight tabular-nums',
        alert ? t.text : 'text-slate-900',
      )}>
        {value}
      </p>
      {hint && (
        <p className="mt-2 flex items-start gap-1 text-xs leading-4 text-slate-500">
          <span className="min-w-0 line-clamp-2">{hint}</span>
          {href && <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />}
        </p>
      )}
      {progress != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div
            className={cn('h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none', bar.bar)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </>
  )

  const cls = cn(
    'group flex flex-col rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
    alert ? cn(t.bg, t.border) : 'bg-white border-slate-200/80',
    className,
  )

  if (href) {
    return (
      <Link
        href={href}
        title={title}
        className={cn(cls, 'cursor-pointer transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400')}
      >
        {body}
      </Link>
    )
  }
  return <div className={cls} title={title}>{body}</div>
}

// ─── LiveAlertTiles ───────────────────────────────────────────────────────────
// "Quá hạn" / "Đến hạn hôm nay" luôn tính theo THỜI ĐIỂM HIỆN TẠI, không theo bộ lọc ngày — luôn đặt
// dưới SectionHeader `live` để không bị hiểu nhầm là đổi theo bộ lọc.

export function LiveAlertTiles({ overdue, todayDeadline, href = '/dashboard/task-auto/tasks', className }: {
  overdue: number; todayDeadline: number; href?: string; className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <KpiTile
        label="Quá hạn" value={overdue} icon={Flame}
        tone="danger" alert={overdue > 0}
        hint={overdue > 0 ? 'Chưa xong, đã quá hạn chót' : 'Không có task trễ hạn'}
        href={href}
        title="Task chưa duyệt/huỷ có hạn chót trước thời điểm hiện tại — không theo bộ lọc ngày"
      />
      <KpiTile
        label="Đến hạn hôm nay" value={todayDeadline} icon={CalendarClock}
        tone="warning" alert={todayDeadline > 0}
        hint={todayDeadline > 0 ? 'Cần hoàn thành trong hôm nay' : 'Không có task đến hạn'}
        href={href}
        title="Task có hạn chót trong hôm nay, chưa hoàn thành — không theo bộ lọc ngày"
      />
    </div>
  )
}

// ─── SegmentedControl ─────────────────────────────────────────────────────────

export function SegmentedControl<T extends string>({ value, options, onChange, ariaLabel, size = 'md' }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  ariaLabel: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-xl bg-slate-100 p-1">
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'whitespace-nowrap rounded-lg font-semibold transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-2.5 sm:py-1.5 text-sm',
              active
                ? 'bg-white text-indigo-700 shadow-sm shadow-slate-900/10'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── PeriodBadge ──────────────────────────────────────────────────────────────
// Nhãn kỳ đang lọc ở góc card — Tổng quan đã hiện kỳ 1 lần trên thanh lọc nên các card chính
// không dùng nữa; giữ cho màn Content Team Leader.

export function PeriodBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
      <CalendarClock className="h-3 w-3" aria-hidden />
      {label}
    </span>
  )
}

// ─── MetricStat ───────────────────────────────────────────────────────────────
// Ô số liệu nằm TRONG 1 card (dải tóm tắt nhiều chỉ số). Màu số theo tone.

interface MetricStatProps {
  icon?: ElementType
  label: string
  value: ReactNode
  sub?: string
  tone?: Tone
  active?: boolean
  /** Tooltip giải thích chính xác chiều dữ liệu (vd "theo ngày duyệt" vs "theo ngày tạo"). */
  title?: string
}

export function MetricStat({ label, value, sub, tone = 'neutral', active = true, title }: MetricStatProps) {
  const t = TONE[active ? tone : 'neutral']
  return (
    <div className="px-4 py-4 text-center" title={title}>
      <p className={cn('text-3xl font-bold tracking-tight tabular-nums leading-none', t.text)}>{value}</p>
      <p className="text-sm font-semibold text-slate-700 mt-2">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── StatusDonut ──────────────────────────────────────────────────────────────
// Donut + chú thích phân bố task theo trạng thái; chú thích có cả số và % để không chỉ dựa vào màu.

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
  sm: { box: 'w-36 h-36', inner: 46, outer: 66, totalCls: 'text-2xl' },
  md: { box: 'w-44 h-44', inner: 58, outer: 82, totalCls: 'text-3xl' },
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
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <ListTodo className="w-8 h-8 mb-2 opacity-40" aria-hidden />
        <p className="text-sm text-slate-500">Chưa có task nào trong kỳ</p>
      </div>
    )
  }

  const cfg = DONUT_SIZE[size]
  const pctOf = (n: number) => Math.round((n / total) * 100)
  const chartData = keys
    .map(k => ({
      key: k,
      name: STATUS[k].label,
      value: tasks[k] ?? 0,
      fill: TONE[STATUS[k].tone].hex,
      pct: pctOf(tasks[k] ?? 0),
    }))
    .filter(d => d.value > 0)

  const a11y = `Phân bố ${total} task: ` + chartData.map(d => `${d.name} ${d.value} (${d.pct}%)`).join(', ')

  const donut = (
    <div className={cn('relative shrink-0', cfg.box)} role="img" aria-label={a11y}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%" cy="50%"
            innerRadius={cfg.inner} outerRadius={cfg.outer}
            paddingAngle={1.5} dataKey="value"
            stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270}
          />
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={cn('font-bold text-slate-900 leading-none tracking-tight tabular-nums', cfg.totalCls)}>{total}</span>
        <span className="mt-1 text-xs text-slate-500">task</span>
      </div>
    </div>
  )

  const legend = (
    <ul className="w-full flex flex-col">
      {keys.map(k => {
        const count = tasks[k] ?? 0
        const tone = TONE[STATUS[k].tone]
        return (
          <li key={k} className="flex items-center gap-2.5 py-1.5 border-b border-slate-100 last:border-0">
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', count > 0 ? tone.dot : 'bg-slate-200')} aria-hidden />
            <span className={cn('text-sm flex-1 min-w-0 truncate', count > 0 ? 'text-slate-700' : 'text-slate-400')}>{STATUS[k].label}</span>
            <span className={cn('text-sm font-semibold shrink-0 tabular-nums', count > 0 ? 'text-slate-900' : 'text-slate-400')}>
              {count}
            </span>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500">{count > 0 ? `${pctOf(count)}%` : '—'}</span>
          </li>
        )
      })}
    </ul>
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
// "Còn N, cần X/ngày trong Y ngày" — dùng chung cho card KPI của Team và Cá nhân.

export function MonthPacingHint({ completed, target, achievedLabel = 'Đã đạt KPI tháng này!', unit = 'video' }: {
  completed: number; target: number; achievedLabel?: string; unit?: string
}) {
  if (!target) return null
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft    = daysInMonth - now.getDate() + 1
  const remaining   = Math.max(0, target - completed)

  if (remaining === 0) return (
    <div className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg', TONE.success.bg, TONE.success.text)}>
      <Award className="w-3.5 h-3.5" aria-hidden /> {achievedLabel}
    </div>
  )

  const rateNeeded = daysLeft > 0 ? remaining / daysLeft : 0
  const urgent = rateNeeded > 3

  return (
    <div className={cn(
      'flex items-start gap-2 text-xs leading-5 px-3 py-2 rounded-lg',
      urgent ? cn(TONE.warning.bg, 'text-amber-800') : 'bg-slate-50 text-slate-600',
    )}>
      <CalendarClock className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', urgent ? 'text-amber-600' : 'text-slate-400')} aria-hidden />
      <span>
        Còn <span className="font-bold text-slate-900">{remaining}</span> {unit} — cần trung bình{' '}
        <span className={cn('font-bold', urgent ? 'text-amber-700' : 'text-indigo-600')}>
          {rateNeeded.toFixed(1)}/ngày
        </span>{' '}
        trong {daysLeft} ngày còn lại
      </span>
    </div>
  )
}

// ─── LiveDot ──────────────────────────────────────────────────────────────────
// Chấm đỏ nhấp nháy đánh dấu số liệu "tính đến hiện tại", không theo bộ lọc ngày.

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden>
      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
    </span>
  )
}
