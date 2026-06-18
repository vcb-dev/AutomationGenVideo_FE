'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  value: string  // 'YYYY-MM'
  onChange: (v: string) => void
}

function parseYM(v: string) {
  const [y, m] = v.split('-').map(Number)
  return { year: y, month: m }
}

function formatYM(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function MonthPicker({ value, onChange }: Props) {
  const { year, month } = parseYM(value)

  const prev = () => {
    if (month === 1) onChange(formatYM(year - 1, 12))
    else onChange(formatYM(year, month - 1))
  }

  const next = () => {
    if (month === 12) onChange(formatYM(year + 1, 1))
    else onChange(formatYM(year, month + 1))
  }

  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
    'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1 shadow-sm">
      <button onClick={prev} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
        {monthNames[month - 1]} {year}
      </span>
      <button onClick={next} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
