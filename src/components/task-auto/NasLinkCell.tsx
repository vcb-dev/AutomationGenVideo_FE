'use client'

import toast from 'react-hot-toast'
import { Copy } from 'lucide-react'

export function NasLinkCell({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return <span className="text-slate-300 text-sm">—</span>

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Đã copy link ổ NAS')
    } catch {
      toast.error('Không thể copy link')
    }
  }

  return (
    <div className={className ?? 'flex items-center gap-1.5 max-w-[220px]'}>
      <span className="truncate text-sm text-slate-600" title={value}>{value}</span>
      <button
        onClick={copy}
        title="Copy link ổ NAS"
        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
