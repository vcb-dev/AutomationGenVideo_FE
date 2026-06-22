'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, Loader2, X, Globe, ExternalLink, Trash2, Play, Mic, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getContent } from '@/lib/api/task-auto'
import type { TeamContent } from '@/types/task-auto'
import { STATUS_LABELS, STATUS_COLORS, MARKET_LABELS } from './constants'

interface Props {
  teamContent: TeamContent
  canRemove: boolean
  canPushToGlobal: boolean
  onRemove: () => void
  onPush: () => void
  onClose: () => void
}

export function ContentDetailModal({ teamContent, canRemove, canPushToGlobal, onRemove, onPush, onClose }: Props) {
  const { data: content, isLoading } = useQuery({
    queryKey: ['task-auto', 'content', teamContent.content_id],
    queryFn: () => getContent(teamContent.content_id),
  })

  const c = content ?? teamContent.content

  return (
    <>
      <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/8">

          <div className="flex items-start gap-4 px-7 py-5 border-b border-gray-100 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {c?.status && (
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', STATUS_COLORS[c.status])}>
                    {STATUS_LABELS[c.status]}
                  </span>
                )}
                {c?.market && (
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                    c.market === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  )}>
                    {MARKET_LABELS[c.market] ?? c.market}
                  </span>
                )}
                {c?.content_line && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                    {c.content_line.name}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-snug">
                {c?.title || <span className="text-slate-400 italic font-normal">Chưa đặt tên</span>}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="p-7 space-y-6">
                {content?.view_count && Number(content.view_count) > 0 && (
                  <div className="flex items-center gap-2 text-base text-slate-500">
                    <Eye className="w-5 h-5 text-slate-400" />
                    <span>{Number(content.view_count).toLocaleString('vi-VN')} lượt xem</span>
                  </div>
                )}

                {content?.body && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Nội dung</p>
                    <div className="bg-gray-50 rounded-xl p-5 text-base text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-gray-100">
                      {content.body}
                    </div>
                  </div>
                )}

                {content?.script && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Script</p>
                    <div className="bg-gray-50 rounded-xl p-5 text-base text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-gray-100">
                      {content.script}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {content?.file_content_url && (
                    <a href={content.file_content_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                      <Play className="w-4 h-4" /> Xem file
                    </a>
                  )}
                  {content?.voice_url && (
                    <a href={content.voice_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors">
                      <Mic className="w-4 h-4" /> Nghe voice
                    </a>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 text-sm text-slate-400 space-y-1">
                  <p>Thêm bởi <span className="font-semibold text-slate-600">{teamContent.added_by?.full_name ?? '—'}</span></p>
                  <p>{new Date(teamContent.added_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
            <div className="flex gap-2">
              {canPushToGlobal && (
                <button onClick={() => { onPush(); onClose() }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                  <Globe className="w-4 h-4" /> Đẩy ra kho tổng
                </button>
              )}
              {c?.file_content_url && (
                <a href={c.file_content_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Mở file
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {canRemove && (
                <button onClick={() => { onRemove(); onClose() }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" /> Xóa khỏi kho
                </button>
              )}
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-gray-200 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
