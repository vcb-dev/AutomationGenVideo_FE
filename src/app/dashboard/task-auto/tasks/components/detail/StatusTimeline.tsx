'use client'

import { Check, X, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types/task-auto'

const STEPS: { status: TaskStatus; label: string }[] = [
  { status: 'PENDING',     label: 'Tạo task' },
  { status: 'ASSIGNED',    label: 'Đã giao' },
  { status: 'IN_PROGRESS', label: 'Đang làm' },
  { status: 'SUBMITTED',   label: 'Đã nộp' },
  { status: 'APPROVED',    label: 'Hoàn thành' },
]

const ORDER: Record<string, number> = {
  PENDING: 0, ASSIGNED: 1, IN_PROGRESS: 2, SUBMITTED: 3, APPROVED: 4,
  REJECTED: 3, CANCELLED: 3,
}

export function StatusTimeline({ status }: { status: TaskStatus }) {
  const currentIdx  = ORDER[status] ?? 0
  const isRejected  = status === 'REJECTED'
  const isCancelled = status === 'CANCELLED'
  const isTerminal  = isRejected || isCancelled
  const isApproved  = status === 'APPROVED'

  // Terminal: only show steps up to and including currentIdx (e.g. SUBMITTED = idx 3)
  // Normal: show all 5 steps
  const steps = isTerminal ? STEPS.slice(0, currentIdx + 1) : STEPS

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max px-1 py-3">
        {steps.map((step, idx) => {
          const isDone    = isTerminal
            ? true                                              // all shown steps are done
            : isApproved
              ? idx <= currentIdx
              : idx < currentIdx
          const isCurrent = !isTerminal && !isApproved && idx === currentIdx

          const isLastStep    = idx === steps.length - 1
          const connectorFill = isDone && !isLastStep

          return (
            <div key={step.status} className="flex items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center w-9 h-9">
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full bg-indigo-400/30 animate-ping" />
                  )}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 relative',
                    isDone      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200/60'
                    : isCurrent ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/60 ring-[3px] ring-indigo-200'
                    :             'bg-white border-2 border-gray-200 text-gray-400',
                  )}>
                    {isDone
                      ? <Check className="w-4 h-4" strokeWidth={2.5} />
                      : <span className="text-[13px]">{idx + 1}</span>
                    }
                  </div>
                </div>
                <span className={cn(
                  'text-[11px] font-semibold whitespace-nowrap leading-none',
                  isDone      ? 'text-emerald-600'
                  : isCurrent ? 'text-indigo-700'
                  :             'text-gray-400',
                )}>
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {(!isLastStep || isTerminal) && (
                <div className="relative w-14 sm:w-20 h-0.5 mx-1.5 mb-5 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full bg-gray-200" />
                  <div className={cn(
                    'absolute inset-0 rounded-full transition-all duration-500',
                    isTerminal && isLastStep
                      ? isRejected ? 'bg-red-300' : 'bg-gray-300'
                      : connectorFill ? 'bg-emerald-400' : '',
                  )} />
                </div>
              )}

              {/* Terminal node — rendered after the last visible step */}
              {isTerminal && isLastStep && (
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shadow-md',
                    isRejected
                      ? 'bg-red-500 text-white shadow-red-200/60'
                      : 'bg-gray-400 text-white shadow-gray-200/60',
                  )}>
                    {isRejected
                      ? <X className="w-4 h-4" strokeWidth={2.5} />
                      : <Ban className="w-4 h-4" />
                    }
                  </div>
                  <span className={cn(
                    'text-[11px] font-semibold whitespace-nowrap leading-none',
                    isRejected ? 'text-red-500' : 'text-gray-500',
                  )}>
                    {isRejected ? 'Từ chối' : 'Đã huỷ'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
