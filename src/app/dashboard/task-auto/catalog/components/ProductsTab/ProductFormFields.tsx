'use client'

import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Plus, Loader2, Upload, X, Link as LinkIcon, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { MARKETS, SourceDraft } from './product-utils'
import { uploadProductImage } from '@/lib/api/task-auto'
import { SOURCE_TYPE_LABELS, SourceType } from '@/types/task-auto'

// ── MarketBadge ───────────────────────────────────────

export function MarketBadge({ market }: { market: string }) {
  const isGlobal = market === 'GLOBAL'
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap',
      isGlobal ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
    )}>
      {market === 'VIETNAM' ? 'VN' : isGlobal ? 'GL' : market}
    </span>
  )
}

// ── LoadingRows ───────────────────────────────────────

export function LoadingRows({ cols }: { cols: number }) {
  return <>
    {Array.from({ length: 5 }).map((_, i) => (
      <tr key={i}>{Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
      ))}</tr>
    ))}
  </>
}

// ── MiniList ──────────────────────────────────────────

const MINI_LIST_COLORS = {
  purple: {
    header:  'bg-purple-600',
    dot:     'bg-purple-400',
    badge:   'bg-purple-100 text-purple-700',
    addBtn:  'bg-purple-600 hover:bg-purple-700',
    ring:    'focus:ring-purple-400',
  },
  teal: {
    header:  'bg-teal-600',
    dot:     'bg-teal-400',
    badge:   'bg-teal-100 text-teal-700',
    addBtn:  'bg-teal-600 hover:bg-teal-700',
    ring:    'focus:ring-teal-400',
  },
  indigo: {
    header:  'bg-indigo-600',
    dot:     'bg-indigo-400',
    badge:   'bg-indigo-100 text-indigo-700',
    addBtn:  'bg-indigo-600 hover:bg-indigo-700',
    ring:    'focus:ring-indigo-400',
  },
} as const

export function MiniList({
  title, items, onAdd, onDelete, addLabel, color = 'indigo',
}: {
  title: string
  items: { id: string; name: string; _count?: Record<string, number> }[]
  onAdd: (name: string) => Promise<unknown>
  onDelete?: (id: string) => void
  addLabel: string
  color?: keyof typeof MINI_LIST_COLORS
}) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const c = MINI_LIST_COLORS[color]

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try { await onAdd(newName.trim()); setNewName('') }
    finally { setAdding(false) }
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
      {/* Header */}
      <div className={cn('px-4 py-3 flex items-center justify-between', c.header)}>
        <span className="text-sm font-bold text-white">{title}</span>
        <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
          {items.length} mục
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400 italic">Chưa có dữ liệu</p>
          </div>
        ) : (
          items.map((item, i) => {
            const count = item._count
              ? Object.values(item._count).reduce((a, b) => a + b, 0)
              : null
            return (
              <div key={item.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 group transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs text-slate-300 font-mono w-4 text-right shrink-0 select-none">{i + 1}</span>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />
                  <span className="text-sm text-slate-700 font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {count !== null && count > 0 && (
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', c.badge)}>
                      {count}
                    </span>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item.id)}
                      title="Xóa"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add row */}
      <div className="px-4 py-3 bg-gray-50/60 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={addLabel}
            className={cn(
              'flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors',
              c.ring,
            )}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className={cn(
              'px-4 py-2 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors shrink-0',
              c.addBtn,
            )}
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Thêm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MarketPicker ──────────────────────────────────────

export function MarketPicker({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label?: string }) {
  const toggle = (m: string) =>
    onChange(value.includes(m) ? value.filter(x => x !== m) : [...value, m])

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>}
      <div className="flex gap-2">
        {MARKETS.map(m => {
          const active = value.includes(m.value)
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => toggle(m.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                active ? m.activeClass : 'bg-gray-50 text-slate-400 border-gray-200 hover:border-gray-300 hover:text-slate-600'
              )}
            >
              <span>{m.label}</span>
              {active && <span className="text-[10px]">✓</span>}
            </button>
          )
        })}
      </div>
      {value.length === 0 && (
        <p className="text-xs text-amber-600 mt-1.5">Chọn ít nhất một thị trường</p>
      )}
    </div>
  )
}

// ── PriceInput ────────────────────────────────────────

