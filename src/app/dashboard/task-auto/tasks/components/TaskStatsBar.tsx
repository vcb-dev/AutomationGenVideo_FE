'use client'

import { useMemo } from 'react'
import { Send, Play, Upload, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Task } from '@/types/task-auto'

interface Props {
  tasks: Task[]
}

export function TaskStatsBar({ tasks }: Props) {
  const counts = useMemo(() => ({
    assigned:    tasks.filter(t => t.status === 'ASSIGNED').length,
    in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    submitted:   tasks.filter(t => t.status === 'SUBMITTED').length,
    approved:    tasks.filter(t => t.status === 'APPROVED').length,
  }), [tasks])

  const cards = [
    {
      label: 'Đã giao',
      value: counts.assigned,
      icon: Send,
      iconClass: 'text-blue-600',
      iconBg: 'bg-blue-50',
      valueClass: 'text-blue-600',
    },
    {
      label: 'Đang làm',
      value: counts.in_progress,
      icon: Play,
      iconClass: 'text-amber-600',
      iconBg: 'bg-amber-50',
      valueClass: 'text-amber-600',
    },
    {
      label: 'Đã nộp',
      value: counts.submitted,
      icon: Upload,
      iconClass: 'text-purple-700',
      iconBg: 'bg-purple-50',
      valueClass: 'text-purple-700',
    },
    {
      label: 'Đã duyệt',
      value: counts.approved,
      icon: CheckCircle2,
      iconClass: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      valueClass: 'text-emerald-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(c => (
        <div
          key={c.label}
          className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm"
        >
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', c.iconBg)}>
            <c.icon className={cn('w-5 h-5', c.iconClass)} />
          </div>
          <div>
            <p className={cn('text-3xl font-black leading-none mb-0.5', c.valueClass)}>{c.value}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
