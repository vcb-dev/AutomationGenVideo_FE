'use client'

import { useState } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import {
  FileText, X, Globe, Trash2, Mic,
  AlignLeft, Clapperboard, ExternalLink, User, Calendar, Tag,
} from 'lucide-react'
import { cn, drivePreviewUrl } from '@/lib/utils'
import type { TeamContent } from '@/types/task-auto'
import { STATUS_LABELS, STATUS_COLORS } from './constants'

interface Props {
  teamContent: TeamContent
  canRemove: boolean
  canPushToGlobal: boolean
  onRemove: () => void
  onPush: () => void
  onClose: () => void
}

const MARKET_LABEL: Record<string, string> = { VIETNAM: 'Việt Nam', INDONESIA: 'Indonesia', JAPAN: 'Nhật Bản', THAILAND: 'Thái Lan' }
const MARKET_COLOR: Record<string, string> = {
  VIETNAM:   'bg-emerald-100 text-emerald-700',
  INDONESIA: 'bg-amber-100 text-amber-700',
  JAPAN:     'bg-rose-100 text-rose-700',
  THAILAND:  'bg-sky-100 text-sky-700',
}

export function ContentDetailModal({ teamContent, canRemove, canPushToGlobal, onRemove, onPush, onClose }: Props) {
  useScrollLock()
  const [fileOpen, setFileOpen] = useState(false)

  const c = teamContent
  const markets = (c?.market ?? '').split(',').map((m: string) => m.trim()).filter(Boolean)
  const voicePreviewSrc = drivePreviewUrl(c?.voice_url)
  const fileSrc         = drivePreviewUrl(c?.file_content_url)

  return (
    <>
      <div className="fixed inset-0 z-[1001] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* File iframe overlay */}
      {fileOpen && fileSrc && (
        <div className="fixed inset-0 z-[1010] bg-black/80 flex flex-col" onClick={() => setFileOpen(false)}>
          <div className="flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-white font-semibold text-sm truncate">{c?.title}</span>
            <button onClick={() => setFileOpen(false)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0">
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
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Title + status */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <h2 className="font-bold text-slate-900 text-lg leading-snug">
                    {c?.title || <span className="text-slate-400 italic font-normal text-base">Chưa đặt tên</span>}
                  </h2>
                  {c?.status && (
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0', STATUS_COLORS[c.status])}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                  {teamContent.added_by && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{teamContent.added_by.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{new Date(teamContent.added_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {c.brand_type && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{c.brand_type === 'DO_DA' ? 'Đồ da' : 'Trang sức'}</span>
                    </div>
                  )}
                  {markets.map(m => (
                    <span key={m} className={cn('px-1.5 py-0.5 rounded-md text-[11px] font-semibold', MARKET_COLOR[m] ?? 'bg-gray-100 text-gray-600')}>
                      {MARKET_LABEL[m] ?? m}
                    </span>
                  ))}
                  {c?.content_line && (
                    <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-violet-100 text-violet-700">
                      {c.content_line.name}
                    </span>
                  )}
                </div>
              </div>

              <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors shrink-0 mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Body text */}
            {c.body && (
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
            {c.script && (
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
            {(c.voice_url || c.file_content_url) && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2.5">Tệp đính kèm</p>
                <div className="space-y-3">
                  {/* Voice — dùng iframe preview để Google Drive player xử lý audio */}
                  {c.voice_url && (
                    <div className="rounded-xl border border-violet-100 bg-violet-50 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-violet-100">
                        <Mic className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <span className="text-xs font-semibold text-violet-700">Voice</span>
                        <a
                          href={c.voice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700"
                        >
                          <ExternalLink className="w-3 h-3" /> Mở link
                        </a>
                      </div>
                      {voicePreviewSrc ? (
                        <iframe
                          src={voicePreviewSrc}
                          className="w-full border-0"
                          style={{ height: 80 }}
                          allow="autoplay"
                          title="voice player"
                        />
                      ) : (
                        <div className="px-4 py-3 text-xs text-violet-500 italic">Không thể phát trực tiếp</div>
                      )}
                    </div>
                  )}

                  {/* File */}
                  {c.file_content_url && (
                    <div className="flex items-center gap-2">
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
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <div>
              {canPushToGlobal && (
                <button
                  onClick={() => { onPush(); onClose() }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" /> Đẩy ra kho tổng
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canRemove && (
                <button
                  onClick={() => { onRemove(); onClose() }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa khỏi kho
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