export function PriceInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const toDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    return new Intl.NumberFormat('vi-VN').format(Number(digits))
  }
  const [display, setDisplay] = useState(() => toDisplay(value ?? ''))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    setDisplay(digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '')
    onChange(digits)
  }

  return (
    <div>
      {label && <label className="block text-base font-semibold text-slate-700 mb-2">{label}</label>}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          placeholder="0"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 pr-9 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base text-slate-400 font-medium pointer-events-none select-none">₫</span>
      </div>
    </div>
  )
}

// ── MultiImagePicker ──────────────────────────────────

export function MultiImagePicker({ values, onChange }: { values: string[]; onChange: (urls: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showUrl, setShowUrl] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i))

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Chỉ chấp nhận file ảnh')
    if (file.size > 5 * 1024 * 1024) return toast.error('Ảnh tối đa 5MB')
    setUploading(true)
    try {
      const { url } = await uploadProductImage(file)
      onChange([...values, url])
    } catch {
      toast.error('Không thể tải ảnh lên')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const addUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    onChange([...values, trimmed])
    setUrlInput('')
    setShowUrl(false)
  }

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <label className="block text-base font-semibold text-slate-700">
        Ảnh sản phẩm
        {values.length > 0 && (
          <span className="ml-1.5 text-sm font-normal text-slate-400">({values.length} ảnh)</span>
        )}
      </label>

      {values.length === 0 && (
        <button
          type="button"
          onClick={() => !uploading && fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-2xl py-10 transition-colors disabled:opacity-60 group"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-sm font-medium text-indigo-600">Đang tải ảnh lên...</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">Nhấn để tải ảnh lên</p>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP — tối đa 5MB</p>
              </div>
            </>
          )}
        </button>
      )}

      {values.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {values.map((url, i) => (
            <div key={i} className="relative w-28 h-28 rounded-xl overflow-hidden border border-gray-200 group shrink-0 shadow-sm">
              <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                <X className="w-3 h-3" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-indigo-600/85 text-white text-[10px] text-center py-1 font-semibold tracking-wide">
                  Ảnh chính
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => !uploading && fileRef.current?.click()}
            disabled={uploading}
            className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center justify-center gap-1.5 transition-colors text-slate-400 hover:text-indigo-500 shrink-0 disabled:opacity-60"
          >
            {uploading
              ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              : <><Plus className="w-6 h-6" /><span className="text-xs font-medium">Thêm ảnh</span></>
            }
          </button>
        </div>
      )}

      {showUrl ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            placeholder="https://..."
            autoFocus
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
          <button type="button" onClick={addUrl}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
            Thêm
          </button>
          <button type="button" onClick={() => { setShowUrl(false); setUrlInput('') }}
            className="px-3 py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Hủy
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowUrl(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
          <LinkIcon className="w-3.5 h-3.5" />
          Thêm bằng URL
        </button>
      )}
    </div>
  )
}

// ── SourceForm ────────────────────────────────────────

export function SourceForm({ value, onChange }: { value: SourceDraft; onChange: (v: SourceDraft) => void }) {
  const set = (patch: Partial<SourceDraft>) => onChange({ ...value, ...patch })
  const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors'

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => set({ enabled: !value.enabled })}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors',
          value.enabled ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-slate-600 hover:bg-gray-100'
        )}>
        <span className="flex items-center gap-2">
          <Plus className={cn('w-4 h-4 transition-transform', value.enabled && 'rotate-45')} />
          Thêm source cho sản phẩm
        </span>
        {value.enabled && <span className="text-xs font-normal text-indigo-500">Bấm để ẩn</span>}
      </button>
      {value.enabled && (
        <div className="p-4 space-y-3 bg-white">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Loại source *</label>
              <CustomSelect value={value.type} onChange={v => set({ type: v as SourceType })}
                options={(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map(t => ({ value: t, label: SOURCE_TYPE_LABELS[t] }))} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Mã code</label>
              <input value={value.code} onChange={e => set({ code: e.target.value })} placeholder="VD: SRC001" className={inputCls} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Tên source *</label>
            <input value={value.name} onChange={e => set({ name: e.target.value })} placeholder="Tên nguồn tài liệu" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Link *</label>
            <input value={value.link} onChange={e => set({ link: e.target.value })} placeholder="https://..." className={inputCls} />
          </div>
        </div>
      )}
    </div>
  )
}
