'use client'

import { PencilLine, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Kho content team / cá nhân: xem video win (tự lấy từ page FB) hoặc content nhập tay (luồng cũ). */
export type ContentView = 'win' | 'manual'

const VIEWS: { id: ContentView; label: string; icon: React.ElementType }[] = [
  { id: 'win', label: 'Video đạt từ 10K lượt xem', icon: Trophy },
  { id: 'manual', label: 'Nội dung tự thêm', icon: PencilLine },
]

export function ContentViewTabs({ value, onChange }: { value: ContentView; onChange: (v: ContentView) => void }) {
  return (
    <div role="tablist" aria-label="Loại content" className="inline-flex gap-1 p-1 bg-slate-100 rounded-xl">
      {VIEWS.map(v => {
        const active = value === v.id
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <v.icon className="w-4 h-4" aria-hidden="true" />
            {v.label}
          </button>
        )
      })}
    </div>
  )
}
