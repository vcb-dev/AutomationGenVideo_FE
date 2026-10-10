'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { lastWeekRange, thisWeekRange } from '@/components/dashboard/a5/shared/date-range-presets'

export function dateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayString() {
  return dateString(new Date())
}

export function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return dateString(d)
}

function monthStart(d = new Date()) {
  return dateString(new Date(d.getFullYear(), d.getMonth(), 1))
}

interface DatePreset {
  label: string
  range: () => [string, string]
}

// Thứ tự theo lưới 3 cột của popup: hàng trên là mốc "này", hàng dưới là mốc "trước".
// Tuần tính T2 → CN như dashboard A5; "Tuần này"/"Tháng này" chỉ tính tới hôm nay.
export const DATE_PRESETS: DatePreset[] = [
  { label: 'Hôm nay', range: () => [todayString(), todayString()] },
  { label: 'Tuần này', range: () => { const w = thisWeekRange(todayString()); return [w.from, w.to] } },
  { label: 'Tháng này', range: () => [monthStart(), todayString()] },
  { label: 'Hôm qua', range: () => [addDays(todayString(), -1), addDays(todayString(), -1)] },
  { label: 'Tuần trước', range: () => { const w = lastWeekRange(todayString()); return [w.from, w.to] } },
  {
    label: 'Tháng trước',
    range: () => {
      const end = addDays(monthStart(), -1)
      return [`${end.slice(0, 7)}-01`, end]
    },
  },
]

const formatShortDate = (s: string) => {
  const [, m, d] = s.split('-')
  return m && d ? `${d}/${m}` : s
}

interface Props {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  /** Nhãn trước dấu ":" — nói rõ lọc theo cột nào (vd "Ngày", "Ngày duyệt") */
  label?: string
  tooltip?: string
  /** Kích thước nhỏ cho thanh lọc trong modal */
  compact?: boolean
  /** Neo popup theo mép phải nút khi nút nằm sát mép phải khung */
  align?: 'left' | 'right'
}

/**
 * Bộ lọc khoảng ngày: nút hiện khoảng đang chọn ("Ngày duyệt: 7/9 → 13/9"), bấm mở popup gồm
 * các mốc nhanh + ô Từ/Đến ngày. Dùng chung cho thanh lọc màn Nhiệm vụ (TaskFilters) và modal
 * "Gắn bài vào video đã làm".
 */
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  label = 'Ngày',
  tooltip,
  compact = false,
  align = 'left',
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    // Bắt Esc ở pha capture của window — chạy TRƯỚC listener của Radix Dialog (capture ở document),
    // nên Esc khi đang mở popup chỉ đóng popup chứ không đóng luôn hộp thoại chứa nó.
    function onEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onEscape, true)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onEscape, true)
    }
  }, [open])

  const today = todayString()
  const isToday = from === today && to === today
  const isSingleDay = !!from && from === to
  const isYesterday = isSingleDay && from === addDays(today, -1)
  const hasRange = !!from || !!to
  // Mốc nhanh khớp khoảng đang lọc — lấy mốc đầu tiên khi trùng (thứ 2: "Tuần này" = "Hôm nay")
  const activePreset = DATE_PRESETS.find(p => {
    const [f, t] = p.range()
    return f === from && t === to
  })?.label

  // Hiển thị dd/MM thay vì yyyy-mm-dd thô, kèm nhãn (vd "Ngày:") để người dùng hiểu ngay đây là
  // bộ lọc thời gian — mặc định trang lọc "Hôm nay" nên nếu không nói rõ, người dùng dễ
  // tưởng mất task trong khi chỉ là bị bộ lọc ngày che.
  const text = !hasRange
    ? `${label}: Tất cả`
    : isToday
      ? `${label}: Hôm nay`
      : isYesterday
        ? `${label}: Hôm qua`
        : isSingleDay
          ? `${label}: ${formatShortDate(from)}`
          : `${label}: ${from ? formatShortDate(from) : '…'} → ${to ? formatShortDate(to) : '…'}`

  function applyPreset(preset: DatePreset) {
    const [f, t] = preset.range()
    onFromChange(f)
    onToChange(t)
    setOpen(false)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={tooltip}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'flex items-center gap-2 border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
          compact
            ? 'min-h-9 rounded-lg bg-white px-3 text-xs'
            : 'pl-3.5 pr-2.5 py-3 bg-gray-50 rounded-xl text-sm focus:bg-white',
          isToday
            ? 'border-amber-300 ring-1 ring-amber-100 text-amber-700'
            : hasRange
              ? 'border-indigo-400 ring-1 ring-indigo-100 text-indigo-700'
              : compact ? 'border-slate-200 text-slate-700' : 'border-gray-200 text-slate-500',
        )}
      >
        <CalendarDays
          className={cn(
            'flex-shrink-0',
            compact ? 'w-3.5 h-3.5' : 'w-4 h-4',
            isToday ? 'text-amber-500' : hasRange ? 'text-indigo-500' : 'text-slate-400',
          )}
          aria-hidden="true"
        />
        <span className="whitespace-nowrap">{text}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Chọn khoảng ${label.toLowerCase()}`}
          className={cn(
            'absolute z-30 top-full mt-1.5 w-[290px] bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-3',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-pressed={activePreset === preset.label}
                className={cn(
                  'px-1 py-1.5 whitespace-nowrap rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                  activePreset === preset.label
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 hover:bg-indigo-500 hover:text-white text-slate-600',
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { onFromChange(''); onToChange(''); setOpen(false) }}
              aria-pressed={!hasRange}
              className={cn(
                'col-span-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                !hasRange ? 'bg-slate-500 text-white' : 'bg-gray-100 hover:bg-slate-500 hover:text-white text-slate-600',
              )}
            >
              Tất cả ngày
            </button>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-slate-400">
                Từ ngày
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={e => onFromChange(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-slate-400">
                Đến ngày
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={e => onToChange(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
