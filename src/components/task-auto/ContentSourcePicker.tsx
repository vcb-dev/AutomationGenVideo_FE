'use client'

import { useState, useRef, useId } from 'react'
import toast from 'react-hot-toast'
import { Loader2, X, FileText, Upload, AlignLeft, Link2, Video, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkInput, DarkTextarea, FieldError } from '@/components/task-auto/DarkInput'
import { uploadContentFile } from '@/lib/api/task-auto'

const CONTENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'
const CONTENT_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]

export type ContentSourceMode = 'text' | 'video' | 'link' | 'file'

export interface ContentSource {
  mode: ContentSourceMode
  video: string
  link: string
  file: string
}

export const EMPTY_CONTENT_SOURCE: ContentSource = { mode: 'text', video: '', link: '', file: '' }

const SOURCE_OPTIONS: { mode: ContentSourceMode; label: string; icon: React.ElementType }[] = [
  { mode: 'text', label: 'Văn bản', icon: AlignLeft },
  { mode: 'video', label: 'Link video', icon: Video },
  { mode: 'link', label: 'Link file', icon: Link2 },
  { mode: 'file', label: 'Tải file lên', icon: Upload },
]

const SOURCE_MISSING: Record<ContentSourceMode, string> = {
  text: 'Nhập nội dung văn bản',
  video: 'Dán link video của content',
  link: 'Dán link file content',
  file: 'Chọn file để tải lên',
}

const VIDEO_HOST = /(^|\.)(facebook\.com|fb\.watch|tiktok\.com|youtube\.com|youtu\.be|instagram\.com|threads\.net|douyin\.com|xiaohongshu\.com|xhslink\.com|rednote\.com|bilibili\.com)$/i

export function isVideoLink(url?: string | null): boolean {
  try {
    return !!url && VIDEO_HOST.test(new URL(url.trim()).hostname)
  } catch {
    return false
  }
}

const isHttpUrl = (url: string) => /^https?:\/\/\S+$/i.test(url.trim())

export function contentSourceFrom(body?: string | null, fileUrl?: string | null): ContentSource {
  const url = fileUrl?.trim() ?? ''
  const uploaded = url.includes('/task-auto/content-files/')
  const video = !uploaded && isVideoLink(url)
  const mode: ContentSourceMode = body?.trim() || !url ? 'text' : uploaded ? 'file' : video ? 'video' : 'link'
  return { mode, video: video ? url : '', link: uploaded || video ? '' : url, file: uploaded ? url : '' }
}

export function contentSourceFields(source: ContentSource, body: string, original?: { mode: ContentSourceMode; fileUrl?: string | null }) {
  if (source.mode === 'video') return { body: '', file_content_url: source.video.trim() }
  if (source.mode === 'link') return { body: '', file_content_url: source.link.trim() }
  if (source.mode === 'file') return { body: '', file_content_url: source.file }
  return { body, file_content_url: original?.mode === 'text' ? original.fileUrl ?? '' : '' }
}

export interface ContentRequiredErrors {
  title?: string
  line?: string
  classification?: string
  source?: string
}

export function contentRequiredErrors(v: {
  title?: string | null
  content_line_id?: string | null
  classification_id?: string | null
  body?: string | null
  source: ContentSource
}): ContentRequiredErrors {
  const errors: ContentRequiredErrors = {}
  if (!v.title?.trim()) errors.title = 'Nhập tiêu đề content'
  if (!v.content_line_id) errors.line = 'Chọn tuyến nội dung'
  if (!v.classification_id) errors.classification = 'Chọn phân loại nội dung'
  const { mode } = v.source
  const url = mode === 'video' ? v.source.video : mode === 'link' ? v.source.link : ''
  const filled = mode === 'text' ? !!v.body?.trim() : mode === 'file' ? !!v.source.file : !!url.trim()
  if (!filled) errors.source = SOURCE_MISSING[mode]
  else if (url && !isHttpUrl(url)) errors.source = 'Link phải bắt đầu bằng http:// hoặc https://'
  return errors
}

export function focusFirstInvalid(root: HTMLElement | null) {
  requestAnimationFrame(() => {
    const el = root?.querySelector<HTMLElement>('[aria-invalid="true"]')
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el?.focus({ preventScroll: true })
  })
}

export const REQUIRED_TOAST = 'Điền đủ các mục bắt buộc (*) trước khi lưu'

