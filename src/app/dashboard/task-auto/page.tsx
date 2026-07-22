'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ListTodo, Users, User, Loader2, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getDashboard } from '@/lib/api/task-auto'
import { GlobalDashboard, buildGlobal } from './components/GlobalDashboard'
import { TeamDashboard } from './components/TeamDashboard'
import { PersonalDashboard } from './components/PersonalDashboard'

// ── Date filter ───────────────────────────────────────────────────────────────

type DatePreset = 'today' | '7days' | 'month' | 'last_month' | 'custom'

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today',      label: 'Hôm nay' },
  { key: '7days',      label: '7 ngày qua' },
  { key: 'month',      label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'custom',     label: 'Tùy chọn' },
]

function fmt(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatVNDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function getPeriodLabel(preset: DatePreset, from: string, to: string): string {
  if (preset !== 'custom') return PRESETS.find(p => p.key === preset)?.label ?? ''
  return from === to ? formatVNDate(from) : `${formatVNDate(from)} → ${formatVNDate(to)}`
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date()
  switch (preset) {
    case 'today': {
      const s = fmt(today)
      return { from: s, to: s }
    }
    case '7days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { from: fmt(from), to: fmt(today) }
    }
    case 'last_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to   = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: fmt(from), to: fmt(to) }
    }
    case 'month':
    default: {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: fmt(from), to: fmt(today) }
    }
  }
}

// ── DateFilter component ──────────────────────────────────────────────────────

interface DateFilterProps {
  preset: DatePreset
  customFrom: string
  customTo: string
  onPresetChange: (p: DatePreset) => void
  onCustomFromChange: (v: string) => void
  onCustomToChange: (v: string) => void
}

function DateFilter({ preset, customFrom, customTo, onPresetChange, onCustomFromChange, onCustomToChange }: DateFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <CalendarDays className="w-3.5 h-3.5" />
        <span className="font-medium">Lọc theo ngày:</span>
      </div>

      {/* Preset chips */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onPresetChange(p.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              preset === p.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={e => onCustomFromChange(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={e => onCustomToChange(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TaskAutoDashboard() {
  const today = fmt(new Date())
  const firstOfMonth = fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const [preset, setPreset]           = useState<DatePreset>('month')
  const [customFrom, setCustomFrom]   = useState(firstOfMonth)
  const [customTo, setCustomTo]       = useState(today)

  const { from, to } = preset === 'custom'
    ? { from: customFrom, to: customTo }
    : getPresetRange(preset)

  const periodLabel = getPeriodLabel(preset, from, to)

  const { data, isLoading } = useQuery({
    queryKey: ['task-auto', 'dashboard', from, to],
    queryFn:  () => getDashboard({ date_from: from, date_to: to }),
    refetchInterval: 30_000,
    enabled: !!(from && to),
  })

  const scopeLabel = data?.scope === 'global' ? 'Toàn hệ thống'
    : data?.scope === 'team' ? (data.team ? `Team: ${data.team.name}` : 'Team của tôi')
    : 'Cá nhân'

  const scopeIcon = data?.scope === 'personal'
    ? <User className="w-4 h-4" />
    : <Users className="w-4 h-4" />

  const showDateFilter = data?.scope === 'global' || data?.scope === 'team'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Task Auto</h1>
          <p className="text-slate-500 text-sm mt-0.5">Hệ thống phân công và quản lý task tự động</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-semibold text-slate-600">
              {scopeIcon}
              {scopeLabel}
            </div>
          )}
          <Link
            href="/dashboard/task-auto/tasks"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <ListTodo className="w-4 h-4" />
            Xem tất cả task
          </Link>
        </div>
      </div>

      {/* Date filter — chỉ hiện cho Global & Team scope */}
      {(showDateFilter || isLoading) && (
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <DateFilter
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={p => {
              setPreset(p)
              if (p === 'custom') {
                setCustomFrom(firstOfMonth)
                setCustomTo(today)
              }
            }}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : !data ? null
        : data.scope === 'global' ? <GlobalDashboard d={buildGlobal(data)} periodLabel={periodLabel} />
        : data.scope === 'team'   ? <TeamDashboard d={data} periodLabel={periodLabel} />
        : <PersonalDashboard d={data} />
      }

    </div>
  )
}
