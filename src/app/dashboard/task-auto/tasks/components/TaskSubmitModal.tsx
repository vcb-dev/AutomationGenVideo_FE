'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Film, CheckCircle2, Loader2, Link, ChevronDown, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput } from '@/components/task-auto/DarkInput'
import { apiClient } from '@/lib/api-client'
import { Task } from '@/types/task-auto'
import { submitTask, updateTask } from '@/lib/api/task-auto'

interface Props {
  task: Task
  isResubmit?: boolean
  onClose: () => void
  onSuccess: () => void
}

const CHUNK_SIZE = 8 * 1024 * 1024 // 8 MB
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function uploadVideoToServer(
  taskId: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ url: string; filename: string; originalname: string; mimetype: string; size: number; storage: string }> {
  // 1. Init — backend tạo upload session cục bộ
  const { uploadId, chunkSize, totalChunks } = await apiClient
    .post<{ uploadId: string; chunkSize: number; totalChunks: number }>(
      `/task-auto/tasks/${taskId}/upload-video/init`,
      { filename: file.name, mimetype: file.type || 'video/mp4', totalSize: file.size },
    )
    .then(r => r.data)

  const effectiveChunkSize = chunkSize || CHUNK_SIZE

  // 2. Gửi từng chunk — dùng fetch để browser tự set Content-Type multipart/form-data + boundary
  for (let i = 0; i < totalChunks; i++) {
    const start = i * effectiveChunkSize
    const blob = file.slice(start, Math.min(start + effectiveChunkSize, file.size))

    const formData = new FormData()
    formData.append('uploadId', uploadId)
    formData.append('chunkIndex', String(i))
    formData.append('chunk', blob, file.name)

    const res = await fetch(`${API_BASE}/task-auto/tasks/${taskId}/upload-video/chunk`, {
      method: 'POST',
      headers: authHeaders(), // NO Content-Type — browser sets multipart boundary automatically
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as any).message || `Chunk ${i} upload thất bại`)
    }
    onProgress(Math.round(((i + 1) / totalChunks) * 90))
  }

  // 3. Finish — server ghép chunks, đăng ký video tạm
  onProgress(95)
  const result = await apiClient
    .post<{ url: string; filename: string; originalname: string; mimetype: string; size: number; storage: string }>(
      `/task-auto/tasks/${taskId}/upload-video/finish`,
      { uploadId },
      { timeout: 300_000 }, // 5 phút — ghép 2GB cần thời gian
    )
    .then(r => r.data)

  onProgress(100)
  return result
}

export function SubmitModal({ task, isResubmit = false, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile]           = useState<File | null>(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadedVideo, setUploadedVideo] = useState<{ url: string; filename: string; originalname: string; mimetype: string; size: number; storage: string } | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualUrl, setManualUrl]   = useState(task.result_url?.startsWith('/task-auto/') ? '' : (task.result_url || ''))

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setUploadedVideo(null)
    setManualUrl('')
    setUploading(true)
    setUploadPct(0)
    try {
      const result = await uploadVideoToServer(task.id, f, pct => setUploadPct(pct))
      setUploadedVideo(result)
      toast.success('Upload video thành công!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Upload thất bại')
      setFile(null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const submitMut = useMutation({
    mutationFn: async () => {
      if (isResubmit) await updateTask(task.id, { status: 'IN_PROGRESS' })
      // Video is already registered on the server via upload/finish.
      // Pass result_url only for manual link; otherwise it's already set by the upload.
      await submitTask(task.id, manualUrl || undefined)
    },
    onSuccess: () => {
      toast.success(isResubmit ? 'Đã nộp lại task thành công!' : 'Đã nộp task thành công!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', task.id] })
      onSuccess()
    },
    onError: () => toast.error('Nộp task thất bại'),
  })

  const canSubmit = !uploading && !submitMut.isPending

  const handleRemoveVideo = () => {
    setFile(null)
    setUploadedVideo(null)
    setUploadPct(0)
  }

  return (
    <DarkModal
      open
      onClose={onClose}
      title={isResubmit ? 'Nộp lại task' : 'Nộp task'}
      subtitle={`Task: ${task.content?.title || task.id}`}
      size="sm"
      footer={
        <>
          <button onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors">
            Huỷ
          </button>
          <button
            onClick={() => submitMut.mutate()}
            disabled={!canSubmit}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            {submitMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitMut.isPending ? 'Đang nộp...' : isResubmit ? 'Nộp lại' : 'Nộp task'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Reject reason */}
        {isResubmit && task.reject_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">Lý do từ chối</p>
            <p className="text-sm text-red-700">{task.reject_reason}</p>
          </div>
        )}

        {/* Info: video upload thẳng lên Drive */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 flex gap-2 items-start">
          <span className="text-blue-500 mt-0.5 text-sm">ℹ</span>
          <p className="text-xs text-blue-700 leading-relaxed">
            Video sẽ được <strong>upload lên Google Drive ngay khi nộp</strong>. Nếu task bị từ chối, video sẽ bị xóa khỏi Drive và bạn cần upload lại khi nộp lại.
          </p>
        </div>

        {/* Video upload area */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Video kết quả
          </p>

          <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={handleFileChange} />

          {/* Idle — no file */}
          {!file && !uploading && !uploadedVideo && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Chọn video từ máy</p>
                <p className="text-xs text-slate-400 mt-0.5">MP4 • Tối đa 2GB</p>
              </div>
            </button>
          )}

          {/* Uploading */}
          {uploading && file && (
            <div className="border border-gray-200 rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <Film className="w-5 h-5 text-indigo-500 shrink-0" />
                <span className="text-sm text-slate-700 font-medium truncate flex-1">{file.name}</span>
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
              </div>
              <div className="space-y-1">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 text-right">
                  {uploadPct < 100 ? `Đang tải lên... ${uploadPct}%` : 'Đang hoàn tất...'}
                </p>
              </div>
            </div>
          )}

          {/* Done */}
          {uploadedVideo && !uploading && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700 truncate">
                    {uploadedVideo.originalname}
                  </span>
                </div>
                <button
                  onClick={handleRemoveVideo}
                  className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-500 hover:text-emerald-700 transition-colors shrink-0"
                  title="Xoá và chọn lại"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {(uploadedVideo.size / 1024 / 1024).toFixed(1)} MB
                {' · '}
                <span className="text-emerald-600 font-medium">Đã lên Google Drive</span>
              </p>
            </div>
          )}
        </div>

        {/* Manual URL fallback */}
        <div>
          <button
            onClick={() => setShowManual(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold transition-colors',
              showManual ? 'text-slate-600' : 'text-slate-400 hover:text-slate-600',
            )}
          >
            <Link className="w-3.5 h-3.5" />
            Nhập link thủ công
            <ChevronDown className={cn('w-3 h-3 transition-transform', showManual && 'rotate-180')} />
          </button>
          {showManual && (
            <div className="mt-2">
              <DarkInput
                type="url"
                placeholder="https://..."
                value={manualUrl}
                onChange={e => { setManualUrl(e.target.value); setUploadedVideo(null) }}
              />
            </div>
          )}
        </div>
      </div>
    </DarkModal>
  )
}
