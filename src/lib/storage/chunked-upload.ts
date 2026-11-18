import { isAxiosError } from 'axios'

export interface UploadProgress {
  parts: number[]
  // BE đã ghép xong file: không gửi khúc nữa, gọi finish luôn.
  completed: boolean
}

export interface PartUploader {
  sendPart: (partNumber: number, chunk: Blob) => Promise<void>
  progress: () => Promise<UploadProgress>
}

export interface UploadInPartsOptions {
  onProgress?: (percent: number) => void
  concurrency?: number
  wait?: (ms: number) => Promise<void>
  waitOnline?: () => Promise<void>
}

export class PartUploadError extends Error {
  // serverMessage: câu tiếng Việt BE trả trong thân lỗi (nếu có).
  constructor(message: string, readonly status: number, readonly serverMessage?: string) {
    super(message)
  }
}

const NO_PROGRESS: UploadProgress = { parts: [], completed: false }

// Không đọc được tiến độ vì lỗi tạm (mạng, 5xx) thì coi như chưa có khúc nào; lỗi 4xx (token hết hạn) thì dừng luôn.
const readProgress = (uploader: PartUploader) =>
  uploader.progress().catch(err => {
    if (!isRetryable(err)) throw err
    return NO_PROGRESS
  })

export const RETRY_DELAYS_MS = [1_000, 3_000, 10_000, 30_000, 60_000, 120_000]

export function totalPartsOf(size: number, partSize: number): number {
  return Math.max(1, Math.ceil(size / partSize))
}

export function partRange(partNumber: number, size: number, partSize: number): { start: number; end: number } {
  const start = (partNumber - 1) * partSize
  return { start, end: Math.min(start + partSize, size) }
}

// 4xx (trừ 408/429) là lỗi không thử lại được: token hết hạn, khúc sai cỡ.
export function isRetryable(err: unknown): boolean {
  if (err instanceof PartUploadError) return err.status >= 500 || err.status === 408 || err.status === 429
  return true
}

const defaultWait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const defaultWaitOnline = () =>
  typeof navigator === 'undefined' || navigator.onLine
    ? Promise.resolve()
    : new Promise<void>(resolve => window.addEventListener('online', () => resolve(), { once: true }))

export async function uploadInParts(file: Blob, partSize: number, uploader: PartUploader, options: UploadInPartsOptions = {}): Promise<void> {
  const { onProgress, concurrency = 3, wait = defaultWait, waitOnline = defaultWaitOnline } = options
  const totalParts = totalPartsOf(file.size, partSize)
  const initial = await readProgress(uploader)
  if (initial.completed) {
    onProgress?.(90)
    return
  }
  const already = new Set(initial.parts)
  const queue = Array.from({ length: totalParts }, (_, i) => i + 1).filter(n => !already.has(n))
  let done = totalParts - queue.length
  const report = () => onProgress?.(Math.round((done / totalParts) * 90))
  report()

  const sendWithRetry = async (partNumber: number) => {
    const { start, end } = partRange(partNumber, file.size, partSize)
    const chunk = file.slice(start, end)
    for (let attempt = 0; ; attempt++) {
      try {
        await uploader.sendPart(partNumber, chunk)
        return
      } catch (err) {
        if (!isRetryable(err)) throw err
        await waitOnline()
        if (attempt >= RETRY_DELAYS_MS.length) {
          const stored = await uploader.progress().catch(() => NO_PROGRESS)
          if (stored.completed || stored.parts.includes(partNumber)) return
          throw err
        }
        await wait(RETRY_DELAYS_MS[attempt])
      }
    }
  }

  let failed: unknown = null
  const worker = async () => {
    while (!failed && queue.length) {
      const partNumber = queue.shift()!
      try {
        await sendWithRetry(partNumber)
        done++
        report()
      } catch (err) {
        failed = err
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
  if (failed) throw failed
}

async function serverMessageOf(res: Response): Promise<string | undefined> {
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null
  return typeof body?.message === 'string' && body.message ? body.message : undefined
}

// Gửi khúc thẳng domain BE (không qua rewrite /api 4,5MB): FormData, không cookie → không preflight.
export function createDirectPartUploader(partUploadUrl: string, fileName: string, timeoutMs = 120_000): PartUploader {
  return {
    sendPart: async (partNumber, chunk) => {
      const form = new FormData()
      form.append('chunk', chunk, fileName)
      const res = await fetch(`${partUploadUrl}/parts/${partNumber}`, { method: 'POST', body: form, signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) throw new PartUploadError(`Gửi khúc ${partNumber} lỗi (${res.status})`, res.status, await serverMessageOf(res))
    },
    progress: async () => {
      const res = await fetch(`${partUploadUrl}/parts`, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new PartUploadError(`Không đọc được tiến độ (${res.status})`, res.status, await serverMessageOf(res))
      const body = (await res.json()) as { uploadedParts?: number[]; completed?: boolean }
      return { parts: body.uploadedParts ?? [], completed: body.completed === true }
    },
  }
}

// finish có thể chạy lâu (ghép + cắt ảnh bìa): 409 = request khác đang ghép, hết giờ/mất mạng = gửi lại (BE chịu gọi lại).
export async function finishWithRetry<T>(call: () => Promise<T>, wait: (ms: number) => Promise<void> = defaultWait, attempts = 6): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await call()
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined
      const retry = status === 409 || (isAxiosError(err) && !err.response)
      if (!retry || i >= attempts) throw err
      await wait(5_000 * i)
    }
  }
}

export function uploadErrorMessage(err: unknown): string {
  if (err instanceof PartUploadError) {
    if (err.status === 403) return 'Phiên tải lên đã hết hạn, hãy chọn lại file'
    // 400 có câu của BE (vd. phiên đã kết thúc/bị huỷ) thì hiện đúng câu đó.
    if (err.status === 400 && err.serverMessage) return err.serverMessage
    if (err.status === 413 || err.status === 400) return 'File gửi lên bị lỗi, hãy chọn lại file'
    return 'Máy chủ đang bận, hãy thử lại sau ít phút'
  }
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { message?: unknown } | undefined)?.message
    if (typeof msg === 'string' && msg) return msg
    if (!err.response) return 'Mất kết nối mạng, hãy kiểm tra mạng rồi thử lại'
  }
  if (err instanceof TypeError) return 'Mất kết nối mạng, hãy kiểm tra mạng rồi thử lại'
  return 'Tải lên thất bại, hãy thử lại'
}
