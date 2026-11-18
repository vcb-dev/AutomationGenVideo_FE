'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Film, CheckCircle2, Loader2, Link, ChevronDown, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModal } from '@/components/task-auto/DarkModal'
import { DarkInput } from '@/components/task-auto/DarkInput'
import { ConfirmDialog } from '@/components/task-auto/ConfirmDialog'
import { apiClient } from '@/lib/api-client'
import { Task } from '@/types/task-auto'
import { abortTaskVideoUpload, deleteTaskPendingVideo, submitTask, updateTask } from '@/lib/api/task-auto'

interface Props {
  task: Task
  isResubmit?: boolean
  onClose: () => void
  onSuccess: () => void
}

type UploadedVideo = { url: string; filename: string; originalname: string; mimetype: string; size: number; storage: string }

const CHUNK_SIZE = 8 * 1024 * 1024 // 8 MB
const UPLOAD_CONCURRENCY = 4
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024 // 2 GB — khớp giới hạn BE ở initChunkUpload
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|avi|mkv|webm|flv|wmv|mpe?g|3gp)$/i

// Một vài file kéo từ Finder/Explorer không có MIME type → fallback theo đuôi file
function isVideoFile(f: File) {
  return f.type ? f.type.startsWith('video/') : VIDEO_EXT_RE.test(f.name)
}

