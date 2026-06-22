'use client'

import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Source, SourceType } from '@/types/task-auto'
import { SOURCE_TYPE_LABELS } from '@/types/task-auto'

export const SOURCE_STYLES: Record<SourceType, { dot: string; text: string; hover: string; badge: string }> = {
  PRODUCT_STOCK: { dot: 'bg-indigo-400',  text: 'text-indigo-700',  hover: 'hover:bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700' },
  COLLECTED:     { dot: 'bg-emerald-400', text: 'text-emerald-700', hover: 'hover:bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  OUTRO:         { dot: 'bg-purple-400',  text: 'text-purple-700',  hover: 'hover:bg-purple-50',  badge: 'bg-purple-100 text-purple-700' },
  WORKSHOP:      { dot: 'bg-amber-400',   text: 'text-amber-700',   hover: 'hover:bg-amber-50',   badge: 'bg-amber-100 text-amber-700' },
  HUYK:          { dot: 'bg-rose-400',    text: 'text-rose-700',    hover: 'hover:bg-rose-50',    badge: 'bg-rose-100 text-rose-700' },
}

interface Props {
  source: Pick<Source, 'id' | 'name' | 'link' | 'type'>
  showType?: boolean
  label?: string
}

export function SourceRow({ source, showType, label }: Props) {
  const style = SOURCE_STYLES[source.type] ?? SOURCE_STYLES.PRODUCT_STOCK
  return (
    <a href={source.link} target="_blank" rel="noopener noreferrer"
      className={cn('flex items-center gap-2.5 group px-3 py-2 rounded-lg transition-colors', style.hover)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', style.dot)} />
      <span className={cn('text-sm group-hover:underline flex-1 min-w-0 truncate', style.text)}>
        {label ? <span className="font-semibold mr-1.5">[{label}]</span> : null}
        {source.name}
      </span>
      {showType && (
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', style.badge)}>
          {SOURCE_TYPE_LABELS[source.type]}
        </span>
      )}
      <ExternalLink className={cn('w-3.5 h-3.5 opacity-50 shrink-0', style.text)} />
    </a>
  )
}
