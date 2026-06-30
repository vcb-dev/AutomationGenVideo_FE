'use client'
import React from 'react'
import { ExternalLink, HardDrive } from 'lucide-react'
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
  source: Pick<Source, 'id' | 'name' | 'link' | 'type'> & { nas_link?: string | null }
  showType?: boolean
  label?: string
}

export function SourceRow({ source, showType, label }: Props) {
  const style = SOURCE_STYLES[source.type] ?? SOURCE_STYLES.PRODUCT_STOCK
  const hasLink = !!source.link
  const hasNas  = !!source.nas_link

  const inner = (
    <>
      <span className={cn('w-2 h-2 rounded-full shrink-0', style.dot)} />
      <span className={cn('text-sm flex-1 min-w-0 truncate', hasLink && 'group-hover:underline', style.text)}>
        {label ? <span className="font-semibold mr-1.5">[{label}]</span> : null}
        {source.name}
      </span>
      {showType && (
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', style.badge)}>
          {SOURCE_TYPE_LABELS[source.type]}
        </span>
      )}
      <ExternalLink className={cn('w-3.5 h-3.5 shrink-0', hasLink ? 'opacity-50' : 'opacity-20', style.text)} />
    </>
  )

  return (
    <div className="flex flex-col">
      {hasLink ? (
        <a
          href={source.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn('flex items-center gap-2.5 group px-3 py-2 rounded-lg transition-colors cursor-pointer no-underline', style.hover)}
        >
          {inner}
        </a>
      ) : (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-default">
          {inner}
        </div>
      )}

      {hasNas && (
        <a
          href={source.nas_link!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors no-underline group"
        >
          <HardDrive className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-600 group-hover:underline truncate">Link ổ NAS</span>
          <ExternalLink className="w-3 h-3 text-amber-400 opacity-60 shrink-0" />
        </a>
      )}
    </div>
  )
}