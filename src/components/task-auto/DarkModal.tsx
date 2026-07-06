'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollLock } from '@/hooks/useScrollLock'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  footer?: React.ReactNode
}

const SIZE = {
  sm:  'max-w-sm',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-3xl',
  '2xl': 'max-w-5xl',
}

function DarkModalInner({ open, onClose, title, subtitle, children, size = 'md', footer }: Props) {
  useScrollLock()
  return (
    <div className="fixed inset-0 z-[1003] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-white border border-gray-100 shadow-2xl w-full flex flex-col',
        'rounded-t-2xl sm:rounded-2xl max-h-[95vh] sm:max-h-[92vh]',
        SIZE[size]
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-5 sm:px-8 sm:py-7 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-xl sm:text-2xl">{title}</h2>
            {subtitle && <p className="text-sm sm:text-base text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-3 px-5 py-4 sm:px-8 sm:py-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function DarkModal(props: Props) {
  if (!props.open) return null
  return <DarkModalInner {...props} />
}