function dragHasFiles(e: React.DragEvent) {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

function discardTaskVideo(taskId: string, qc: QueryClient) {
  return deleteTaskPendingVideo(taskId)
    .catch(() => {})
    .finally(() => {
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', taskId] })
    })
}

async function uploadVideoToServer(
  taskId: string,
  file: File,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<UploadedVideo> {
  const mime = file.type || 'video/mp4'

  // 1. Init — BE mở multipart upload trên R2, trả presigned URL cho từng part
  const { uploadId, partUrls, chunkSize } = await apiClient
    .post<{ uploadId: string; partUrls: string[]; chunkSize: number }>(
      `/task-auto/tasks/${taskId}/upload-video/init`,
      { filename: file.name, mimetype: mime, totalSize: file.size },
    )
    .then(r => r.data)

  const partSize = chunkSize || CHUNK_SIZE
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  let uploadedBytes = 0
  let nextPart = 0
  let failed = false

  const uploadPart = async (index: number) => {
    const start = index * partSize
    const blob = file.slice(start, Math.min(start + partSize, file.size))
    for (let attempt = 1; ; attempt++) {
      const ctrl = new AbortController()
      const abort = () => ctrl.abort()
      const timer = setTimeout(abort, 120_000)
      signal.addEventListener('abort', abort)
      try {
        const res = await fetch(partUrls[index], { method: 'PUT', body: blob, signal: ctrl.signal })
        if (res.ok) break
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`Upload video lỗi (${res.status}): ${text}`)
      } catch (err) {
        if (signal.aborted || attempt >= 5 || failed) throw err
        await sleep(1000 * attempt)
      } finally {
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
      }
    }
    uploadedBytes += blob.size
    onProgress(Math.round((uploadedBytes / file.size) * 90))
  }

  // 2. PUT các part thẳng lên R2 (mỗi part ghi đè được nên retry an toàn), chạy song song vài part
  try {
    if (signal.aborted) throw new Error('Đã huỷ upload')
    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, partUrls.length) }, async () => {
        while (!failed && !signal.aborted && nextPart < partUrls.length) {
          try {
            await uploadPart(nextPart++)
          } catch (err) {
            failed = true
            throw err
          }
        }
      }),
    )
    if (signal.aborted) throw new Error('Đã huỷ upload')
  } catch (err) {
    abortTaskVideoUpload(taskId, uploadId).catch(() => {})
    throw err
  }

  // 3. Finish — BE xác nhận R2 nhận đủ part, ghép file, đăng ký video tạm
  onProgress(95)
  const result = await apiClient
    .post<UploadedVideo>(
      `/task-auto/tasks/${taskId}/upload-video/finish`,
      { uploadId },
      { timeout: 120_000 },
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
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualUrl, setManualUrl]   = useState(task.result_url?.startsWith('/task-auto/') ? '' : (task.result_url || ''))
  const [dragActive, setDragActive] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const dragDepth = useRef(0)
  const uploadAbort = useRef<AbortController | null>(null)
  const unsubmittedUrl = useRef<string | null>(null)
  const submitting = useRef(false)

  const discardUnsubmittedVideo = () => {
    if (!unsubmittedUrl.current) return
    unsubmittedUrl.current = null
    void discardTaskVideo(task.id, qc)
  }

  useEffect(() => {
    const taskId = task.id
    return () => {
      uploadAbort.current?.abort()
      if (unsubmittedUrl.current && !submitting.current) {
        unsubmittedUrl.current = null
        void discardTaskVideo(taskId, qc)
      }
    }
  }, [task.id, qc])

  const startUpload = async (f: File) => {
    const previous = uploadedVideo
    const controller = new AbortController()
    uploadAbort.current = controller
    setFile(f)
    setUploadedVideo(null)
    setManualUrl('')
    setUploading(true)
    setUploadPct(0)
    try {
      const result = await uploadVideoToServer(task.id, f, pct => setUploadPct(pct), controller.signal)
      unsubmittedUrl.current = result.url
      if (controller.signal.aborted) {
        discardUnsubmittedVideo()
        return
      }
      setUploadedVideo(result)
      toast.success('Upload video thành công!')
    } catch (err: any) {
      if (controller.signal.aborted) return
      toast.error(err?.response?.data?.message || err?.message || 'Upload thất bại')
      setFile(null)
      setUploadedVideo(previous)
    } finally {
      if (uploadAbort.current === controller) uploadAbort.current = null
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const requestClose = () => {
    if (uploading || unsubmittedUrl.current) {
      setShowCloseConfirm(true)
      return
    }
    onClose()
  }

  const confirmClose = () => {
    setShowCloseConfirm(false)
    toast(uploading ? 'Đã huỷ upload video' : 'Đã xoá video chưa nộp')
    onClose()
  }

  // Cửa vào chung cho cả chọn file lẫn kéo-thả: chặn sai định dạng / quá 2GB trước khi gọi BE
  const acceptFile = (f: File | undefined, ignoredCount = 0) => {
    if (!f) return
    if (!isVideoFile(f)) {
      toast.error('Chỉ nhận file video (MP4, MOV, MKV...)')
      return
    }
    if (f.size > MAX_VIDEO_SIZE) {
      toast.error(`File ${(f.size / 1024 / 1024 / 1024).toFixed(2)}GB vượt giới hạn 2GB`)
      return
    }
    if (ignoredCount > 0) toast('Mỗi task chỉ nộp 1 video — đã lấy file đầu tiên')
    void startUpload(f)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại đúng file vừa bị từ chối
    acceptFile(f)
  }

  // ── Kéo-thả ───────────────────────────────────────────────────────────────
  // Đếm depth vì dragenter/dragleave bắn cả khi con trỏ đi qua các phần tử con
  const handleDragEnter = (e: React.DragEvent) => {
    if (!dragHasFiles(e)) return
    e.preventDefault()
    dragDepth.current += 1
    setDragActive(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!dragHasFiles(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = uploading ? 'none' : 'copy'
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!dragHasFiles(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (!dragHasFiles(e)) return
    e.preventDefault()
    dragDepth.current = 0
    setDragActive(false)
    if (uploading) {
      toast('Đang upload video khác, vui lòng đợi')
      return
    }
    const files = Array.from(e.dataTransfer.files ?? [])
    acceptFile(files[0], files.length - 1)
  }

  // Thả trượt ra ngoài vùng nhận → chặn trình duyệt mở thẳng file video và mất modal
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (Array.from(e.dataTransfer?.types ?? []).includes('Files')) e.preventDefault()
    }
    // Thả/huỷ ở bất kỳ đâu cũng phải tắt lớp phủ, tránh kẹt khi dragleave không bắn
    const reset = () => {
      dragDepth.current = 0
      setDragActive(false)
    }
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    window.addEventListener('drop', reset)
    window.addEventListener('dragend', reset)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
      window.removeEventListener('drop', reset)
      window.removeEventListener('dragend', reset)
    }
  }, [])

  const submitMut = useMutation({
    mutationFn: async () => {
      if (isResubmit) await updateTask(task.id, { status: 'IN_PROGRESS' })
      // Video is already registered on the server via upload/finish.
      // Pass result_url only for manual link; otherwise it's already set by the upload.
      await submitTask(task.id, manualUrl || undefined)
    },
    onMutate: () => { submitting.current = true },
    onSuccess: () => {
      if (manualUrl.trim()) discardUnsubmittedVideo()
      unsubmittedUrl.current = null
      toast.success(isResubmit ? 'Đã nộp lại task thành công!' : 'Đã nộp task thành công!')
      qc.invalidateQueries({ queryKey: ['task-auto', 'tasks'] })
      qc.invalidateQueries({ queryKey: ['task-auto', 'task', task.id] })
      onSuccess()
    },
    onError: (err: any) => {
      submitting.current = false
      toast.error(err?.response?.data?.message ?? 'Nộp task thất bại')
    },
  })

  const hasVideo = !!uploadedVideo || !!manualUrl.trim()
  const canSubmit = !uploading && !submitMut.isPending && hasVideo

  const handleRemoveVideo = () => {
    discardUnsubmittedVideo()
    setFile(null)
    setUploadedVideo(null)
    setUploadPct(0)
  }

  return (
    <>
    <DarkModal
      open
      onClose={requestClose}
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
              onClick={requestClose}
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
      <div
        data-testid="video-dropzone"
        className="relative space-y-5"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
            Video sẽ được <strong className="font-semibold text-blue-800">upload lên kho lưu trữ ngay khi nộp</strong>.
            Nếu task bị từ chối, video sẽ bị xóa khỏi kho và bạn cần upload lại khi nộp lại.
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
              className={cn(
                'w-full group relative overflow-hidden flex flex-col items-center justify-center gap-4 py-10 border-2 border-dashed rounded-2xl transition-all duration-300',
                dragActive ? 'border-indigo-400 bg-indigo-50/40' : 'border-gray-200 hover:border-indigo-400',
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-violet-50/0 group-hover:from-indigo-50/80 group-hover:to-violet-50/50 transition-all duration-300" />
              <div className="relative w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-indigo-100 flex items-center justify-center transition-all duration-300">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors duration-300" />
              </div>
              <div className="relative text-center space-y-1">
                <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">
                  Kéo thả video vào đây
                </p>
                <p className="text-xs text-slate-500">hoặc <span className="font-semibold text-indigo-600">nhấn để chọn</span> từ máy</p>
                <p className="text-xs text-slate-400 pt-0.5">MP4 &bull; Tối đa 2GB</p>
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
                    <span className="text-xs font-semibold text-emerald-600">Đã lên kho lưu trữ</span>
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
              <p className="text-xs text-slate-400 mt-2.5 pl-12">Kéo video khác vào đây để thay thế</p>
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
                  onChange={e => { setManualUrl(e.target.value); if (uploadedVideo) handleRemoveVideo() }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Lớp phủ khi đang kéo file — phủ cả thân modal nên không cần thả trúng ô nhỏ */}
        {dragActive && (
          <div
            style={{ marginTop: 0 }} // thoát margin của space-y-5 ở wrapper
            className={cn(
              'absolute -inset-3 z-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 pointer-events-none transition-colors',
              uploading ? 'border-amber-300 bg-amber-50/95' : 'border-indigo-400 bg-indigo-50/95',
            )}
          >
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm',
              uploading ? 'bg-amber-100' : 'bg-white',
            )}>
              {uploading
                ? <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                : <Upload className="w-6 h-6 text-indigo-600" />
              }
            </div>
            <div className="text-center space-y-1 px-6">
              <p className={cn('text-sm font-bold', uploading ? 'text-amber-700' : 'text-indigo-700')}>
                {uploading ? 'Đang tải video lên...' : 'Thả video để tải lên'}
              </p>
              <p className={cn('text-xs', uploading ? 'text-amber-600' : 'text-indigo-500')}>
                {uploading ? 'Chờ upload hiện tại xong rồi thả file mới' : 'MP4 • Tối đa 2GB • Chỉ nhận 1 video'}
              </p>
            </div>
          </div>
        )}
      </div>
    </DarkModal>
    <ConfirmDialog
      open={showCloseConfirm}
      title={uploading ? 'Huỷ upload video?' : 'Đóng mà không nộp?'}
      message={uploading
        ? 'Video đang tải lên sẽ bị huỷ và không được lưu lại.'
        : 'Video vừa tải lên chưa được nộp. Nếu đóng bây giờ, video sẽ bị xoá khỏi kho lưu trữ và bạn cần tải lên lại.'}
      confirmLabel={uploading ? 'Huỷ upload' : 'Đóng & xoá video'}
      cancelLabel={uploading ? 'Tiếp tục upload' : 'Ở lại'}
      danger
      onConfirm={confirmClose}
      onCancel={() => setShowCloseConfirm(false)}
    />
    </>
  )
}
