import { AxiosError, AxiosHeaders } from 'axios'
import {
  PartUploadError,
  createDirectPartUploader,
  finishWithRetry,
  partRange,
  totalPartsOf,
  uploadErrorMessage,
  uploadInParts,
  type PartUploader,
} from '../chunked-upload'

const noWait = { wait: async () => undefined, waitOnline: async () => undefined }
const blob = (size: number) => new Blob([new Uint8Array(size)])

function axiosError(status?: number, data?: unknown): AxiosError {
  const response = status
    ? { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } }
    : undefined
  return new AxiosError('x', status ? 'ERR_BAD_RESPONSE' : 'ECONNABORTED', undefined, undefined, response as never)
}

function uploader(over: Partial<PartUploader> = {}) {
  const sent: Array<[number, number]> = []
  const u: PartUploader & { sent: typeof sent } = {
    sent,
    sendPart: jest.fn(async (n: number, chunk: Blob) => { sent.push([n, chunk.size]) }),
    uploadedParts: jest.fn(async () => [] as number[]),
    ...over,
  }
  return u
}

describe('totalPartsOf / partRange', () => {
  it('20 byte khúc 8 → 3 khúc, khúc cuối 4 byte', () => {
    expect(totalPartsOf(20, 8)).toBe(3)
    expect(partRange(3, 20, 8)).toEqual({ start: 16, end: 20 })
  })
})

describe('uploadInParts', () => {
  it('gửi đủ 3 khúc, mỗi khúc một lần, đúng cỡ; tiến độ cuối 90', async () => {
    const u = uploader()
    const progress: number[] = []
    await uploadInParts(blob(20), 8, u, { ...noWait, onProgress: p => progress.push(p) })
    expect([...u.sent].sort((a, b) => a[0] - b[0])).toEqual([[1, 8], [2, 8], [3, 4]])
    expect(progress[progress.length - 1]).toBe(90)
  })

  it('concurrency 2 → tối đa 2 khúc gửi cùng lúc', async () => {
    let inFlight = 0
    let peak = 0
    const u = uploader({
      sendPart: jest.fn(async () => {
        inFlight++
        peak = Math.max(peak, inFlight)
        await new Promise(r => setTimeout(r, 5))
        inFlight--
      }),
    })
    await uploadInParts(blob(40), 8, u, { ...noWait, concurrency: 2 })
    expect(u.sendPart).toHaveBeenCalledTimes(5)
    expect(peak).toBe(2)
  })

  it('BE đã có khúc 1 và 3 → chỉ gửi khúc 2, tiến độ đầu 60', async () => {
    const u = uploader({ uploadedParts: jest.fn(async () => [1, 3]) })
    const progress: number[] = []
    await uploadInParts(blob(20), 8, u, { ...noWait, onProgress: p => progress.push(p) })
    expect(u.sent).toEqual([[2, 8]])
    expect(progress[0]).toBe(60)
  })

  it('lỗi mạng 2 lần rồi được → gửi 3 lần, chờ 1s rồi 3s, có chờ online', async () => {
    let calls = 0
    const wait = jest.fn(async () => undefined)
    const waitOnline = jest.fn(async () => undefined)
    const u = uploader({
      sendPart: jest.fn(async () => {
        calls++
        if (calls <= 2) throw new TypeError('Failed to fetch')
      }),
    })
    await uploadInParts(blob(5), 8, u, { wait, waitOnline })
    expect(u.sendPart).toHaveBeenCalledTimes(3)
    expect(wait.mock.calls.map(c => (c as unknown[])[0])).toEqual([1000, 3000])
    expect(waitOnline).toHaveBeenCalled()
  })

  it('403 → dừng ngay, không thử lại', async () => {
    const u = uploader({ sendPart: jest.fn(async () => { throw new PartUploadError('x', 403) }) })
    await expect(uploadInParts(blob(5), 8, u, noWait)).rejects.toMatchObject({ status: 403 })
    expect(u.sendPart).toHaveBeenCalledTimes(1)
  })

  it('hết 7 lượt nhưng BE đã có khúc → đi tiếp; BE chưa có → ném lỗi', async () => {
    const failing = () => jest.fn(async () => { throw new PartUploadError('x', 502) })
    const ok = uploader({
      sendPart: failing(),
      uploadedParts: jest.fn().mockResolvedValueOnce([]).mockResolvedValue([1]),
    })
    await expect(uploadInParts(blob(5), 8, ok, noWait)).resolves.toBeUndefined()
    expect(ok.sendPart).toHaveBeenCalledTimes(7)

    const bad = uploader({ sendPart: failing() })
    await expect(uploadInParts(blob(5), 8, bad, noWait)).rejects.toMatchObject({ status: 502 })
  })
})

