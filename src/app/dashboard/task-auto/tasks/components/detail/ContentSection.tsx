'use client'

import { useState } from 'react'
import { FileText, Link2, Mic, Download, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, drivePreviewUrl } from '@/lib/utils'
import { ServerSearchSelect } from '@/components/task-auto/DarkInput'
import { Section } from './Section'

interface EditContentProps {
  contentId: string
  onChange: (id: string) => void
  items: { value: string; label: string; sublabel?: string }[]
  searchValue: string
  onSearchChange: (v: string) => void
  loading: boolean
  currentContentTitle?: string | null
  currentContentId?: string | null
}

interface ViewContentProps {
  contentTitle?: string | null
  contentMarket?: string | null
  contentLine?: string | null
  scriptText?: string | null
  fileUrl?: string | null
  voiceUrl?: string | null
}

interface Props {
  editMode: boolean
  edit: EditContentProps
  view: ViewContentProps
}

export function ContentSection({ editMode, edit, view }: Props) {
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [filePreviewOpen, setFilePreviewOpen] = useState(false)

  return (
    <Section icon={<FileText className="w-4 h-4" />} title="Nội dung" bgColor="bg-indigo-50" iconColor="text-indigo-600">
      {editMode ? (
        <div className="p-4">
          <ServerSearchSelect
            label="Script / Content"
            value={edit.contentId}
            onChange={edit.onChange}
            items={edit.items}
            searchValue={edit.searchValue}
            onSearchChange={edit.onSearchChange}
            loading={edit.loading}
            placeholder="Tìm content..."
            clearLabel="-- Không chọn --"
            searchPlaceholder="Tìm theo tiêu đề..."
          />
          {edit.contentId && edit.contentId === edit.currentContentId && edit.currentContentTitle && (
            <p className="mt-2 text-xs text-slate-400 pl-1">
              Hiện tại: <span className="font-medium text-slate-600">{edit.currentContentTitle}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div>
            <p className="text-base font-bold text-gray-900 leading-snug">
              {view.contentTitle || <span className="text-gray-400 font-normal italic">Chưa có tiêu đề</span>}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {view.contentMarket && (
                <span className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                  view.contentMarket === 'VIETNAM' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
                )}>
                  {view.contentMarket}
                </span>
              )}
              {view.contentLine && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {view.contentLine}
                </span>
              )}
            </div>
          </div>

          {view.scriptText && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Script / Nội dung</p>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{view.scriptText}</p>
              </div>
            </div>
          )}

          {(view.fileUrl || view.voiceUrl) && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {view.fileUrl && (
                  <button
                    onClick={() => setFilePreviewOpen(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-lg transition-colors">
                    <Link2 className="w-3.5 h-3.5 text-indigo-500" /> Xem File Content
                  </button>
                )}
                {view.voiceUrl && (
                  <>
                    <button
                      onClick={() => setVoiceOpen(v => !v)}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-sm font-medium border px-3.5 py-2 rounded-lg transition-colors',
                        voiceOpen
                          ? 'bg-purple-50 border-purple-200 text-purple-700'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                      )}>
                      <Mic className="w-3.5 h-3.5 text-purple-500" />
                      {voiceOpen ? 'Đóng player' : 'Nghe voice'}
                      {voiceOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <a href={view.voiceUrl} download
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5 text-gray-500" /> Tải voice
                    </a>
                  </>
                )}
              </div>

              {voiceOpen && view.voiceUrl && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Voice Preview</p>
                  <iframe
                    src={drivePreviewUrl(view.voiceUrl) ?? view.voiceUrl}
                    className="w-full rounded-lg border-0 items-center"
                    style={{ height: '60px' }}
                    allow="autoplay"
                    title="Voice Preview"
                  />
                </div>
              )}
            </div>
          )}

          {filePreviewOpen && view.fileUrl && (
            <div className="fixed inset-0 z-[1010] flex flex-col bg-black/80" onClick={() => setFilePreviewOpen(false)}>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-900 shrink-0" onClick={e => e.stopPropagation()}>
                <p className="text-sm font-semibold text-white truncate">File Content Preview</p>
                <div className="flex items-center gap-2">
                  <a href={view.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button type="button" onClick={() => setFilePreviewOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                <iframe
                  src={drivePreviewUrl(view.fileUrl) ?? view.fileUrl}
                  className="w-full h-full border-0"
                  title="File Content Preview"
                  allow="autoplay"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}
