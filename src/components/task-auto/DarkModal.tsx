'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useBackdropClose } from '@/hooks/useBackdropClose'

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
  const backdrop = useBackdropClose(onClose)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const focusFirst = () => {
      // 2 lần query: 1 selector list trả phần tử ĐẦU TIÊN theo thứ tự DOM, nên nút Đóng ở header
      // luôn thắng [data-autofocus] nằm trong body.
      const first = dialog?.querySelector<HTMLElement>('[data-autofocus]')
        ?? dialog?.querySelector<HTMLElement>(focusableSelector)
      ;(first ?? dialog)?.focus()
    }
    // Chờ nội dung modal được gắn vào DOM rồi mới chuyển focus.
    const frame = requestAnimationFrame(focusFirst)

    function handleKey(e: KeyboardEvent) {
      const dialogs = document.querySelectorAll<HTMLElement>('[data-dark-modal]')
      if (dialogs[dialogs.length - 1] !== dialog) return
      if (e.key === 'Escape') {
        // Dropdown bên trong (vd. ServerSearchSelect) đã dùng Esc để tự đóng — không đóng cả modal
        if (e.defaultPrevented) return
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialog) return

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter(el => el.offsetParent !== null)
      if (!focusable.length) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKey)
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[1003] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" {...backdrop} />
      <div
        ref={dialogRef}
        data-dark-modal
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative bg-white border border-gray-100 shadow-2xl w-full flex flex-col',
          'rounded-t-2xl sm:rounded-2xl max-h-[95vh] sm:max-h-[92vh]',
          SIZE[size],
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-5 sm:px-8 sm:py-7 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 id={titleId} className="font-bold text-slate-900 text-xl sm:text-2xl">
              {title}
            </h2>
            {subtitle && <p className="text-sm sm:text-base text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
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
