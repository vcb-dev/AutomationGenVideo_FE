'use client'

import { useEffect, useRef, useState, type ElementType, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ChevronDown, Loader2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TaskToolItem {
  key: string
  label: string
  description: string
  icon: ElementType
  onSelect: () => void
  /** Đang chạy — nút "Công cụ" hiện vòng quay để không mất dấu khi menu đã đóng */
  busy?: boolean
  /** Có giá trị = không dùng được ở tab đang xem: mục hiện mờ, lý do thay cho mô tả */
  disabledReason?: string
}

/** Menu "Công cụ" ở đầu màn Nhiệm vụ — gom các thao tác phụ để nút chính "Tạo nhiệm vụ" nổi bật. */
export function TaskToolsMenu({ items }: { items: TaskToolItem[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const busyItem = items.find(i => i.busy)

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus()
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onEscape, true)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onEscape, true)
    }
  }, [open])

  function onMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const els = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])
    if (!els.length) return
    const i = els.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length
    els[next].focus()
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={!!busyItem}
        title={busyItem ? busyItem.label : undefined}
        className="h-10 flex items-center gap-2 px-3.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {busyItem
          ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" aria-hidden="true" />
          : <Wrench className="w-4 h-4 text-slate-500" aria-hidden="true" />}
        Công cụ
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Công cụ"
          onKeyDown={onMenuKeyDown}
          className="absolute z-30 right-0 top-full mt-1.5 w-[min(320px,calc(100vw-2rem))] bg-white border border-gray-200 rounded-xl shadow-lg p-1.5"
        >
          {items.map(item => {
            const Icon = item.icon
            const disabled = !!item.disabledReason
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => { setOpen(false); item.onSelect() }}
                className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-indigo-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <span className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  disabled ? 'bg-gray-100 text-slate-300' : 'bg-indigo-50 text-indigo-600',
                )}>
                  {item.busy
                    ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    : <Icon className="w-4 h-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm font-semibold', disabled ? 'text-slate-400' : 'text-slate-800')}>{item.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{item.disabledReason ?? item.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
