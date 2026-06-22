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
import { attachTaskVideo, submitTask, updateTask } from '@/lib/api/task-auto'

interface Props {
  task: Task
  isResubmit?: boolean
  onClose: () => void
  onSuccess: () => void
}

const CHUNK_SIZE = 8 * 1024 * 1024 // 8 MB

async function uploadVideoInChunks(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ url: string; filename: string; originalname: string; mimetype: string; size: number; storage: string }> {
  // 1. Init — BE tạo Google Drive resumable session, trả về uploadUrl
  const { uploadId, uploadUrl, chunkSize } = await apiClient
    .post<{ uploadId: string; uploadUrl: string; chunkSize: number }>('/social/upload/chunk/init', {
      filename: file.name,
      mimetype: file.type || 'video/mp4',
      totalSize: file.size,
    })
    .then(r => r.data)

  const effectiveChunkSize = chunkSize || CHUNK_SIZE
  let offset = 0
  let driveFileId: string | undefined

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const syncStatus = async () => {
    const status = await apiClient
      .post<{ uploadedBytes: number; totalSize: number; completed: boolean; driveFileId?: string }>(
        '/social/upload/chunk/status', { uploadId },
      ).then(r => r.data)
    driveFileId = status.driveFileId || driveFileId
    offset = Math.min(status.uploadedBytes || 0, file.size)
    onProgress(Math.round((offset / file.size) * 90))
    return status
  }

  // 2. Gửi chunk trực tiếp đến Google Drive resumable uploadUrl
  while (offset < file.size) {
    const start = offset
    const end = Math.min(start + effectiveChunkSize, file.size) - 1
    const blob = file.slice(start, end + 1)
    let uploaded = false

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'video/mp4',
            'Content-Range': `bytes ${start}-${end}/${file.size}`,
          },
          body: blob,
          signal: AbortSignal.timeout(60_000),
        })

        if (res.status === 429) {
          const wait = parseInt(res.headers.get('Retry-After') ?? '5', 10)
          await sleep(Math.max(wait * 1000, 3000))
          attempt--
          continue
        }
        if (res.status === 200 || res.status === 201) {
          const data = await res.json().catch(() => ({}))
          driveFileId = (data as { id?: string }).id
          offset = file.size
          uploaded = true
          break
        }
        if (res.status === 308) {
          offset = end + 1
          uploaded = true
          break
        }
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`Drive upload failed (${res.status}): ${text}`)
      } catch (err) {
        if (attempt === 5) {
          const status = await syncStatus().catch(() => null)
          if (status?.completed) { driveFileId = status.driveFileId; offset = file.size; uploaded = true; break }
          if (offset > start) { uploaded = true; break }
          await apiClient.post('/social/upload/chunk/cancel', { uploadId }).catch(() => {})
          throw err
        }
        await sleep(1000 * attempt)
      }
    }
    if (!uploaded) throw new Error('Google Drive upload failed')
    onProgress(Math.round((offset / file.size) * 90))
  }

  if (!driveFileId) {
    const status = await syncStatus()
    driveFileId = status.driveFileId
  }
  if (!driveFileId) throw new Error('Không lấy được Drive file ID sau khi upload')

  // 3. Finish — BE verify Drive file, lưu metadata
  onProgress(95)
  const result = await apiClient
    .post<{ success: boolean; urls: Array<{ url: string; filename: string; originalname: string; mimetype: string; size: number; storage: string; drive_file_id?: string }> }>(
      '/social/upload/chunk/finish',
      { uploadId, driveFileId },
    )
    .then(r => r.data)

  onProgress(100)
  const uploaded2 = result.urls[0]
  return {
    url: uploaded2.url,
    filename: uploaded2.filename,
    originalname: uploaded2.originalname ?? file.name,
    mimetype: uploaded2.mimetype ?? file.type,
    size: uploaded2.size ?? file.size,
    storage: uploaded2.storage ?? 'google_drive',
  }
}

export function SubmitModal({ task, isResubmit = false, onClose, onSuccess }: Props) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile]           = useState<File | null>(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadedVideo, setUploadedVideo] = useState<{ url: string; filename: string; originalname: string; mimetype: string; size: number; storage: string } | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualUrl, setManualUrl]   = useState(task.result_url || '')

  const resultUrl = uploadedVideo?.url || manualUrl

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setUploadedVideo(null)
    setUploading(true)
    setUploadPct(0)
    try {
      const result = await uploadVideoInChunks(f, pct => setUploadPct(pct))
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

      // Gắn video vào task trước khi submit
      if (uploadedVideo) {
        await attachTaskVideo(task.id, uploadedVideo)
      }

      await submitTask(task.id, resultUrl || undefined)
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
                  {uploadPct < 100 ? `Đang upload... ${uploadPct}%` : 'Đang hoàn tất...'}
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
                <span className="text-emerald-600 font-medium">Sẵn sàng xem trên trình duyệt</span>
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
