'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Mic, X, Play, Pause, FileText, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, DarkTextarea, CustomSelect, CreatableSelect } from '@/components/task-auto/DarkInput'
import {
  createContent, updateContent, createEditorContent, updateTeamContent,
  getContentLines, uploadVoiceFile, uploadContentFile,
  getContentClassifications, createContentClassification,
} from '@/lib/api/task-auto'
import type { Content } from '@/types/task-auto'

// ── Helpers ───────────────────────────────────────────────────────────────────

export const MARKETS = [
  { value: 'VIETNAM',   label: 'Việt Nam',   activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-400' },
  { value: 'INDONESIA', label: 'Indonesia',  activeClass: 'bg-amber-50 text-amber-700 border-amber-400' },
  { value: 'JAPAN',     label: 'Nhật Bản',  activeClass: 'bg-rose-50 text-rose-700 border-rose-400' },
  { value: 'THAILAND',  label: 'Thái Lan',   activeClass: 'bg-sky-50 text-sky-700 border-sky-400' },
]

export const MARKET_LABEL: Record<string, string> = Object.fromEntries(MARKETS.map(m => [m.value, m.label]))

export function parseMarkets(market: string | null | undefined): string[] {
  if (!market) return ['VIETNAM']
  return market.split(',').map(m => m.trim()).filter(Boolean)
}

// ── MarketPicker (single-select) ──────────────────────────────────────────────

export function MarketPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  return (
    <div>
      {label && <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>}
      <div className="flex gap-2">
        {MARKETS.map(m => {
          const active = value === m.value
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                active
                  ? m.activeClass
                  : 'bg-gray-50 text-slate-400 border-gray-200 hover:border-gray-300 hover:text-slate-600'
              )}
            >
              <span>{m.label}</span>
              {active && (
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── VoicePicker ───────────────────────────────────────────────────────────────
//
// File chọn từ máy chỉ được xem trước cục bộ (blob URL) — việc tải lên server
// bị hoãn tới khi form cha gọi `resolvePending()` (lúc bấm "Thêm mới"/"Lưu thay
// đổi"), để tránh rác file trên server khi người dùng chọn rồi huỷ form.

export interface VoicePickerHandle {
  resolvePending: (url: string) => Promise<string>
}

export const VoicePicker = forwardRef<VoicePickerHandle, { value: string; onChange: (url: string) => void }>(
  function VoicePicker({ value, onChange }, ref) {
    const fileRef = useRef<HTMLInputElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const [playing, setPlaying] = useState(false)

    const pendingFile = useRef<File | null>(null)
    const pendingBlobUrl = useRef<string | null>(null)
    const resolvedCache = useRef<Map<string, string>>(new Map())

    useEffect(() => () => {
      if (pendingBlobUrl.current) URL.revokeObjectURL(pendingBlobUrl.current)
    }, [])

    const clearPending = () => {
      if (pendingBlobUrl.current) URL.revokeObjectURL(pendingBlobUrl.current)
      pendingBlobUrl.current = null
      pendingFile.current = null
    }

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (fileRef.current) fileRef.current.value = ''
      if (!file) return
      if (!/^audio\//.test(file.type)) return toast.error('Chỉ chấp nhận file âm thanh')
      if (file.size > 50 * 1024 * 1024) return toast.error('File voice tối đa 50MB')
      clearPending()
      const blobUrl = URL.createObjectURL(file)
      pendingFile.current = file
      pendingBlobUrl.current = blobUrl
      onChange(blobUrl)
      setPlaying(false)
    }

    const togglePlay = () => {
      if (!audioRef.current) return
      if (playing) { audioRef.current.pause(); setPlaying(false) }
      else { audioRef.current.play(); setPlaying(true) }
    }

    useImperativeHandle(ref, () => ({
      resolvePending: async (url: string) => {
        if (!url) return url
        const cached = resolvedCache.current.get(url)
        if (cached) return cached
        if (pendingBlobUrl.current === url && pendingFile.current) {
          const { url: uploaded } = await uploadVoiceFile(pendingFile.current)
          resolvedCache.current.set(url, uploaded)
          return uploaded
        }
        return url
      },
    }), [])

    const isPending = pendingBlobUrl.current === value
    const filename = isPending && pendingFile.current
      ? pendingFile.current.name
      : (value ? value.split('/').pop() : '')

    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">File Voice</label>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
        {value ? (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-700 truncate">
                {filename}
                {isPending && (
                  <span className="ml-1.5 text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full align-middle">Chưa lưu</span>
                )}
              </p>
              <audio ref={audioRef} src={value} onEnded={() => setPlaying(false)} className="hidden" />
            </div>
            <button
              type="button"
              onClick={() => { clearPending(); onChange(''); setPlaying(false) }}
              className="flex-shrink-0 p-1 rounded-full hover:bg-indigo-200 text-indigo-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-shrink-0 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              Đổi file
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl py-4 text-sm text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Mic className="w-4 h-4" />
            <span>
              Chọn file âm thanh{' '}
              <span className="text-slate-300">(mp3, wav, ogg — tối đa 50MB)</span>
            </span>
          </button>
        )}
      </div>
    )
  }
)

// ── ContentFilePicker ─────────────────────────────────────────────────────────

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

export function ContentFilePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [mode, setMode] = useState<'url' | 'file'>('url')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!CONTENT_MIME.includes(file.type)) return toast.error('Chỉ chấp nhận PDF, Word, Excel, PowerPoint, TXT')
    if (file.size > 100 * 1024 * 1024) return toast.error('File tối đa 100MB')
    setUploading(true)
    try {
      const { url } = await uploadContentFile(file)
      onChange(url)
    } catch {
      toast.error('Không thể tải file lên')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filename = value ? decodeURIComponent(value.split('/').pop() ?? '') : ''
  const isUploaded = value && !value.startsWith('http') === false && mode === 'file'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-700">File content</label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={cn('px-3 py-1.5 transition-colors', mode === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-gray-50')}
          >
            Link URL
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={cn('px-3 py-1.5 transition-colors', mode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-gray-50')}
          >
            Tải file lên
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          placeholder="https://drive.google.com/..."
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      ) : (
        <>
          <input ref={fileRef} type="file" accept={CONTENT_ACCEPT} className="hidden" onChange={handleFile} />
          {value && mode === 'file' ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-700 truncate">{filename || 'File đã tải lên'}</p>
                <a href={value} target="_blank" rel="noreferrer" className="text-xs text-emerald-500 hover:underline">Xem file</a>
              </div>
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1 rounded-full hover:bg-emerald-200 text-emerald-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
              >
                Đổi file
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => !uploading && fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl py-4 text-sm text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span className="text-indigo-600">Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Chọn file <span className="text-slate-300">(PDF, Word, Excel, PPT — tối đa 100MB)</span></span>
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── ContentFormModal ──────────────────────────────────────────────────────────

type BrandType = 'DO_DA' | 'TRANG_SUC'

interface ContentFormModalProps {
  open: boolean
  editing?: Content | null
  onClose: () => void
  onSuccess: (content: Content) => void
  userId?: string
  /** Khi sửa content thuộc kho team (TeamContent), cần teamId để PATCH đúng endpoint team thay vì kho tổng */
  teamId?: string
  brandType?: BrandType
  initialMarket?: string
}

export function ContentFormModal({ open, editing, onClose, onSuccess, userId, teamId, brandType, initialMarket }: ContentFormModalProps) {
  const qc = useQueryClient()
  const isEdit = !!editing

  const [form, setForm] = useState<Partial<Content>>({
    title: '', body: '', script: '', file_content_url: '', voice_url: '',
    content_line_id: '', classification_id: '',
  })
  const [market, setMarket] = useState<string>(initialMarket ?? 'VIETNAM')
  const [resolvingVoice, setResolvingVoice] = useState(false)
  const voicePickerRef = useRef<VoicePickerHandle>(null)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...editing })
        setMarket(editing.market ?? initialMarket ?? 'VIETNAM')
      } else {
        setForm({ title: '', body: '', script: '', file_content_url: '', voice_url: '', content_line_id: '', classification_id: '' })
        setMarket(initialMarket ?? 'VIETNAM')
      }
    }
  }, [open, editing, initialMarket])

  const { data: contentLines } = useQuery({
    queryKey: ['task-auto', 'content-lines'],
    queryFn: getContentLines,
    enabled: open,
  })
  const { data: contentClassifications } = useQuery({
    queryKey: ['task-auto', 'content-classifications'],
    queryFn: getContentClassifications,
    enabled: open,
  })

  const createMut = useMutation({
    mutationFn: createContent,
    onSuccess: async (content) => {
      await qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] })
      toast.success('Đã thêm content')
      onSuccess(content)
    },
    onError: () => toast.error('Không thể thêm content'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Content> }) =>
      (teamId ? updateTeamContent(teamId, id, body) : updateContent(id, body)) as Promise<Content>,
    onSuccess: async (content) => {
      await qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] })
      if (teamId) await qc.invalidateQueries({ queryKey: ['task-auto', 'team-contents'] })
      toast.success('Đã cập nhật content')
      onSuccess(content)
    },
    onError: () => toast.error('Không thể cập nhật content'),
  })

  const saving = createMut.isPending || updateMut.isPending || resolvingVoice

  const handleSubmit = async () => {
    setResolvingVoice(true)
    let voice_url: string
    try {
      voice_url = await voicePickerRef.current!.resolvePending(form.voice_url ?? '')
    } catch {
      toast.error('Không thể tải file voice lên')
      setResolvingVoice(false)
      return
    }
    setResolvingVoice(false)

    const sharedBody = {
      title: form.title,
      body: form.body,
      script: form.script,
      file_content_url: form.file_content_url,
      voice_url,
      content_line_id: form.content_line_id || null,
      classification_id: form.classification_id || null,
      market,
    }
    if (!isEdit) {
      const body = { ...sharedBody, brand_type: brandType ?? 'DO_DA' }
      if (userId) {
        createEditorContent(userId, body as any)
          .then(content => { qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] }); toast.success('Đã thêm content'); onSuccess(content) })
          .catch(() => toast.error('Không thể thêm content'))
      } else {
        createMut.mutate(body as any)
      }
    } else {
      updateMut.mutate({ id: editing!.id, body: { ...sharedBody, status: form.status } })
    }
  }

  return (
    <DarkModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa content' : 'Thêm content mới'}
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </button>
        </>
      }
    >
      <div className="space-y-6">

        {/* ── Thông tin chính ── */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Thông tin chính
          </p>
          <DarkInput
            label="Tiêu đề content"
            placeholder="Nhập tiêu đề..."
            value={form.title ?? ''}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="Tuyến nội dung"
              value={form.content_line_id ?? ''}
              onChange={v => setForm(f => ({ ...f, content_line_id: v }))}
              options={[
                { value: '', label: '-- Không chọn --' },
                ...(contentLines?.map(l => ({ value: l.id, label: l.name })) ?? []),
              ]}
              searchable
            />
            <CreatableSelect
              label="Phân loại nội dung"
              value={form.classification_id ?? ''}
              onChange={v => setForm(f => ({ ...f, classification_id: v }))}
              options={contentClassifications?.map(c => ({ value: c.id, label: c.name })) ?? []}
              createLabel="Thêm phân loại nội dung"
              onCreate={async (name) => {
                const created = await createContentClassification(name)
                qc.setQueryData<typeof contentClassifications>(['task-auto', 'content-classifications'], old => [...(old ?? []), created])
                return { id: created.id, label: created.name }
              }}
            />
          </div>

          <MarketPicker label="Thị trường" value={market} onChange={setMarket} />
        </div>

        {/* ── Nội dung văn bản ── */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            Nội dung văn bản
          </p>
          <DarkTextarea
            label="Nội dung / Script"
            rows={4}
            placeholder="Nhập nội dung hoặc kịch bản..."
            value={form.body ?? ''}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          />
          <ContentFilePicker
            value={form.file_content_url ?? ''}
            onChange={url => setForm(f => ({ ...f, file_content_url: url }))}
          />
        </div>

        {/* ── File đính kèm ── */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            File đính kèm
          </p>
          <VoicePicker
            ref={voicePickerRef}
            value={form.voice_url ?? ''}
            onChange={url => setForm(f => ({ ...f, voice_url: url }))}
          />
        </div>

      </div>
    </DarkModal>
  )
}
