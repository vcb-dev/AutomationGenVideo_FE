'use client'

import { useState } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Loader2, X, Trash2, Mic, AlignLeft, Clapperboard,
  ExternalLink, Edit2, SendHorizontal,
} from 'lucide-react'
import { cn, drivePreviewUrl, driveDirectUrl } from '@/lib/utils'
import { getContent } from '@/lib/api/task-auto'
import type { Content } from '@/types/task-auto'

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_TASK: 'Đang dùng',
  USED: 'Đã dùng',
  ARCHIVED: 'Lưu trữ',
}
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  IN_TASK: 'bg-blue-100 text-blue-700',
  USED: 'bg-gray-100 text-slate-500',
  ARCHIVED: 'bg-amber-100 text-amber-600',
}
const MARKET_LABEL: Record<string, string> = { VIETNAM: 'Vietnam', GLOBAL: 'Global' }
const MARKET_COLOR: Record<string, string> = {
  VIETNAM: 'bg-red-100 text-red-700',
  GLOBAL: 'bg-blue-100 text-blue-700',
}

interface Props {
  content: Content
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPushToTeam?: () => void
}

export function ContentDetailModal({ content, onClose, onEdit, onDelete, onPushToTeam }: Props) {
  useScrollLock()
  const [fileOpen, setFileOpen] = useState(false)

  const { data: fullContent, isLoading } = useQuery({
    queryKey: ['task-auto', 'content', content.id],
    queryFn: () => getContent(content.id),
  })

  const c = fullContent ?? content
  const markets = (c?.market ?? '').split(',').map(m => m.trim()).filter(Boolean)
  const voiceSrc = driveDirectUrl(c?.voice_url)
  const fileSrc = drivePreviewUrl(c?.file_content_url)

  return (
    <>
      <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {fileOpen && fileSrc && (
        <div className="fixed inset-0 z-[1010] bg-black/80 flex flex-col" onClick={() => setFileOpen(false)}>
          <div className="flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-white font-semibold text-sm truncate">{c?.title}</span>
            <button
              onClick={() => setFileOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 px-5 pb-5" onClick={e => e.stopPropagation()}>
            <iframe src={fileSrc} className="w-full h-full rounded-xl border-0 bg-white" allow="autoplay" />
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-black/8"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {c?.status && (
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-500')}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                )}
                {markets.map(m => (
                  <span key={m} className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', MARKET_COLOR[m] ?? 'bg-gray-100 text-gray-600')}>
                    {MARKET_LABEL[m] ?? m}
                  </span>
                ))}
                {c?.content_line && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                    {c.content_line.name}
                  </span>
                )}
              </div>
              <h2 className="font-bold text-slate-900 text-lg leading-snug">
                {c?.title || <span className="text-slate-400 italic font-normal text-base">Chưa đặt tên</span>}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {c?.added_by && (
                    <div className="bg-gray-50 rounded-xl px-3.5 py-3">
                      <p className="text-xs text-slate-400 mb-0.5">Người thêm</p>
                      <p className="text-sm font-semibold text-slate-800">{c.added_by.full_name}</p>
                    </div>
                  )}
                  {c?.created_at && (
                    <div className="bg-gray-50 rounded-xl px-3.5 py-3">
                      <p className="text-xs text-slate-400 mb-0.5">Ngày thêm</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(c.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  )}
                  {c?.view_count != null && (
                    <div className="bg-gray-50 rounded-xl px-3.5 py-3">
                      <p className="text-xs text-slate-400 mb-0.5">Lượt xem</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {Number(c.view_count).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  )}
                  {c?.brand_type && (
                    <div className="bg-gray-50 rounded-xl px-3.5 py-3">
                      <p className="text-xs text-slate-400 mb-0.5">Nhóm sản phẩm</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {c.brand_type === 'DO_DA' ? 'Đồ da' : 'Trang sức'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Body text */}
                {c?.body && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-700">Nội dung</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-4 py-3.5 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-gray-100">
                      {c.body}
                    </div>
                  </div>
                )}

                {/* Script */}
                {c?.script && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clapperboard className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-700">Script</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-4 py-3.5 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-gray-100">
                      {c.script}
                    </div>
                  </div>
                )}

                {/* Media */}
                {(c?.voice_url || c?.file_content_url) && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2.5">Tệp đính kèm</p>
                    <div className="space-y-2.5">
                      {voiceSrc && (
                        <div className="flex items-center gap-3 bg-violet-50 rounded-xl px-4 py-3 border border-violet-100">
                          <Mic className="w-4 h-4 text-violet-500 shrink-0" />
                          <audio src={voiceSrc} controls className="flex-1 h-8" style={{ colorScheme: 'light' }} />
                        </div>
                      )}
                      {c?.file_content_url && (
                        <div className="flex items-center gap-3">
                          {fileSrc && (
                            <button
                              onClick={() => setFileOpen(true)}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                            >
                              <FileText className="w-4 h-4" /> Xem file
                            </button>
                          )}
                          <a
                            href={c.file_content_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" /> Mở link gốc
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <div>
              {onPushToTeam && (
                <button
                  onClick={() => { onPushToTeam(); onClose() }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                >
                  <SendHorizontal className="w-3.5 h-3.5" /> Đẩy sang team
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onDelete && (
                <button
                  onClick={() => { onDelete(); onClose() }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              {onEdit && (
                <button
                  onClick={() => { onEdit(); onClose() }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
