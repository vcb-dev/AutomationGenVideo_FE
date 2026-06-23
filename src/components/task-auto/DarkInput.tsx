'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X, Plus, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: React.ReactNode
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

const baseInput = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:bg-gray-50'
const labelClass = 'block text-base font-semibold text-slate-700 mb-2'

export function DarkInput({ label, className, ...props }: InputProps) {
  return (
    <div>
      {label && <label className={labelClass}>{label}</label>}
      <input className={cn(baseInput, className)} {...props} />
    </div>
  )
}

export function DarkSelect({ label, className, children, ...props }: SelectProps) {
  return (
    <div>
      {label && <label className={labelClass}>{label}</label>}
      <select className={cn(baseInput, 'bg-white', className)} {...props}>
        {children}
      </select>
    </div>
  )
}

export function DarkTextarea({ label, className, ...props }: TextareaProps) {
  return (
    <div>
      {label && <label className={labelClass}>{label}</label>}
      <textarea className={cn(baseInput, 'resize-none', className)} {...props} />
    </div>
  )
}

// ── CustomSelect ──────────────────────────────────

export interface SelectOption { value: string; label: string }

interface CustomSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  searchable?: boolean
  className?: string
}

export function CustomSelect({ label, value, onChange, options, searchable, className }: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const selected = options.find(o => o.value === value)

  function calcPos() {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const DROPDOWN_H = Math.min(options.length * 40 + (searchable ? 48 : 0), 260)
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < DROPDOWN_H && r.top > DROPDOWN_H
    setPos({ top: openUp ? r.top - DROPDOWN_H - 4 : r.bottom + 4, left: r.left, width: r.width, openUp })
  }

  function handleOpen() {
    calcPos()
    setOpen(o => !o)
  }

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className={cn(className)}>
      {label && <label className={labelClass}>{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(baseInput, 'flex items-center justify-between gap-2 text-left cursor-pointer', open && 'ring-2 ring-indigo-500 border-indigo-500')}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected?.label ?? '—'}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className={cn(
            'min-w-[200px] bg-white border border-gray-200 shadow-xl overflow-hidden',
            pos.openUp ? 'rounded-t-xl' : 'rounded-xl'
          )}
        >
          {searchable && (
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}>
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
          )}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 italic">Không có kết quả</li>
            ) : (
              filtered.map(o => (
                <li key={o.value}>
                  <button type="button" onClick={() => select(o.value)}
                    className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors',
                      value === o.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-gray-50')}>
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── ServerSearchSelect ────────────────────────────
// Dùng khi danh sách lấy từ server theo keyword tìm kiếm

export interface SearchItem { value: string; label: string; sublabel?: string }

interface ServerSearchSelectProps {
  label?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  items: SearchItem[]
  searchValue: string
  onSearchChange: (v: string) => void
  loading?: boolean
  placeholder?: string
  clearLabel?: string
  searchPlaceholder?: string
  createLabel?: string
  onCreateClick?: () => void
  filterSlot?: React.ReactNode
}

export function ServerSearchSelect({
  label,
  required,
  value,
  onChange,
  items,
  searchValue,
  onSearchChange,
  loading,
  placeholder = '-- Chọn --',
  clearLabel,
  searchPlaceholder = 'Tìm kiếm...',
  createLabel,
  onCreateClick,
  filterSlot,
}: ServerSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = items.find(i => i.value === value)

  function handleOpen() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      const DROPDOWN_H = 320
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < DROPDOWN_H && r.top > DROPDOWN_H
      setPos({ top: openUp ? r.top - DROPDOWN_H - 4 : r.bottom + 4, left: r.left, width: r.width, openUp })
    }
    setOpen(o => !o)
  }

  function select(v: string) {
    onChange(v)
    setOpen(false)
  }

  return (
    <div>
      {label && (
        <label className={labelClass}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          baseInput,
          'flex items-center justify-between gap-2 text-left cursor-pointer',
          open && 'ring-2 ring-indigo-500 border-indigo-500'
        )}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span role="button" onClick={e => { e.stopPropagation(); select('') }}
              className="p-0.5 hover:bg-gray-100 rounded-full text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className={cn(
            'min-w-[240px] bg-white border border-gray-200 shadow-xl overflow-hidden',
            pos.openUp ? 'rounded-t-xl' : 'rounded-xl'
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              autoFocus
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
            />
            {searchValue && (
              <button type="button" onClick={() => onSearchChange('')}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          {filterSlot && (
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/60">
              {filterSlot}
            </div>
          )}
          <ul className="max-h-48 overflow-y-auto py-1">
            {clearLabel && (
              <li>
                <button type="button" onClick={() => select('')}
                  className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors',
                    !value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-gray-50')}>
                  {clearLabel}
                </button>
              </li>
            )}
            {loading ? (
              <li className="px-4 py-3 text-sm text-slate-400">Đang tải...</li>
            ) : items.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 italic">
                {searchValue ? 'Không tìm thấy kết quả' : 'Nhập từ khoá để tìm kiếm'}
              </li>
            ) : (
              items.map(item => (
                <li key={item.value}>
                  <button type="button" onClick={() => select(item.value)}
                    className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors',
                      value === item.value
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-gray-50')}>
                    <span className="block leading-tight">{item.label}</span>
                    {item.sublabel && <span className="block text-xs text-slate-400 mt-0.5">{item.sublabel}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
          {createLabel && onCreateClick && (
            <div className="border-t border-dashed border-gray-200">
              <button
                type="button"
                onClick={() => { onCreateClick(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                {createLabel}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── ProductSearchSelect ────────────────────────────

interface ProductOption { id: string; sku: string; name: string }

interface ProductSearchSelectProps {
  label?: string
  value: string
  onChange: (id: string) => void
  products: ProductOption[]
  placeholder?: string
  clearLabel?: string
}

export function ProductSearchSelect({
  label,
  value,
  onChange,
  products,
  placeholder = '-- Chọn sản phẩm --',
  clearLabel = '-- Không chọn --',
}: ProductSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = products.filter(p =>
    !search || p.sku.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const selected = products.find(p => p.id === value)

  function handleOpen() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      const DROPDOWN_H = 280
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < DROPDOWN_H && r.top > DROPDOWN_H
      setPos({ top: openUp ? r.top - DROPDOWN_H - 4 : r.bottom + 4, left: r.left, width: r.width, openUp })
    }
    setOpen(o => !o)
  }

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <div>
      {label && <label className={labelClass}>{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          baseInput,
          'flex items-center justify-between gap-2 text-left cursor-pointer',
          open && 'ring-2 ring-indigo-500 border-indigo-500'
        )}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected ? `${selected.sku} — ${selected.name}` : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); select('') }}
              className="p-0.5 hover:bg-gray-100 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className={cn(
            'min-w-[240px] bg-white border border-gray-200 shadow-xl overflow-hidden',
            pos.openUp ? 'rounded-t-xl' : 'rounded-xl'
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc SKU..."
              className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => select('')}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm transition-colors',
                  !value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-gray-50'
                )}
              >
                {clearLabel}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 italic">Không tìm thấy sản phẩm</li>
            ) : (
              filtered.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => select(p.id)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm transition-colors',
                      value === p.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-800 hover:bg-gray-50'
                    )}
                  >
                    <span className="font-mono text-xs text-slate-500 mr-2">{p.sku}</span>
                    {p.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── CreatableSelect ────────────────────────────────
// Dropdown có tìm kiếm + tạo mới ngay trong dropdown

interface CreatableSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  placeholder?: string
  clearLabel?: string
  createLabel?: string
  onCreate: (name: string) => Promise<{ id: string; label: string }>
}

export function CreatableSelect({
  label, value, onChange, options, className,
  placeholder = '— Chọn —',
  clearLabel = '-- Không chọn --',
  createLabel = 'Thêm mới',
  onCreate,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [inlineCreate, setInlineCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false)
        setInlineCreate(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const selected = options.find(o => o.value === value)
  const canQuickCreate = search.trim().length > 0
    && !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase())

  function handleOpen() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      const DROPDOWN_H = 280
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < DROPDOWN_H && r.top > DROPDOWN_H
      setPos({ top: openUp ? r.top - DROPDOWN_H - 4 : r.bottom + 4, left: r.left, width: r.width, openUp })
    }
    setOpen(o => !o)
  }

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setSearch('')
    setInlineCreate(false)
    setNewName('')
  }

  async function handleCreate(name: string) {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      const created = await onCreate(trimmed)
      onChange(created.id)
      setOpen(false)
      setSearch('')
      setInlineCreate(false)
      setNewName('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={cn(className)}>
      {label && <label className={labelClass}>{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(baseInput, 'flex items-center justify-between gap-2 text-left cursor-pointer', open && 'ring-2 ring-indigo-500 border-indigo-500')}
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected?.label ?? placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span role="button" onClick={e => { e.stopPropagation(); select('') }}
              className="p-0.5 hover:bg-gray-100 rounded-full text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className={cn(
            'min-w-[240px] bg-white border border-gray-200 shadow-xl overflow-hidden',
            pos.openUp ? 'rounded-t-xl' : 'rounded-xl'
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              autoFocus={!inlineCreate}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          <ul className="max-h-44 overflow-y-auto py-1">
            <li>
              <button type="button" onClick={() => select('')}
                className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors',
                  !value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-gray-50')}>
                {clearLabel}
              </button>
            </li>
            {filtered.length === 0 && !canQuickCreate ? (
              <li className="px-4 py-3 text-sm text-slate-400 italic">
                {search ? 'Không tìm thấy' : 'Chưa có dữ liệu'}
              </li>
            ) : (
              filtered.map(o => (
                <li key={o.value}>
                  <button type="button" onClick={() => select(o.value)}
                    className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors',
                      value === o.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-gray-50')}>
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-dashed border-gray-200">
            {!inlineCreate ? (
              canQuickCreate ? (
                <button type="button" onClick={() => handleCreate(search)} disabled={creating}
                  className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-semibold transition-colors disabled:opacity-60">
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Thêm "{search.trim()}"
                </button>
              ) : (
                <button type="button"
                  onClick={() => { setInlineCreate(true); setNewName(search); setTimeout(() => createInputRef.current?.focus(), 50) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-semibold transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  {createLabel}...
                </button>
              )
            ) : (
              <div className="p-3 space-y-2 bg-indigo-50/50">
                <p className="text-xs font-bold text-indigo-600">{createLabel}</p>
                <div className="flex gap-2">
                  <input
                    ref={createInputRef}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreate(newName)
                      if (e.key === 'Escape') { setInlineCreate(false); setNewName('') }
                    }}
                    placeholder="Nhập tên..."
                    className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => handleCreate(newName)}
                    disabled={creating || !newName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50 transition-colors flex items-center">
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button" onClick={() => { setInlineCreate(false); setNewName('') }}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">Enter để thêm · Esc để hủy</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
