'use client'

import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types/task-auto'

const TIMELINE_STEPS: { status: TaskStatus; label: string }[] = [
  { status: 'PENDING',     label: 'Tạo task' },
  { status: 'ASSIGNED',    label: 'Đã giao' },
  { status: 'IN_PROGRESS', label: 'Đang làm' },
  { status: 'SUBMITTED',   label: 'Đã nộp' },
  { status: 'APPROVED',    label: 'Hoàn thành' },
]

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0, ASSIGNED: 1, IN_PROGRESS: 2, SUBMITTED: 3, APPROVED: 4,
  REJECTED: 3, CANCELLED: 3,
}

export function StatusTimeline({ status }: { status: TaskStatus }) {
  const currentIdx = STATUS_ORDER[status] ?? 0
  const isTerminal = status === 'REJECTED' || status === 'CANCELLED'
  const isApproved  = status === 'APPROVED'
  return (
    <div className="flex items-start overflow-x-auto">
      {TIMELINE_STEPS.map((step, idx) => {
        const isDone    = !isTerminal && (isApproved ? idx <= currentIdx : idx < currentIdx)
        const isCurrent = !isTerminal && !isApproved && idx === currentIdx
        return (
          <div key={step.status} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                isDone    ? 'bg-emerald-500 border-emerald-500 text-white'
                : isCurrent ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-200 text-gray-400',
              )}>
                {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : <span>{idx + 1}</span>}
              </div>
              <span className={cn(
                'text-xs whitespace-nowrap font-medium',
                isCurrent ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-gray-400',
              )}>
                {step.label}
              </span>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 w-10 sm:w-16 mx-2 mb-5 rounded-full flex-shrink-0',
                idx < currentIdx && !isTerminal ? 'bg-emerald-400' : 'bg-gray-200',
              )} />
            )}
          </div>
        )
      })}
      {isTerminal && (
        <>
          <div className={cn('h-0.5 w-10 sm:w-16 mx-2 mt-4 rounded-full flex-shrink-0',
            status === 'REJECTED' ? 'bg-red-200' : 'bg-gray-200')} />
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={cn('w-8 h-8 rounded-full border-2 flex items-center justify-center',
              status === 'REJECTED' ? 'bg-red-500 border-red-500 text-white' : 'bg-gray-400 border-gray-400 text-white')}>
              <X className="w-4 h-4" />
            </div>
            <span className={cn('text-xs whitespace-nowrap font-semibold',
              status === 'REJECTED' ? 'text-red-500' : 'text-gray-500')}>
              {status === 'REJECTED' ? 'Từ chối' : 'Đã huỷ'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