describe('createDirectPartUploader', () => {
  const realFetch = global.fetch
  const realTimeout = AbortSignal.timeout
  beforeAll(() => {
    // jsdom có thể thiếu AbortSignal.timeout.
    if (!AbortSignal.timeout) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal
  })
  afterEach(() => { global.fetch = realFetch })
  afterAll(() => { (AbortSignal as unknown as { timeout: unknown }).timeout = realTimeout })

  it('POST FormData tới /parts/<n>, không cookie, không header tuỳ biến', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200 }) as Response)
    global.fetch = fetchMock as unknown as typeof fetch
    await createDirectPartUploader('https://be/api/storage/uploads/tok', 'v.mp4').sendPart(2, blob(3))
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://be/api/storage/uploads/tok/parts/2')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.credentials).toBeUndefined()
    expect(init.headers).toBeUndefined()
  })

  it('BE trả 403 → PartUploadError status 403', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 403 }) as Response) as unknown as typeof fetch
    await expect(createDirectPartUploader('https://be/u/tok', 'v.mp4').sendPart(1, blob(1))).rejects.toMatchObject({ status: 403 })
  })
})

describe('finishWithRetry', () => {
  const wait = async () => undefined

  it('409 rồi thành công → gọi 2 lần', async () => {
    const call = jest.fn().mockRejectedValueOnce(axiosError(409)).mockResolvedValue('ok')
    await expect(finishWithRetry(call, wait)).resolves.toBe('ok')
    expect(call).toHaveBeenCalledTimes(2)
  })
  it('400 → ném ngay', async () => {
    const call = jest.fn().mockRejectedValue(axiosError(400))
    await expect(finishWithRetry(call, wait)).rejects.toBeDefined()
    expect(call).toHaveBeenCalledTimes(1)
  })
  it('hết giờ (không có response) → thử lại', async () => {
    const call = jest.fn().mockRejectedValueOnce(axiosError()).mockResolvedValue('ok')
    await expect(finishWithRetry(call, wait)).resolves.toBe('ok')
  })
})

describe('uploadErrorMessage', () => {
  it('403 → phiên hết hạn', () => expect(uploadErrorMessage(new PartUploadError('x', 403))).toMatch(/hết hạn/))
  it('câu tiếng Việt từ BE → trả nguyên', () =>
    expect(uploadErrorMessage(axiosError(400, { message: 'Chỉ nhận video MP4, MOV, M4V hoặc WEBM' }))).toBe('Chỉ nhận video MP4, MOV, M4V hoặc WEBM'))
  it('TypeError (mất mạng) → Mất kết nối mạng', () => expect(uploadErrorMessage(new TypeError('Failed to fetch'))).toMatch(/Mất kết nối mạng/))
  it('lỗi lạ → câu chung, không lộ tên biến', () => {
    const msg = uploadErrorMessage(new Error('Missing R2_BUCKET'))
    expect(msg).toBe('Tải lên thất bại, hãy thử lại')
    expect(msg).not.toMatch(/R2_/)
  })
})
