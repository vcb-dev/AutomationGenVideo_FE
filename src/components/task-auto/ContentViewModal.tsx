'use client'

import { useState } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import {
  FileText, X, Trash2, Mic, AlignLeft, Clapperboard,
  ExternalLink, Edit2, SendHorizontal, Globe,
  User, Calendar, Tag,
} from 'lucide-react'
import { cn, drivePreviewUrl } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_TASK:   'Đang dùng',
  USED:      'Đã dùng',
  ARCHIVED:  'Lưu trữ',
}
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  IN_TASK:   'bg-blue-100 text-blue-700',
  USED:      'bg-gray-100 text-slate-500',
  ARCHIVED:  'bg-amber-100 text-amber-600',
}
const MARKET_LABEL: Record<string, string> = { VIETNAM: 'Việt Nam', INDONESIA: 'Indonesia', JAPAN: 'Nhật Bản', THAILAND: 'Thái Lan' }
const MARKET_COLOR: Record<string, string> = {
  VIETNAM:   'bg-emerald-100 text-emerald-700',
  INDONESIA: 'bg-amber-100 text-amber-700',
  JAPAN:     'bg-rose-100 text-rose-700',
  THAILAND:  'bg-sky-100 text-sky-700',
}
const CATALOG_LABELS: Record<string, string> = {
  global: 'Kho tổng',
  team:   'Kho team',
  editor: 'Kho cá nhân',
}
const CATALOG_COLORS: Record<string, string> = {
  global: 'bg-violet-50 text-violet-600',
  team:   'bg-blue-50 text-blue-600',
  editor: 'bg-indigo-50 text-indigo-600',
}

export interface ContentViewItem {
  id: string
  title?: string | null
  brand_type?: string | null
  market?: string | null
  status?: string | null
  body?: string | null
  script?: string | null
  voice_url?: string | null
  file_content_url?: string | null
  content_line?: { name: string } | null
  classification?: { name: string } | null
  added_by?: { full_name: string } | null
  added_at?: string
  created_at?: string
  source_editor_content_id?: string | null
  source_editor_content?: {
    title?: string | null; body?: string | null; script?: string | null
    voice_url?: string | null; file_content_url?: string | null
    market?: string | null; status?: string | null
    content_line?: { name: string } | null
    classification?: { name: string } | null
  } | null
  source_team_content_id?: string | null
  source_team_content?: {
    title?: string | null; body?: string | null; script?: string | null
    voice_url?: string | null; file_content_url?: string | null
    market?: string | null; status?: string | null
    content_line?: { name: string } | null
    classification?: { name: string } | null
    source_editor_content?: {
      title?: string | null; body?: string | null; script?: string | null
      voice_url?: string | null; file_content_url?: string | null
      market?: string | null; status?: string | null
      content_line?: { name: string } | null
      classification?: { name: string } | null
    } | null
  } | null
}

interface Props {
  item: ContentViewItem
  open: boolean
  catalogType: 'global' | 'team' | 'editor'
  canEdit?: boolean
  canDelete?: boolean
  canPushToTeam?: boolean
  canPushToGlobal?: boolean
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPushToTeam?: () => void
  onPushToGlobal?: () => void
}

