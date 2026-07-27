'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface HeaderFilterOption {
  value: string
  label: string
  count?: number
}

interface HeaderFilterDropdownProps {
  label: string
  value: string
  options: HeaderFilterOption[]
  onChange: (value: string) => void
  totalCount?: number
  align?: 'left' | 'right'
}

const MENU_WIDTH = 224 // w-56

// Dropdown filter gắn ngay trong tiêu đề bảng — cùng UI/UX với filter "Người làm" ở bảng task.
// Menu render qua portal (position: fixed, tính theo bounding rect của trigger) để không bị
// clip bởi vùng overflow-x-auto của bảng chứa nó trên mobile.
export function HeaderFilterDropdown({ label, value, options, onChange, totalCount, align = 'left' }: HeaderFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function calcPos() {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const MENU_H = 320 // max-h-80
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < MENU_H && r.top > MENU_H
    const left = align === 'right'
      ? Math.max(8, r.right - MENU_WIDTH)
      : Math.min(r.left, window.innerWidth - MENU_WIDTH - 8)
    setPos({ top: openUp ? r.top - 6 : r.bottom + 6, left, openUp })
  }

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    calcPos()
    setOpen(v => !v)
  }

  const activeLabel = value ? (options.find(o => o.value === value)?.label ?? label) : label

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={toggleOpen}
        className={cn(
          'flex items-center gap-1.5 text-sm font-black tracking-wide transition-colors whitespace-nowrap',
          value ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-600',
        )}
      >
        {activeLabel}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <AnimatePresence>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{ position: 'fixed', top: pos.openUp ? undefined : pos.top, bottom: pos.openUp ? window.innerHeight - pos.top : undefined, left: pos.left, width: MENU_WIDTH, zIndex: 9999 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden py-1.5 max-h-80 overflow-y-auto"
          >
            <button
              onClick={() => { onChange(''); setOpen(false) }}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold transition-colors',
                !value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                Tất cả
              </span>
              {totalCount !== undefined && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-bold',
                  !value ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400',
                )}>
                  {totalCount}
                </span>
              )}
            </button>

            {options.map(opt => {
              const active = value === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <span className="truncate text-left">{opt.label}</span>
                  {opt.count !== undefined && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-bold shrink-0',
                      active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400',
                    )}>
                      {opt.count}
                    </span>
                  )}
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
