'use client'

import { useState } from 'react'
import { Globe, Trash2, Mic, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContentDetailModal } from './ContentDetailModal'
import type { TeamContent } from '@/types/task-auto'
import { STATUS_LABELS, STATUS_COLORS, MARKET_LABELS } from './constants'

interface Props {
  teamContent: TeamContent
  canRemove: boolean
  canPushToGlobal: boolean
  onRemove: () => void
  onPush: () => void
}

const STATUS_BAR: Record<string, string> = {
  AVAILABLE: 'bg-emerald-400',
  IN_TASK:   'bg-blue-400',
  USED:      'bg-slate-300',
  ARCHIVED:  'bg-amber-400',
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()
}

export function ContentCard({ teamContent, canRemove, canPushToGlobal, onRemove, onPush }: Props) {
  const [showDetail, setShowDetail] = useState(false)
  const c = teamContent.content

  const preview = c?.body?.trim() || c?.title || ''
  const hasVoice = !!c?.voice_url
  const hasFile  = !!c?.file_content_url

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col"
      >
        {/* Top accent bar */}
        <div className={cn('h-1 w-full shrink-0', c?.status ? STATUS_BAR[c.status] : 'bg-gray-200')} />

        <div className="p-5 flex-1 flex flex-col gap-3">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {c?.status && (
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_COLORS[c.status])}>
                {STATUS_LABELS[c.status]}
              </span>
            )}
            {c?.market && (
              <span className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap',
                c.market === 'VIETNAM' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
              )}>
                {MARKET_LABELS[c.market] ?? c.market}
              </span>
            )}
            {c?.content_line && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-500 whitespace-nowrap max-w-[140px] truncate">
                {c.content_line.name}
              </span>
            )}
          </div>

          {/* Title */}
          <p className={cn(
            'font-bold text-base leading-snug line-clamp-2',
            c?.title ? 'text-slate-800' : 'text-slate-400 italic font-normal'
          )}>
            {c?.title || 'Chưa đặt tên'}
          </p>

          {/* Body preview */}
          {preview && c?.body && (
            <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
              {c.body.trim()}
            </p>
          )}

          {/* Indicators */}
          {(hasVoice || hasFile) && (
            <div className="flex items-center gap-3 mt-auto pt-1">
              {hasVoice && (
                <span className="inline-flex items-center gap-1 text-xs text-purple-500 font-medium">
                  <Mic className="w-3.5 h-3.5" /> Voice
                </span>
              )}
              {hasFile && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                  <FileText className="w-3.5 h-3.5" /> File
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-slate-50/60 flex items-center justify-between gap-2">
          {/* Author */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-indigo-600 leading-none">
                {getInitials(teamContent.added_by?.full_name)}
              </span>
            </div>
            <span className="text-sm text-slate-400 truncate">
              {teamContent.added_by?.full_name ?? '—'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {canPushToGlobal && (
              <button
                onClick={e => { e.stopPropagation(); onPush() }}
                title="Đẩy ra kho tổng"
                className="p-2 rounded-lg text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                <Globe className="w-4 h-4" />
              </button>
            )}
            {canRemove && (
              <button
                onClick={e => { e.stopPropagation(); onRemove() }}
                title="Xóa khỏi kho team"
                className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showDetail && (
        <ContentDetailModal
          teamContent={teamContent}
          canRemove={canRemove}
          canPushToGlobal={canPushToGlobal}
          onRemove={() => { onRemove(); setShowDetail(false) }}
          onPush={() => { onPush(); setShowDetail(false) }}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}
