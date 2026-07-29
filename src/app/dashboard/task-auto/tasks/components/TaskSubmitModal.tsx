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
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-slate-400 hidden sm:block">
            {uploadedVideo ? '✓ Video đã sẵn sàng' : manualUrl ? '✓ Link đã nhập' : 'Chưa có video'}
          </p>
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Huỷ
            </button>
            <button
              onClick={() => submitMut.mutate()}
              disabled={!canSubmit}
              className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-200 hover:shadow-md"
            >
              {submitMut.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang nộp...</>
                : <><Upload className="w-4 h-4" />{isResubmit ? 'Nộp lại task' : 'Nộp task'}</>
              }
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Reject reason */}
        {isResubmit && task.reject_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Lý do từ chối
            </p>
            <p className="text-sm text-red-700 leading-relaxed">{task.reject_reason}</p>
          </div>
        )}

        {/* Info banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-100 rounded-2xl px-4 py-3.5 flex gap-3 items-start">
          <p className="text-xs text-blue-700 leading-relaxed pt-0.5">
            Video sẽ được <strong className="font-semibold text-blue-800">upload lên Google Drive ngay khi nộp</strong>.
            Nếu task bị từ chối, video sẽ bị xóa khỏi Drive và bạn cần upload lại khi nộp lại.
          </p>
        </div>

        {/* Video upload area */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-px h-3.5 bg-indigo-400 rounded-full" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Video kết quả</p>
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={handleFileChange} />

          {/* Idle — no file */}
          {!file && !uploading && !uploadedVideo && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full group relative overflow-hidden flex flex-col items-center justify-center gap-4 py-10 border-2 border-dashed border-gray-200 rounded-2xl hover:border-indigo-400 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-violet-50/0 group-hover:from-indigo-50/80 group-hover:to-violet-50/50 transition-all duration-300" />
              <div className="relative w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-indigo-100 flex items-center justify-center transition-all duration-300">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors duration-300" />
              </div>
              <div className="relative text-center space-y-1">
                <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">
                  Nhấn để chọn video
                </p>
                <p className="text-xs text-slate-400">MP4 &bull; Tối đa 2GB</p>
              </div>
            </button>
          )}

          {/* Uploading */}
          {uploading && file && (
            <div className="border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 rounded-2xl px-5 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-indigo-500 font-medium mt-0.5">Đang tải lên...</p>
                </div>
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {uploadPct < 100 ? 'Đang upload...' : 'Đang hoàn tất...'}
                  </p>
                  <p className="text-xs font-bold text-indigo-600">{uploadPct}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Done */}
          {uploadedVideo && !uploading && (
            <div className="border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{uploadedVideo.originalname}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{(uploadedVideo.size / 1024 / 1024).toFixed(1)} MB</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs font-semibold text-emerald-600">Đã lên Google Drive</span>
                  </div>
                </div>
                <button
                  onClick={handleRemoveVideo}
                  className="w-8 h-8 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all shrink-0"
                  title="Xoá và chọn lại"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Manual URL fallback */}
        <div className="border border-dashed border-gray-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowManual(v => !v)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-gray-50/80 transition-all"
          >
            <Link className="w-3.5 h-3.5" />
            <span>Nhập link thủ công thay thế</span>
            <ChevronDown className={cn('w-3.5 h-3.5 ml-auto transition-transform duration-200', showManual && 'rotate-180')} />
          </button>
          {showManual && (
            <div className="px-4 pb-4 pt-0 border-t border-dashed border-gray-200 bg-gray-50/50">
              <div className="pt-3">
                <DarkInput
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={manualUrl}
                  onChange={e => { setManualUrl(e.target.value); setUploadedVideo(null) }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </DarkModal>
  )
}
