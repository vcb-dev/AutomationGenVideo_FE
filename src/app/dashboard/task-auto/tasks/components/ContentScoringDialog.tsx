'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Gauge, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBackdropClose } from '@/hooks/useBackdropClose'
import { ContentScoringTab } from './ContentScoringTab'

/**
 * Không dùng DarkModal vì DarkModal huỷ nội dung khi đóng — ở đây chỉ ẩn đi, để lỡ tay đóng trong lúc
 * chờ chấm/nâng cấp (có thể mất vài phút) thì mở lại vẫn còn content và kết quả.
 */
export function ContentScoringDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(open)
  const backdrop = useBackdropClose(onClose)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => closeRef.current?.focus())
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter(el => el.offsetParent !== null)
      if (!focusable.length) {
        e.preventDefault()
        dialogRef.current.focus()
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
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [open])

  if (!mounted) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[1003] items-end sm:items-center justify-center p-0 sm:p-4',
        open ? 'flex' : 'hidden',
      )}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" {...backdrop} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-white border border-gray-100 shadow-2xl w-full max-w-4xl flex flex-col rounded-t-2xl sm:rounded-2xl max-h-[95vh] sm:max-h-[92vh]"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Gauge className="w-5 h-5 text-violet-600" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold text-slate-900">
                Chấm điểm nội dung (PAAST)
              </h2>
              <p className="text-sm text-slate-500">
                Dán hoặc gõ nội dung bất kỳ để chấm theo 5 lăng kính Prefer · Action ·
                Acknowledge · Stick · Trust — không cần gắn với task.
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <ContentScoringTab bare />
        </div>
      </div>
    </div>
  )
}
