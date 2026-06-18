'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Mic, X, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput, DarkTextarea, CustomSelect } from '@/components/task-auto/DarkInput'
import {
  createContent, updateContent,
  getContentLines, uploadVoiceFile,
} from '@/lib/api/task-auto'
import type { Content } from '@/types/task-auto'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MARKETS = [
  { value: 'VIETNAM', label: 'Vietnam', activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-400' },
  { value: 'GLOBAL',  label: 'Global',  activeClass: 'bg-blue-50 text-blue-700 border-blue-400' },
]

export function parseMarkets(market: string | null | undefined): string[] {
  if (!market) return ['VIETNAM']
  return market.split(',').map(m => m.trim()).filter(Boolean)
}

// ── MarketPicker ──────────────────────────────────────────────────────────────

export function MarketPicker({
  value,
  onChange,
  label,
}: {
  value: string[]
  onChange: (v: string[]) => void
  label?: string
}) {
  const toggle = (m: string) =>
    onChange(value.includes(m) ? value.filter(x => x !== m) : [...value, m])

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>}
      <div className="flex gap-2">
        {MARKETS.map(m => {
          const active = value.includes(m.value)
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => toggle(m.value)}
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
      {value.length === 0 && (
        <p className="text-xs text-amber-600 mt-1.5">Chọn ít nhất một thị trường</p>
      )}
    </div>
  )
}

// ── VoicePicker ───────────────────────────────────────────────────────────────

export function VoicePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [uploading, setUploading] = useState(false)
  const [playing, setPlaying] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^audio\//.test(file.type)) return toast.error('Chỉ chấp nhận file âm thanh')
    if (file.size > 50 * 1024 * 1024) return toast.error('File voice tối đa 50MB')
    setUploading(true)
    try {
      const { url } = await uploadVoiceFile(file)
      onChange(url)
      setPlaying(false)
    } catch {
      toast.error('Không thể tải file voice lên')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  const filename = value ? value.split('/').pop() : ''

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
            <p className="text-sm font-medium text-indigo-700 truncate">{filename}</p>
            <audio ref={audioRef} src={value} onEnded={() => setPlaying(false)} className="hidden" />
          </div>
          <button
            type="button"
            onClick={() => { onChange(''); setPlaying(false) }}
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
              <Mic className="w-4 h-4" />
              <span>
                Chọn file âm thanh{' '}
                <span className="text-slate-300">(mp3, wav, ogg — tối đa 50MB)</span>
              </span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ── ContentFormModal ──────────────────────────────────────────────────────────

interface ContentFormModalProps {
  open: boolean
  /** Khi truyền vào: edit mode. Khi null/undefined: create mode. */
  editing?: Content | null
  onClose: () => void
  /** Được gọi sau khi tạo/cập nhật thành công, trước khi onClose. */
  onSuccess: (content: Content) => void
}

export function ContentFormModal({ open, editing, onClose, onSuccess }: ContentFormModalProps) {
  const qc = useQueryClient()
  const isEdit = !!editing

  const [form, setForm] = useState<Partial<Content>>({
    title: '', body: '', script: '', file_content_url: '', voice_url: '',
    content_line_id: '',
  })
  const [markets, setMarkets] = useState<string[]>(['VIETNAM'])

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...editing })
        setMarkets(parseMarkets(editing.market))
      } else {
        setForm({ title: '', body: '', script: '', file_content_url: '', voice_url: '', content_line_id: '' })
        setMarkets(['VIETNAM'])
      }
    }
  }, [open, editing])

  const { data: contentLines } = useQuery({
    queryKey: ['task-auto', 'content-lines'],
    queryFn: getContentLines,
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
    mutationFn: ({ id, body }: { id: string; body: Partial<Content> }) => updateContent(id, body),
    onSuccess: async (content) => {
      await qc.invalidateQueries({ queryKey: ['task-auto', 'contents'] })
      toast.success('Đã cập nhật content')
      onSuccess(content)
    },
    onError: () => toast.error('Không thể cập nhật content'),
  })

  const saving = createMut.isPending || updateMut.isPending

  const handleSubmit = () => {
    if (markets.length === 0) return toast.error('Chọn ít nhất một thị trường')
    const sharedBody = {
      title: form.title,
      body: form.body,
      script: form.script,
      file_content_url: form.file_content_url,
      voice_url: form.voice_url,
      content_line_id: form.content_line_id || null,
      market: markets.join(','),
    }
    if (!isEdit) {
      createMut.mutate({ ...sharedBody } as any)
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
            disabled={saving || markets.length === 0}
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
            <MarketPicker label="Thị trường" value={markets} onChange={setMarkets} />
          </div>
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
          <DarkInput
            label="URL file content"
            placeholder="https://drive.google.com/..."
            value={form.file_content_url ?? ''}
            onChange={e => setForm(f => ({ ...f, file_content_url: e.target.value }))}
          />
        </div>

        {/* ── File đính kèm ── */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-gray-100">
            File đính kèm
          </p>
          <VoicePicker
            value={form.voice_url ?? ''}
            onChange={url => setForm(f => ({ ...f, voice_url: url }))}
          />
        </div>

      </div>
    </DarkModal>
  )
}