export function ContentViewModal({
  item, open, catalogType,
  canEdit, canDelete, canPushToTeam, canPushToGlobal,
  onClose, onEdit, onDelete, onPushToTeam, onPushToGlobal,
}: Props) {
  useScrollLock()
  const [fileOpen, setFileOpen] = useState(false)

  // Resolve FK-reference fields: own → source_editor_content (team FK) → source_team_content → source_team_content.source_editor_content (global FK)
  const ec = item.source_editor_content
  const tc = item.source_team_content
  const tc_ec = tc?.source_editor_content
  const itemTitle = item.title ?? ec?.title ?? tc?.title ?? tc_ec?.title ?? null
  const itemMarket = item.market ?? ec?.market ?? tc?.market ?? tc_ec?.market ?? null
  const itemStatus = item.status ?? ec?.status ?? tc?.status ?? tc_ec?.status ?? null
  const itemBody = item.body ?? ec?.body ?? tc?.body ?? tc_ec?.body ?? null
  const itemScript = item.script ?? ec?.script ?? tc?.script ?? tc_ec?.script ?? null
  const itemVoiceUrl = item.voice_url ?? ec?.voice_url ?? tc?.voice_url ?? tc_ec?.voice_url ?? null
  const itemFileContentUrl = item.file_content_url ?? ec?.file_content_url ?? tc?.file_content_url ?? tc_ec?.file_content_url ?? null
  const itemContentLine = item.content_line ?? ec?.content_line ?? tc?.content_line ?? tc_ec?.content_line ?? null
  const itemClassification = item.classification ?? ec?.classification ?? tc?.classification ?? tc_ec?.classification ?? null

  const markets = (itemMarket ?? '').split(',').map(m => m.trim()).filter(Boolean)
  const voicePreviewSrc = drivePreviewUrl(itemVoiceUrl)
  const fileSrc = drivePreviewUrl(itemFileContentUrl)
  const dateStr = item.added_at ?? item.created_at

  if (!open) return null

  return (
    <>
      {/* File iframe overlay */}
      {fileOpen && fileSrc && (
        <div className="fixed inset-0 z-[1010] bg-black/80 flex flex-col" onClick={() => setFileOpen(false)}>
          <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-white font-semibold truncate">{item.title}</span>
            <button onClick={() => setFileOpen(false)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 px-6 pb-6" onClick={e => e.stopPropagation()}>
            <iframe src={fileSrc} className="w-full h-full rounded-2xl border-0 bg-white" allow="autoplay" />
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden ring-1 ring-black/8"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="px-8 pt-7 pb-5 border-b border-gray-100 shrink-0">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                {/* Title + status */}
                <div className="flex items-center gap-2.5 flex-wrap mb-2">
                  <h2 className="font-bold text-slate-900 text-xl leading-snug">
                    {itemTitle || <span className="text-slate-400 italic font-normal text-lg">Chưa đặt tên</span>}
                  </h2>
                  {itemStatus && (
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold shrink-0', STATUS_COLORS[itemStatus] ?? 'bg-slate-100 text-slate-500')}>
                      {STATUS_LABELS[itemStatus] ?? itemStatus}
                    </span>
                  )}
                  {item.source_editor_content_id && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600">
                      Từ kho cá nhân
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  {item.added_by && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.added_by.full_name}</span>
                    </div>
                  )}
                  {dateStr && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{new Date(dateStr).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                  {item.brand_type && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.brand_type === 'DO_DA' ? 'Đồ da' : 'Trang sức'}</span>
                    </div>
                  )}
                  {markets.map(m => (
                    <span key={m} className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', MARKET_COLOR[m] ?? 'bg-gray-100 text-gray-600')}>
                      {MARKET_LABEL[m] ?? m}
                    </span>
                  ))}
                  {itemContentLine && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-violet-100 text-violet-700">
                      {itemContentLine.name}
                    </span>
                  )}
                  {itemClassification && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-fuchsia-100 text-fuchsia-700">
                      {itemClassification.name}
                    </span>
                  )}
                  <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', CATALOG_COLORS[catalogType])}>
                    {CATALOG_LABELS[catalogType]}
                  </span>
                </div>
              </div>

              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100 transition-colors shrink-0 mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {itemBody && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlignLeft className="w-4 h-4 text-slate-400" />
                  <p className="text-base font-semibold text-slate-700">Nội dung</p>
                </div>
                <div className="bg-gray-50 rounded-2xl px-5 py-4 text-base text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed border border-gray-100">
                  {itemBody}
                </div>
              </div>
            )}

            {itemScript && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clapperboard className="w-4 h-4 text-slate-400" />
                  <p className="text-base font-semibold text-slate-700">Script</p>
                </div>
                <div className="bg-gray-50 rounded-2xl px-5 py-4 text-base text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed border border-gray-100">
                  {itemScript}
                </div>
              </div>
            )}

            {(itemVoiceUrl || itemFileContentUrl) && (
              <div>
                <p className="text-base font-semibold text-slate-700 mb-3">Tệp đính kèm</p>
                <div className="space-y-3">
                  {itemVoiceUrl && (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 overflow-hidden">
                      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-violet-100">
                        <Mic className="w-4 h-4 text-violet-500 shrink-0" />
                        <span className="text-sm font-semibold text-violet-700">Voice</span>
                        <a href={itemVoiceUrl} target="_blank" rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700">
                          <ExternalLink className="w-3.5 h-3.5" /> Mở link
                        </a>
                      </div>
                      {voicePreviewSrc ? (
                        <iframe src={voicePreviewSrc} className="w-full border-0" style={{ height: 100 }} allow="autoplay" title="voice player" />
                      ) : (
                        <div className="px-5 py-4 text-sm text-violet-500 italic">Không thể phát trực tiếp</div>
                      )}
                    </div>
                  )}
                  {itemFileContentUrl && (
                    <div className="flex items-center gap-3">
                      {fileSrc && (
                        <button onClick={() => setFileOpen(true)}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors">
                          <FileText className="w-4 h-4" /> Xem file
                        </button>
                      )}
                      <a href={itemFileContentUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-slate-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
                        <ExternalLink className="w-4 h-4" /> Mở link gốc
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex gap-2">
              {canPushToTeam && onPushToTeam && (
                <button onClick={() => { onPushToTeam(); onClose() }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                  <SendHorizontal className="w-4 h-4" /> Đẩy sang team
                </button>
              )}
              {canPushToGlobal && onPushToGlobal && (
                <button onClick={() => { onPushToGlobal(); onClose() }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 rounded-xl transition-colors">
                  <Globe className="w-4 h-4" /> Đẩy kho tổng
                </button>
              )}
              {canDelete && onDelete && (
                <button onClick={() => { onDelete(); onClose() }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-gray-100 rounded-xl transition-colors">
                Đóng
              </button>
              {canEdit && onEdit && (
                <button onClick={() => { onEdit(); onClose() }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
                  <Edit2 className="w-4 h-4" /> Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