export function ContentSourcePicker({
  value,
  onChange,
  body,
  onBodyChange,
  textareaProps,
  headerAction,
  error,
  hideVideoLink,
}: {
  value: ContentSource
  onChange: (v: ContentSource) => void
  body: string
  onBodyChange: (body: string) => void
  textareaProps?: Omit<React.ComponentProps<typeof DarkTextarea>, 'value' | 'onChange' | 'label'>
  headerAction?: React.ReactNode
  error?: string | null
  hideVideoLink?: boolean
}) {
  const options = hideVideoLink ? SOURCE_OPTIONS.filter(o => o.mode !== 'video') : SOURCE_OPTIONS
  const id = useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const invalid = error ? true : undefined
  const describedBy = error ? errorId : undefined

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!CONTENT_MIME.includes(file.type)) return toast.error('Chỉ chấp nhận PDF, Word, Excel, PowerPoint, TXT')
    if (file.size > 100 * 1024 * 1024) return toast.error('File tối đa 100MB')
    setUploading(true)
    try {
      const { url } = await uploadContentFile(file)
      onChange({ ...value, file: url })
    } catch {
      toast.error('Không thể tải file lên')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filename = value.file ? decodeURIComponent(value.file.split('/').pop() ?? '') : ''

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p id={labelId} className="text-base font-semibold text-slate-700">Nội dung content *</p>
        {value.mode === 'text' && headerAction}
      </div>

      <div role="radiogroup" aria-labelledby={labelId} className={cn('grid gap-2', hideVideoLink ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>
        {options.map(o => {
          const active = value.mode === o.mode
          return (
            <label
              key={o.mode}
              className={cn(
                'flex items-center justify-center gap-2 min-h-[44px] px-2 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500 has-[:focus-visible]:ring-offset-1',
                active
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-slate-500 hover:border-gray-300 hover:text-slate-700',
              )}
            >
              <input
                type="radio"
                name={`${id}-mode`}
                value={o.mode}
                checked={active}
                onChange={() => onChange({ ...value, mode: o.mode })}
                className="sr-only"
              />
              <o.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{o.label}</span>
            </label>
          )
        })}
      </div>

      <div>
        {value.mode === 'text' && (
          <DarkTextarea
            rows={6}
            placeholder="Nhập nội dung hoặc kịch bản..."
            aria-labelledby={labelId}
            {...textareaProps}
            value={body}
            onChange={e => onBodyChange(e.target.value)}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={cn(error && 'border-red-400 focus:ring-red-400 focus:border-red-400', textareaProps?.className)}
          />
        )}

        {value.mode === 'video' && (
          <div className="space-y-1.5">
            <DarkInput
              type="url"
              inputMode="url"
              placeholder="Dán link video Facebook, TikTok, YouTube..."
              aria-labelledby={labelId}
              value={value.video}
              onChange={e => onChange({ ...value, video: e.target.value })}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={cn(error && 'border-red-400 focus:ring-red-400 focus:border-red-400')}
            />
            {isHttpUrl(value.video) && (
              <a
                href={value.video.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                Mở video để kiểm tra
              </a>
            )}
          </div>
        )}

        {value.mode === 'link' && (
          <DarkInput
            type="url"
            inputMode="url"
            placeholder="https://drive.google.com/..."
            aria-labelledby={labelId}
            value={value.link}
            onChange={e => onChange({ ...value, link: e.target.value })}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={cn(error && 'border-red-400 focus:ring-red-400 focus:border-red-400')}
          />
        )}

        {value.mode === 'file' && (
          <>
            <input ref={fileRef} type="file" accept={CONTENT_ACCEPT} className="hidden" onChange={handleFile} />
            {value.file ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-700 truncate">{filename || 'File đã tải lên'}</p>
                  <a href={value.file} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline">Xem file</a>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, file: '' })}
                  aria-label="Bỏ file đã tải lên"
                  className="p-1 rounded-full hover:bg-emerald-200 text-emerald-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  Đổi file
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => !uploading && fileRef.current?.click()}
                disabled={uploading}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className={cn(
                  'w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-4 text-sm transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                  error ? 'border-red-300 text-red-500 hover:border-red-400' : 'border-gray-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600',
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" aria-hidden="true" />
                    <span className="text-indigo-600">Đang tải lên...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    <span>Chọn file <span className="text-slate-400">(PDF, Word, Excel, PPT, TXT — tối đa 100MB)</span></span>
                  </>
                )}
              </button>
            )}
          </>
        )}
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    </div>
  )
}
