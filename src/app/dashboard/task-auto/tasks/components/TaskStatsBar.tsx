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

  const pills = [
    {
      label: 'Đã giao',
      value: counts.assigned,
      icon: Send,
      pill: 'bg-blue-50 border-blue-200 text-blue-700',
      iconClass: 'text-blue-500',
      dot: 'bg-blue-400',
    },
    {
      label: 'Đang làm',
      value: counts.in_progress,
      icon: Play,
      pill: 'bg-amber-50 border-amber-200 text-amber-700',
      iconClass: 'text-amber-500',
      dot: 'bg-amber-400',
    },
    {
      label: 'Đã nộp',
      value: counts.submitted,
      icon: Upload,
      pill: 'bg-purple-50 border-purple-200 text-purple-700',
      iconClass: 'text-purple-500',
      dot: 'bg-purple-400',
    },
    {
      label: 'Đã duyệt',
      value: counts.approved,
      icon: CheckCircle2,
      pill: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      iconClass: 'text-emerald-500',
      dot: 'bg-emerald-400',
    },
  ]

  return (
    <div className="flex flex-wrap gap-2.5">
      {pills.map(p => (
        <div
          key={p.label}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2 rounded-full border text-sm font-semibold',
            p.pill,
          )}
        >
          <p.icon className={cn('w-3.5 h-3.5 shrink-0', p.iconClass)} />
          <span className="font-black text-base leading-none">{p.value}</span>
          <span className="font-medium opacity-80">{p.label}</span>
        </div>
      ))}
    </div>
  )
}
